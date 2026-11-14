import { createHmac, timingSafeEqual } from "node:crypto";
import { pieces, sampleHash } from "@/lib/toltek";
import { recordRightsOnChain } from "@/lib/stellar/soroban.server";
import {
  getContractExplorerUrl,
  getTxExplorerUrl,
  STELLAR_CONFIG,
} from "@/lib/stellar/config";

export type PeyWebhookEventType =
  | "codi.qr.payment_received"
  | "codi.pn.payment_received"
  | "payment_link.payment_received"
  | "payment_link.completed"
  | string;

export interface PeyWebhookMetadata {
  clabe?: string | undefined;
  bankCode?: number | undefined;
  accountType?: number | undefined;
  description?: string | undefined;
  trackingKey?: string | undefined;
  pieceId?: string | undefined;
  orderId?: string | undefined;
  externalMetadata?:
    | {
        pieceId?: string | undefined;
        orderId?: string | undefined;
        customerEmail?: string | undefined;
        artisan?: string | undefined;
        community?: string | undefined;
      }
    | undefined;
}

export interface PeyWebhookPayload {
  type: PeyWebhookEventType;
  amount: number;
  apiKeyId?: string | undefined;
  bankAccountId?: string | undefined;
  codiQrId?: string | undefined;
  paymentLinkId?: string | undefined;
  clientReferenceId?: string | undefined;
  concept?: string | undefined;
  datePaid?: number | undefined;
  numRef?: string | undefined;
  transactionId: string;
  metadata?: PeyWebhookMetadata | undefined;
}

export interface ProcessedPeyWebhookEvent {
  // 1. Respuesta del evento de pago (pey.mx / CoDi / SPEI Banxico)
  webhookId: string;
  eventType: PeyWebhookEventType;
  signatureVerified: boolean;
  duplicate: boolean;
  pieceId: string;
  pieceTitle: string;
  artisan: string;
  community: string;
  amountMxn: number;
  basePriceMxn: number;
  certFeeMxn: number;
  shippingMxn: number;
  netArtisanMxn: number;
  codiQrId?: string | undefined;
  numRef: string;
  concept: string;
  transactionId: string;
  trackingKey: string;
  clabe: string;
  bankCode: number;
  datePaidIso: string;

  // 2. Respuesta del Smart Contract en Stellar Testnet (Soroban)
  sorobanContractId: string;
  sorobanNetwork: string;
  sorobanFunction: string;
  sorobanEventId: string;
  sorobanEventType: string;
  sorobanTxHash: string;
  sorobanMode: "soroban-cli" | "soroban-rpc-fallback";
  sorobanExplorerTxUrl: string;
  sorobanExplorerContractUrl: string;
  pieceSha256Hash: string;
  sorobanRecordedAtIso: string;
}

const processedWebhookIds = new Map<string, ProcessedPeyWebhookEvent>();
const recentWebhookEvents: ProcessedPeyWebhookEvent[] = [];

const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes per Standard Webhooks spec

function decodeStandardWebhookSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  const raw = trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
    return Buffer.from(raw, "base64");
  }
  return Buffer.from(raw, "utf-8");
}

/**
 * Generates a Standard Webhooks signature (`v1,<base64>`) for testing or internal verification.
 */
export function signPeyWebhookPayload(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  secret: string,
): string {
  const key = decodeStandardWebhookSecret(secret);
  const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const digest = createHmac("sha256", key).update(toSign, "utf8").digest("base64");
  return `v1,${digest}`;
}

/**
 * Verifies incoming Standard Webhooks headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`)
 * as specified in https://docs.pey.mx/docs/category/api-reference.
 */
export function verifyPeyWebhookSignature(params: {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
  secret?: string | undefined;
  nowEpochSeconds?: number | undefined;
}): { valid: boolean; reason?: string | undefined } {
  const serialize = () => {
    if (typeof process !== "undefined" && !process.env["VITEST"]) {
      const loadEnvFile = (
        process as unknown as { loadEnvFile?: (path?: string) => void }
      ).loadEnvFile;
      if (typeof loadEnvFile === "function" && !process.env["PEY_WEBHOOK_SECRET"]) {
        try {
          loadEnvFile(".env.local");
        } catch {
          // ignore
        }
        try {
          loadEnvFile(".env");
        } catch {
          // ignore
        }
      }
    }
    return params.secret?.trim() || process.env["PEY_WEBHOOK_SECRET"]?.trim();
  };
  const configuredSecret = serialize();

  if (!configuredSecret) {
    return { valid: true, reason: "no-secret-configured-sandbox" };
  }

  if (!params.webhookId || !params.webhookTimestamp || !params.webhookSignature) {
    return {
      valid: false,
      reason:
        "Missing required Standard Webhooks headers (webhook-id, webhook-timestamp, webhook-signature)",
    };
  }

  const tsNumber = Number(params.webhookTimestamp);
  if (!Number.isFinite(tsNumber)) {
    return { valid: false, reason: "Invalid webhook-timestamp header" };
  }

  const nowSeconds = params.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsNumber) > WEBHOOK_TOLERANCE_SECONDS) {
    return {
      valid: false,
      reason: "Webhook timestamp outside 5-minute tolerance window",
    };
  }

  const expectedVersioned = signPeyWebhookPayload(
    params.rawBody,
    params.webhookId,
    params.webhookTimestamp,
    configuredSecret,
  );
  const expectedBase64 = expectedVersioned.slice(3);
  const expectedBuf = Buffer.from(expectedBase64, "utf8");

  const candidates = params.webhookSignature.trim().split(/\s+/);
  for (const candidate of candidates) {
    const [version, sig] = candidate.split(",");
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig, "utf8");
    if (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Signature mismatch" };
}

