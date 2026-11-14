import { createServerFn } from "@tanstack/react-start";
import type {
  CreatePeyCodiQrInput,
  CreatePeyPaymentLinkInput,
  PeyCodiQrResponse,
  PeyPaymentLinkResponse,
  PeyPaymentStatusResponse,
} from "./pey.server";
import type {
  PeyWebhookEventType,
  ProcessedPeyWebhookEvent,
} from "./webhook.server";

export type {
  CreatePeyCodiQrInput,
  CreatePeyPaymentLinkInput,
  PeyCodiQrResponse,
  PeyPaymentLinkResponse,
  PeyPaymentStatusResponse,
  PeyWebhookEventType,
  ProcessedPeyWebhookEvent,
};

export const createPeyCodiQrServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePeyCodiQrInput) => data)
  .handler(async ({ data }): Promise<PeyCodiQrResponse> => {
    const { createPeyCodiQrOnServer } = await import("./pey.server");
    return createPeyCodiQrOnServer(data);
  });

export const createPeyPaymentLinkServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePeyPaymentLinkInput) => data)
  .handler(async ({ data }): Promise<PeyPaymentLinkResponse> => {
    const { createPeyPaymentLinkOnServer } = await import("./pey.server");
    return createPeyPaymentLinkOnServer(data);
  });

export const confirmPeyPaymentServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      paymentLinkId?: string | undefined;
      codiQrId?: string | undefined;
      amountMxn: number;
      numRef: string;
      apiKeyOverride?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }): Promise<PeyPaymentStatusResponse> => {
    const { getPeyPaymentStatusOnServer } = await import("./pey.server");
    return getPeyPaymentStatusOnServer(data);
  });

export const listPeyWebhookEventsServerFn = createServerFn({ method: "GET" })
  .inputValidator((data: { pieceId?: string | undefined }) => data)
  .handler(async ({ data }): Promise<ProcessedPeyWebhookEvent[]> => {
    const { listRecentPeyWebhookEvents } = await import("./webhook.server");
    return listRecentPeyWebhookEvents(data.pieceId);
  });

export const dispatchSignedPeyWebhookServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      eventType?: PeyWebhookEventType | undefined;
      pieceId: string;
      title: string;
      artisan: string;
      amountMxn: number;
      codiQrId?: string | undefined;
      numRef?: string | undefined;
      concept?: string | undefined;
      trackingKey?: string | undefined;
      transactionId?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }): Promise<ProcessedPeyWebhookEvent> => {
    const { processPeyWebhookEvent, signPeyWebhookPayload } = await import(
      "./webhook.server"
    );
    const nowSec = Math.floor(Date.now() / 1000);
    const numRef = (data.numRef || data.pieceId.replace(/\D/g, "") || "0512").slice(
      0,
      7,
    );
    const dateCompact = new Date(nowSec * 1000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    const trackingKey =
      data.trackingKey || `${dateCompact}4001400000${numRef.padStart(7, "0")}`;
    const transactionId =
      data.transactionId || `01M3QR8H0RH0XBCKYYD2${numRef.padStart(6, "0")}`;
    const webhookId = `msg_${Date.now().toString(36)}_${numRef}`;
    const webhookTimestamp = String(nowSec);

    const payloadObj = {
      type: data.eventType || "codi.qr.payment_received",
      amount: data.amountMxn,
      apiKeyId: "01M3QMMR6X9CBVDY1SF3G8QWNW",
      bankAccountId: "01JBAVWE4NS5TGXHWGMX3KH23Q",
      codiQrId: data.codiQrId || `35a13c${numRef.padStart(4, "0")}`,
      concept: data.concept || `Tlamatik ${data.pieceId} ${data.title}`.slice(0, 40),
      datePaid: nowSec,
      numRef,
      transactionId,
      metadata: {
        clabe: "012650001234567895",
        bankCode: 40012,
        accountType: 40,
        description: `Tlamatik ${data.pieceId}`,
        trackingKey,
        externalMetadata: {
          pieceId: data.pieceId,
          orderId: data.pieceId,
          artisan: data.artisan,
        },
      },
    };

    const rawBody = JSON.stringify(payloadObj);
    const testSecret =
      process.env["PEY_WEBHOOK_SECRET"]?.trim() ||
      "whsec_dGxhbWF0aWtfcGV5X3dlYmhvb2tfc2VjcmV0XzIwMjY=";
    const webhookSignature = signPeyWebhookPayload(
      rawBody,
      webhookId,
      webhookTimestamp,
      testSecret,
    );

    return processPeyWebhookEvent({
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
      secretOverride: testSecret,
    });
  });

export interface SpeiSettlementItem {
  artisan: string;
  piece: string;
  amount: string;
  date: string;
  clave: string;
  codiQrId?: string | undefined;
  peyTransactionId?: string | undefined;
  stellarTxHash?: string | undefined;
  webhookEventType?: string | undefined;
}

const LOCAL_SETTLEMENTS_KEY = "tlamatik_pey_spei_settlements_v1";

export function readSpeiSettlements(
  defaultList: SpeiSettlementItem[],
): SpeiSettlementItem[] {
  if (typeof window === "undefined") return defaultList;
  try {
    const raw = window.localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
    if (!raw) return defaultList;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultList;
    const custom = parsed as SpeiSettlementItem[];
    const seen = new Set(custom.map((c) => c.clave));
    return [...custom, ...defaultList.filter((d) => !seen.has(d.clave))];
  } catch {
    return defaultList;
  }
}

export function saveSpeiSettlement(item: SpeiSettlementItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readSpeiSettlements([]).filter(
      (x) => x.clave !== item.clave,
    );
    window.localStorage.setItem(
      LOCAL_SETTLEMENTS_KEY,
      JSON.stringify([item, ...existing]),
    );
  } catch {
    // Ignore storage quota errors
  }
}