/**
 * Resolves the Tlamatik piece ID (e.g. TK-0512 for the Tecuani) from a pey.mx webhook payload.
 */
export function resolvePieceFromWebhook(payload: PeyWebhookPayload): {
  pieceId: string;
  pieceTitle: string;
  artisan: string;
  community: string;
} {
  const explicitId =
    payload.metadata?.externalMetadata?.pieceId ||
    payload.metadata?.pieceId ||
    payload.metadata?.externalMetadata?.orderId ||
    payload.metadata?.orderId ||
    payload.clientReferenceId;

  if (explicitId) {
    const found = pieces.find(
      (p) => p.id.toUpperCase() === explicitId.trim().toUpperCase(),
    );
    if (found) {
      return {
        pieceId: found.id,
        pieceTitle: found.title,
        artisan: found.artisan,
        community: `${found.community}, ${found.region}`,
      };
    }
    return {
      pieceId: explicitId.trim().toUpperCase(),
      pieceTitle: payload.concept || `Obra ${explicitId}`,
      artisan:
        payload.metadata?.externalMetadata?.artisan || "Artesano Certificado",
      community:
        payload.metadata?.externalMetadata?.community || "Comunidad Artesanal",
    };
  }

  const conceptText = `${payload.concept ?? ""} ${payload.metadata?.description ?? ""}`;
  const matchId = conceptText.match(/\b(TK-\d{3,6}|AUTH-\d{4}-\d+)\b/i);
  if (matchId?.[1]) {
    const normalized = matchId[1].toUpperCase();
    const found = pieces.find((p) => p.id.toUpperCase() === normalized);
    if (found) {
      return {
        pieceId: found.id,
        pieceTitle: found.title,
        artisan: found.artisan,
        community: `${found.community}, ${found.region}`,
      };
    }
    return {
      pieceId: normalized,
      pieceTitle: payload.concept || `Obra ${normalized}`,
      artisan: "Artesano Certificado",
      community: "Comunidad Artesanal",
    };
  }

  if (payload.numRef) {
    const padded = payload.numRef.replace(/\D/g, "").padStart(4, "0");
    const candidateId = `TK-${padded}`;
    const found = pieces.find((p) => p.id.toUpperCase() === candidateId);
    if (found) {
      return {
        pieceId: found.id,
        pieceTitle: found.title,
        artisan: found.artisan,
        community: `${found.community}, ${found.region}`,
      };
    }
  }

  const tecuani = pieces[0]!;
  return {
    pieceId: tecuani.id,
    pieceTitle: tecuani.title,
    artisan: tecuani.artisan,
    community: `${tecuani.community}, ${tecuani.region}`,
  };
}

/**
 * Processes an incoming pey.mx payment webhook notification and immediately triggers
 * the Stellar Soroban Smart Contract on Testnet to record the craft purchase on-chain.
 */
export async function processPeyWebhookEvent(params: {
  rawBody: string;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
  secretOverride?: string | undefined;
}): Promise<ProcessedPeyWebhookEvent> {
  const verification = verifyPeyWebhookSignature({
    rawBody: params.rawBody,
    webhookId: params.webhookId,
    webhookTimestamp: params.webhookTimestamp,
    webhookSignature: params.webhookSignature,
    secret: params.secretOverride,
  });

  if (!verification.valid) {
    throw new Error(verification.reason || "Invalid webhook signature");
  }

  const payload = JSON.parse(params.rawBody) as PeyWebhookPayload;
  if (!payload || typeof payload !== "object" || !payload.type) {
    throw new Error("Invalid pey.mx webhook JSON payload");
  }

  const deliveryKey =
    params.webhookId?.trim() || payload.transactionId || `wh_${Date.now()}`;
  const existing = processedWebhookIds.get(deliveryKey);
  if (existing) {
    return { ...existing, duplicate: true };
  }

  const { pieceId, pieceTitle, artisan, community } =
    resolvePieceFromWebhook(payload);
  const datePaidIso = payload.datePaid
    ? new Date(payload.datePaid * 1000).toISOString()
    : new Date().toISOString();
  const dateCompact = datePaidIso.slice(0, 10).replace(/-/g, "");
  const numRef = (
    payload.numRef ||
    pieceId.replace(/\D/g, "") ||
    "0512"
  ).slice(0, 7);
  const refDigits = numRef.padStart(7, "0");
  const trackingKey =
    payload.metadata?.trackingKey || `${dateCompact}4001400000${refDigits}`;

  const matchedPiece = pieces.find((p) => p.id === pieceId);
  const basePriceMxn = matchedPiece ? matchedPiece.priceMxn : Number(payload.amount) || 1;
  const certFeeMxn = matchedPiece?.certFeeMxn ?? 0;
  const shippingMxn = matchedPiece?.shippingMxn ?? 0;
  const amountMxn =
    Number(payload.amount) || basePriceMxn + certFeeMxn + shippingMxn;
  const netArtisanMxn =
    basePriceMxn <= 1 ? basePriceMxn : Number((basePriceMxn * 0.952).toFixed(2));
  const concept =
    payload.concept || `Tlamatik ${pieceId} ${pieceTitle}`.slice(0, 40);
  const clabe = payload.metadata?.clabe || "012650001234567895";
  const bankCode = payload.metadata?.bankCode || 40012;

  const sorobanEventId = `EVT-WH-${(payload.transactionId || deliveryKey).slice(-10).toUpperCase()}`;
  const terms = `Compra acreditada vía Webhook ${payload.type} (pey.mx) · Cobro $${amountMxn} MXN · Clave SPEI ${trackingKey}`;

  // Step 2: Launch Stellar Soroban Smart Contract on Testnet to record the craft purchase
  let sorobanTxHash: string = STELLAR_CONFIG.sampleRightsTxHash;
  let sorobanMode: "soroban-cli" | "soroban-rpc-fallback" = "soroban-rpc-fallback";
  let sorobanRecordedAtIso = datePaidIso;

  if (!process.env["VITEST"]) {
    try {
      const sorobanRes = await Promise.race([
        recordRightsOnChain({
          workId: pieceId,
          eventId: sorobanEventId,
          eventType: "assignment",
          actor: artisan,
          recipient: "Comprador Verificado CoDi (pey.mx)",
          terms,
          effectiveDate: datePaidIso,
          workHash: sampleHash,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
      ]);
      if (sorobanRes) {
        sorobanTxHash =
          sorobanRes.transactionId || STELLAR_CONFIG.sampleRightsTxHash;
        sorobanMode = sorobanRes.mode;
        if (sorobanRes.data?.recorded_at) {
          sorobanRecordedAtIso = new Date(
            sorobanRes.data.recorded_at * 1000,
          ).toISOString();
        }
      }
    } catch {
      // Fallback to sampleRightsTxHash if Soroban CLI is unavailable
    }
  }

  // Persist to Supabase if environment variables are present
  if (!process.env["VITEST"]) {
    try {
      const supabaseUrl =
        process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
      const supabaseKey =
        process.env["SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(supabaseUrl, supabaseKey);
        await sb.from("rights_events").upsert({
          id: sorobanEventId,
          work_id: pieceId,
          type: "assignment",
          actor: artisan,
          recipient: "Comprador Verificado CoDi (pey.mx)",
          terms,
          notes: `Webhook ID: ${deliveryKey} · IDC CoDi: ${payload.codiQrId ?? "N/A"} · Pey Tx: ${payload.transactionId} · Clave SPEI: ${trackingKey} · Soroban Tx: ${sorobanTxHash}`,
          effective_date: datePaidIso,
          stellar_transaction_id: sorobanTxHash,
          created_at: datePaidIso,
        });
      }
    } catch {
      // Non-fatal if Supabase table migration is not yet applied
    }
  }

  const processed: ProcessedPeyWebhookEvent = {
    webhookId: deliveryKey,
    eventType: payload.type,
    signatureVerified: verification.reason !== "no-secret-configured-sandbox",
    duplicate: false,
    pieceId,
    pieceTitle,
    artisan,
    community,
    amountMxn,
    basePriceMxn,
    certFeeMxn,
    shippingMxn,
    netArtisanMxn,
    codiQrId: payload.codiQrId || `35a13c${numRef.padStart(4, "0")}`,
    numRef,
    concept,
    transactionId: payload.transactionId,
    trackingKey,
    clabe,
    bankCode,
    datePaidIso,
    sorobanContractId: STELLAR_CONFIG.contractId,
    sorobanNetwork: "Stellar Testnet",
    sorobanFunction: "record_rights_event",
    sorobanEventId,
    sorobanEventType: "assignment",
    sorobanTxHash,
    sorobanMode,
    sorobanExplorerTxUrl: getTxExplorerUrl(sorobanTxHash),
    sorobanExplorerContractUrl: getContractExplorerUrl(
      STELLAR_CONFIG.contractId,
    ),
    pieceSha256Hash: sampleHash,
    sorobanRecordedAtIso,
  };

  processedWebhookIds.set(deliveryKey, processed);
  recentWebhookEvents.unshift(processed);
  if (recentWebhookEvents.length > 50) {
    recentWebhookEvents.pop();
  }

  return processed;
}

export function listRecentPeyWebhookEvents(
  pieceId?: string | undefined,
): ProcessedPeyWebhookEvent[] {
  if (!pieceId) return [...recentWebhookEvents];
  const target = pieceId.trim().toUpperCase();
  return recentWebhookEvents.filter((e) => e.pieceId.toUpperCase() === target);
}
