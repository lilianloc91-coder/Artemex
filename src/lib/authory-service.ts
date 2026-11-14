import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { images, pieces, USDC_RATE, type Piece } from "./toltek";
import {
  getContractExplorerUrl,
  getTxExplorerUrl,
  STELLAR_CONFIG,
} from "./stellar/config";

export type WorkType =
  | "photography"
  | "illustration"
  | "document"
  | "music"
  | "code"
  | "video"
  | "other";

export type WorkStatus = "draft" | "processing" | "registered" | "verified";

export interface AuthoryWork {
  id: string;
  promoterId?: string | undefined;
  promoterName?: string | undefined;
  title: string;
  type: WorkType;
  description: string;
  author: string;
  artisan: string;
  community: string;
  region: Piece["region"];
  technique: Piece["technique"];
  materials: string;
  dimensions?: string | undefined;
  priceMxn: number;
  hash: string;
  stellarTransactionId?: string | undefined;
  network: "testnet";
  status: WorkStatus;
  filename?: string | undefined;
  fileSize?: string | undefined;
  fileMimeType?: string | undefined;
  sourceUrl?: string | undefined;
  fileUrl?: string | undefined;
  gallery?: string[] | undefined;
  notes?: string | undefined;
  createdAt: string;
  registeredAt: string;
}

export type RightsEventType =
  | "registration"
  | "evidence"
  | "license"
  | "assignment"
  | "transfer";

export interface AuthoryRightsEvent {
  id: string;
  workId: string;
  promoterId?: string | undefined;
  type: RightsEventType;
  actor: string;
  recipient?: string | undefined;
  effectiveDate: string;
  terms?: string | undefined;
  notes?: string | undefined;
  stellarTransactionId?: string | undefined;
  createdAt: string;
}

// Optional legacy catalog tables are not part of the managed generated schema.
// Keep their existing best-effort calls typed independently; local fallback remains authoritative.
type DbWorkRow = {
  id: string; promoter_id: string | null; title: string; type: WorkType;
  description: string; author: string; artisan: string; community: string;
  region: string; technique: string; materials: string; dimensions: string;
  price_mxn: number; hash: string; stellar_transaction_id: string | null;
  network: string; status: WorkStatus; filename: string | null; file_size: string | null;
  file_mime_type: string | null; source_url: string | null; file_url: string | null;
  notes: string | null; created_at: string; registered_at: string;
};
type DbRightsEventRow = {
  id: string; work_id: string; promoter_id: string | null; type: RightsEventType;
  actor: string; recipient: string | null; effective_date: string; terms: string | null;
  notes: string | null; stellar_transaction_id: string | null; created_at: string;
};
type LegacyTable<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type LegacyCatalogDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & { Tables: Database['public']['Tables'] & {
    works: LegacyTable<DbWorkRow>; rights_events: LegacyTable<DbRightsEventRow>;
  } };
};
const legacyCatalog = supabase as unknown as SupabaseClient<LegacyCatalogDatabase>;

const LOCAL_WORKS_KEY = "tlamatik_authory_works";
const LOCAL_EVENTS_KEY = "tlamatik_authory_events";
const LOCAL_SPEI_SETTLEMENTS_KEY = "tlamatik_spei_settlements";

const SEED_DRAFT_WORKS: AuthoryWork[] = [
  {
    id: "TK-0419",
    promoterName: "Alain Bonilla",
    title: "Vasija Bruñida de Alta Temperatura",
    type: "photography",
    description:
      "Vasija ceremonial bruñida con piedra de río y engobes minerales de la ribera de Pátzcuaro. Pendiente de validación final antes de su sellado en Soroban.",
    author: "Juana Morales",
    artisan: "Juana Morales",
    community: "Tzintzuntzan",
    region: "Michoacán",
    technique: "Cerámica",
    materials: "Barro rojo local, engobe mineral y bruñido con piedra de ágata",
    dimensions: "26cm x 22cm x 22cm",
    priceMxn: 2950,
    hash: "9f4b8c2a1d7e6035a2f4b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3",
    network: "testnet",
    status: "draft",
    fileUrl: images.barroNegro,
    createdAt: "2026-11-09T16:20:00.000Z",
    registeredAt: "2026-11-09T16:20:00.000Z",
  },
];

/** Returns true only once the work has a confirmed Stellar/Soroban transaction and is no longer editable. */
export function isWorkAnchoredOnBlockchain(
  work: Pick<AuthoryWork, "status" | "stellarTransactionId">,
): boolean {
  return (
    Boolean(work.stellarTransactionId?.trim()) &&
    work.status !== "draft" &&
    work.status !== "processing"
  );
}

const VALID_REGIONS: ReadonlySet<Piece["region"]> = new Set([
  "Oaxaca",
  "Chiapas",
  "Jalisco",
  "Michoacán",
  "Guerrero",
  "Puebla",
]);

const VALID_TECHNIQUES: ReadonlySet<Piece["technique"]> = new Set([
  "Textil",
  "Cerámica",
  "Talla en Madera",
  "Filigrana",
  "Laca",
]);

function normalizeRegion(region?: string | null): Piece["region"] {
  if (region && VALID_REGIONS.has(region as Piece["region"])) {
    return region as Piece["region"];
  }
  return "Oaxaca";
}

function normalizeTechnique(technique?: string | null): Piece["technique"] {
  if (technique && VALID_TECHNIQUES.has(technique as Piece["technique"])) {
    return technique as Piece["technique"];
  }
  return "Talla en Madera";
}

function defaultImageForTechnique(technique: Piece["technique"]): string {
  switch (technique) {
    case "Textil":
      return images.huipil;
    case "Cerámica":
      return images.barroNegro;
    case "Filigrana":
      return images.cobre;
    case "Laca":
      return images.olinala;
    case "Talla en Madera":
    default:
      return images.alebrije;
  }
}

export function mapDbRowToWork(row: DbWorkRow): AuthoryWork {
  const region = normalizeRegion(row.region);
  const technique = normalizeTechnique(row.technique);
  return {
    id: row.id,
    promoterId: row.promoter_id ?? undefined,
    title: row.title,
    type: (row.type as WorkType) || "other",
    description: row.description,
    author: row.author,
    artisan: row.artisan || row.author,
    community: row.community || region,
    region,
    technique,
    materials: row.materials,
    dimensions: row.dimensions || undefined,
    priceMxn: Number(row.price_mxn) || 0,
    hash: row.hash,
    stellarTransactionId: row.stellar_transaction_id ?? undefined,
    network: "testnet",
    status: (row.status as WorkStatus) || "registered",
    filename: row.filename ?? undefined,
    fileSize: row.file_size ?? undefined,
    fileMimeType: row.file_mime_type ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    fileUrl: row.file_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    registeredAt: row.registered_at,
  };
}

export function mapDbRowToRightsEvent(row: DbRightsEventRow): AuthoryRightsEvent {
  return {
    id: row.id,
    workId: row.work_id,
    promoterId: row.promoter_id ?? undefined,
    type: row.type as RightsEventType,
    actor: row.actor,
    recipient: row.recipient ?? undefined,
    effectiveDate: row.effective_date,
    terms: row.terms ?? undefined,
    notes: row.notes ?? undefined,
    stellarTransactionId: row.stellar_transaction_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function workToPiece(work: AuthoryWork): Piece {
  const priceMxn = work.priceMxn > 0 ? work.priceMxn : 3500;
  const primaryImage = work.fileUrl || defaultImageForTechnique(work.technique);
  const gallery =
    work.gallery && work.gallery.length > 0
      ? work.gallery
      : [primaryImage];
  return {
    id: work.id,
    title: work.title,
    artisan: work.artisan || work.author,
    community: work.community || work.region,
    region: work.region,
    technique: work.technique,
    priceMxn,
    image: primaryImage,
    gallery,
    featured: true,
    badge: `${work.region} · Soroban`,
    category: work.technique,
    location: `${work.community || work.region}, México`,
    techniqueDetail: work.description || work.materials || work.technique,
    dimensions: work.dimensions || "Pieza artesanal única",
    priceUsd: Math.round(priceMxn / USDC_RATE),
    certFeeMxn: Math.round(priceMxn * 0.048),
    shippingMxn: 180,
    status: "available",
    stellarTxHash: work.stellarTransactionId || STELLAR_CONFIG.sampleRegisterTxHash,
    ledgerStatus: "Verified on Soroban Testnet",
    story:
      work.description ||
      `Obra registrada por ${work.author} con materiales autóctonos (${work.materials || work.technique}).`,
  };
}

export function pieceToWork(piece: Piece): AuthoryWork {
  return {
    id: piece.id,
    promoterName: "Alain Bonilla · Cooperativa Guelaguetza",
    title: piece.title,
    type: "other",
    description: piece.story || piece.techniqueDetail || piece.technique,
    author: piece.artisan,
    artisan: piece.artisan,
    community: piece.community,
    region: piece.region,
    technique: piece.technique,
    materials: piece.techniqueDetail || piece.technique,
    dimensions: piece.dimensions,
    priceMxn: piece.priceMxn,
    hash: "c0ffee112233445566778899aabbccddeeff00112233445566778899aabbccdd",
    stellarTransactionId:
      piece.stellarTxHash || STELLAR_CONFIG.sampleRegisterTxHash,
    network: "testnet",
    status: "verified",
    fileUrl: piece.image,
    gallery: piece.gallery || [piece.image],
    createdAt: "2026-10-17T17:42:09.000Z",
    registeredAt: "2026-10-17T17:42:09.000Z",
  };
}

function readLocalWorks(): AuthoryWork[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_WORKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AuthoryWork[]) : [];
  } catch {
    return [];
  }
}

function writeLocalWork(work: AuthoryWork): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalWorks().filter((w) => w.id !== work.id);
    window.localStorage.setItem(LOCAL_WORKS_KEY, JSON.stringify([work, ...existing]));
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalEvents(): AuthoryRightsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AuthoryRightsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEvent(event: AuthoryRightsEvent): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalEvents().filter((e) => e.id !== event.id);
    window.localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify([...existing, event]));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildInitialWorkEvents(work: AuthoryWork): AuthoryRightsEvent[] {
  const regTime = work.registeredAt || new Date().toISOString();
  return [
    {
      id: `EVT-REG-${work.id}`,
      workId: work.id,
      promoterId: work.promoterId,
      type: "registration",
      actor: work.author,
      effectiveDate: work.createdAt || regTime,
      terms: "Registro inicial de autoría artesanal y procedencia comunitaria",
      notes: work.materials ? `Materiales: ${work.materials}` : undefined,
      stellarTransactionId: work.stellarTransactionId,
      createdAt: regTime,
    },
    {
      id: `EVT-EVI-${work.id}`,
      workId: work.id,
      promoterId: work.promoterId,
      type: "evidence",
      actor: "Tlamatik Protocol (Soroban)",
      effectiveDate: regTime,
      terms: `Huella SHA-256 anclada en contrato Soroban ${STELLAR_CONFIG.contractId.slice(0, 8)}…`,
      notes: `SHA-256: ${work.hash}`,
      stellarTransactionId: work.stellarTransactionId,
      createdAt: regTime,
    },
  ];
}

export async function uploadWorkFileToSupabase(
  file: File,
  workId: string,
): Promise<string | null> {
  try {
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${workId}/${sanitized}`;
    const { error } = await supabase.storage
      .from("authory-files")
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      return null;
    }

    const { data } = supabase.storage.from("authory-files").getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function saveWorkAndInitialEvents(work: AuthoryWork): Promise<{
  savedToSupabase: boolean;
  events: AuthoryRightsEvent[];
}> {
  writeLocalWork(work);
  const initialEvents = buildInitialWorkEvents(work);
  for (const evt of initialEvents) {
    writeLocalEvent(evt);
  }

  try {
    const { error: workError } = await legacyCatalog.from("works").upsert({
      id: work.id,
      promoter_id: work.promoterId ?? null,
      title: work.title,
      type: work.type,
      description: work.description,
      author: work.author,
      artisan: work.artisan,
      community: work.community,
      region: work.region,
      technique: work.technique,
      materials: work.materials,
      dimensions: work.dimensions ?? "",
      price_mxn: work.priceMxn,
      hash: work.hash.toLowerCase(),
      stellar_transaction_id: work.stellarTransactionId ?? null,
      network: work.network,
      status: work.status,
      filename: work.filename ?? null,
      file_size: work.fileSize ?? null,
      file_mime_type: work.fileMimeType ?? null,
      source_url: work.sourceUrl ?? null,
      file_url: work.fileUrl ?? null,
      notes: work.notes ?? null,
      created_at: work.createdAt,
      registered_at: work.registeredAt,
    });

    if (workError) {
      return { savedToSupabase: false, events: initialEvents };
    }

    for (const evt of initialEvents) {
      await legacyCatalog.from("rights_events").upsert({
        id: evt.id,
        work_id: evt.workId,
        promoter_id: evt.promoterId ?? null,
        type: evt.type,
        actor: evt.actor,
        recipient: evt.recipient ?? null,
        terms: evt.terms ?? null,
        notes: evt.notes ?? null,
        effective_date: evt.effectiveDate,
        stellar_transaction_id: evt.stellarTransactionId ?? null,
        created_at: evt.createdAt,
      });
    }

    return { savedToSupabase: true, events: initialEvents };
  } catch {
    return { savedToSupabase: false, events: initialEvents };
  }
}

export async function recordRightsEvent(
  event: AuthoryRightsEvent,
): Promise<boolean> {
  writeLocalEvent(event);
  try {
    const { error } = await legacyCatalog.from("rights_events").upsert({
      id: event.id,
      work_id: event.workId,
      promoter_id: event.promoterId ?? null,
      type: event.type,
      actor: event.actor,
      recipient: event.recipient ?? null,
      terms: event.terms ?? null,
      notes: event.notes ?? null,
      effective_date: event.effectiveDate,
      stellar_transaction_id: event.stellarTransactionId ?? null,
      created_at: event.createdAt,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function findWorkByIdOrHash(query: string): Promise<AuthoryWork | null> {
  const cleaned = query.trim();
  if (!cleaned) return null;

  const isHash = /^[a-fA-F0-9]{64}$/.test(cleaned);

  try {
    const req = isHash
      ? legacyCatalog.from("works").select("*").eq("hash", cleaned.toLowerCase()).maybeSingle()
      : legacyCatalog.from("works").select("*").ilike("id", cleaned).maybeSingle();
    const { data, error } = await req;
    if (!error && data) {
      return mapDbRowToWork(data);
    }
  } catch {
    // Fallback to local / seed catalog
  }

  const localMatch = readLocalWorks().find((w) =>
    isHash
      ? w.hash.toLowerCase() === cleaned.toLowerCase() ||
        (w.notes?.toLowerCase().includes(cleaned.toLowerCase()) ?? false)
      : w.id.toUpperCase() === cleaned.toUpperCase(),
  );
  if (localMatch) return localMatch;

  if (!isHash) {
    const seedMatch = pieces.find((p) => p.id.toUpperCase() === cleaned.toUpperCase());
    if (seedMatch) return pieceToWork(seedMatch);
    const seedDraftMatch = SEED_DRAFT_WORKS.find(
      (w) => w.id.toUpperCase() === cleaned.toUpperCase(),
    );
    if (seedDraftMatch) return seedDraftMatch;
    if (cleaned.toUpperCase() === "AUTH-2026-000101") {
      return {
        ...pieceToWork(pieces[0]!),
        id: "AUTH-2026-000101",
        author: "Alain Bonilla",
        hash: "c0ffee112233445566778899aabbccddeeff00112233445566778899aabbccdd",
        stellarTransactionId: STELLAR_CONFIG.sampleRegisterTxHash,
      };
    }
  } else if (
    cleaned.toLowerCase() ===
    "c0ffee112233445566778899aabbccddeeff00112233445566778899aabbccdd"
  ) {
    return pieceToWork(pieces[0]!);
  }

  return null;
}

export type WorkSaleStatus = "draft" | "available" | "licensed" | "sold";

export interface RegisteredWorkSummary {
  work: AuthoryWork;
  anchoredOnChain: boolean;
  saleStatus: WorkSaleStatus;
  eventsCount: number;
  settlementTrackingKey?: string | undefined;
  image: string;
}

/** Saves an unanchored cultural work draft so it can still be edited prior to blockchain anchoring. */
export async function saveWorkDraft(work: AuthoryWork): Promise<AuthoryWork> {
  const draft: AuthoryWork = {
    ...work,
    status: "draft",
    stellarTransactionId: undefined,
  };
  writeLocalWork(draft);
  try {
    await legacyCatalog.from("works").upsert({
      id: draft.id,
      promoter_id: draft.promoterId ?? null,
      title: draft.title,
      type: draft.type,
      description: draft.description,
      author: draft.author,
      artisan: draft.artisan,
      community: draft.community,
      region: draft.region,
      technique: draft.technique,
      materials: draft.materials,
      dimensions: draft.dimensions ?? "",
      price_mxn: draft.priceMxn,
      hash: draft.hash.toLowerCase(),
      stellar_transaction_id: null,
      network: draft.network,
      status: "draft",
      filename: draft.filename ?? null,
      file_size: draft.fileSize ?? null,
      file_mime_type: draft.fileMimeType ?? null,
      source_url: draft.sourceUrl ?? null,
      file_url: draft.fileUrl ?? null,
      notes: draft.notes ?? null,
      created_at: draft.createdAt,
      registered_at: draft.registeredAt,
    });
  } catch {
    // Keep local draft when remote insert is unavailable
  }
  return draft;
}

/** Updates metadata of an unanchored cultural work; throws if already anchored on blockchain. */
export async function updateUnanchoredWork(
  workId: string,
  updates: {
    title: string;
    artisan: string;
    promoterName?: string;
    community: string;
    region: Piece["region"];
    technique: Piece["technique"];
    materials: string;
    dimensions: string;
    priceMxn: number;
    description: string;
    hash?: string;
    gallery?: string[];
  },
): Promise<AuthoryWork> {
  const existing = await findWorkByIdOrHash(workId);
  if (!existing) {
    throw new Error("No se encontró la obra solicitada.");
  }
  if (isWorkAnchoredOnBlockchain(existing)) {
    throw new Error(
      "Esta obra ya fue anclada en la blockchain y su información es inmutable.",
    );
  }

  const updated: AuthoryWork = {
    ...existing,
    title: updates.title.trim(),
    artisan: updates.artisan.trim(),
    author: updates.artisan.trim(),
    promoterName: updates.promoterName?.trim() || existing.promoterName,
    community: updates.community.trim(),
    region: updates.region,
    technique: updates.technique,
    materials: updates.materials.trim(),
    dimensions: updates.dimensions.trim(),
    priceMxn: Number(updates.priceMxn) || existing.priceMxn,
    description: updates.description.trim(),
    hash: updates.hash || existing.hash,
    gallery: updates.gallery || existing.gallery,
    fileUrl: updates.gallery?.[0] || existing.fileUrl,
  };

  writeLocalWork(updated);
  try {
    await legacyCatalog
      .from("works")
      .update({
        title: updated.title,
        artisan: updated.artisan,
        author: updated.author,
        community: updated.community,
        region: updated.region,
        technique: updated.technique,
        materials: updated.materials,
        dimensions: updated.dimensions ?? "",
        price_mxn: updated.priceMxn,
        description: updated.description,
        hash: updated.hash.toLowerCase(),
      })
      .eq("id", updated.id);
  } catch {
    // Keep local update if Supabase is unreachable
  }

  return updated;
}

function readSettlementPieceKeys(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") return map;
  try {
    const raw = window.localStorage.getItem(LOCAL_SPEI_SETTLEMENTS_KEY);
    if (!raw) return map;
    const list = JSON.parse(raw) as Array<{ piece?: string; clave?: string }>;
    if (!Array.isArray(list)) return map;
    for (const item of list) {
      const pieceId = item.piece?.split("·")[0]?.trim().toUpperCase();
      if (pieceId && item.clave) map.set(pieceId, item.clave);
    }
  } catch {
    // ignore malformed storage
  }
  return map;
}

/** Lists all platform works (drafts, anchored works, and seed catalog) with lifecycle statuses. */
export async function listAllRegisteredWorks(): Promise<RegisteredWorkSummary[]> {
  const mergedMap = new Map<string, AuthoryWork>();

  for (const local of readLocalWorks()) {
    mergedMap.set(local.id.toUpperCase(), local);
  }

  try {
    const { data, error } = await legacyCatalog
      .from("works")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      for (const row of data) {
        const mapped = mapDbRowToWork(row);
        if (!mergedMap.has(mapped.id.toUpperCase())) {
          mergedMap.set(mapped.id.toUpperCase(), mapped);
        }
      }
    }
  } catch {
    // Fallback to local & seed works
  }

  for (const draft of SEED_DRAFT_WORKS) {
    if (!mergedMap.has(draft.id.toUpperCase())) {
      mergedMap.set(draft.id.toUpperCase(), draft);
    }
  }

  for (const seedPiece of pieces) {
    if (!mergedMap.has(seedPiece.id.toUpperCase())) {
      mergedMap.set(seedPiece.id.toUpperCase(), pieceToWork(seedPiece));
    }
  }

  const allEvents = readLocalEvents();
  const settlements = readSettlementPieceKeys();

  const summaries: RegisteredWorkSummary[] = Array.from(mergedMap.values()).map(
    (work) => {
      const anchoredOnChain = isWorkAnchoredOnBlockchain(work);
      const workEvents = allEvents.filter(
        (evt) => evt.workId.toUpperCase() === work.id.toUpperCase(),
      );
      const settlementKey = settlements.get(work.id.toUpperCase());
      const seedMatch = pieces.find(
        (p) => p.id.toUpperCase() === work.id.toUpperCase(),
      );

      let saleStatus: WorkSaleStatus = "available";
      if (!anchoredOnChain) {
        saleStatus = "draft";
      } else if (
        seedMatch?.status === "sold" ||
        Boolean(settlementKey) ||
        workEvents.some((e) => e.type === "transfer")
      ) {
        saleStatus = "sold";
      } else if (workEvents.some((e) => e.type === "license")) {
        saleStatus = "licensed";
      }

      return {
        work,
        anchoredOnChain,
        saleStatus,
        eventsCount: anchoredOnChain ? Math.max(2, workEvents.length) : workEvents.length,
        settlementTrackingKey: settlementKey,
        image:
          work.fileUrl ||
          seedMatch?.image ||
          defaultImageForTechnique(work.technique),
      };
    },
  );

  return summaries.sort((a, b) => {
    if (a.anchoredOnChain !== b.anchoredOnChain) {
      return a.anchoredOnChain ? 1 : -1;
    }
    return b.work.createdAt.localeCompare(a.work.createdAt);
  });
}

export async function listAllCatalogPieces(): Promise<Piece[]> {
  const customWorks: AuthoryWork[] = [];
  for (const local of readLocalWorks()) {
    if (isWorkAnchoredOnBlockchain(local)) {
      customWorks.push(local);
    }
  }

  try {
    const { data, error } = await legacyCatalog
      .from("works")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) {
      for (const row of data) {
        const mapped = mapDbRowToWork(row);
        if (
          isWorkAnchoredOnBlockchain(mapped) &&
          !customWorks.some((w) => w.id === mapped.id)
        ) {
          customWorks.push(mapped);
        }
      }
    }
  } catch {
    // Fallback to local works
  }

  const customPieces = customWorks.map(workToPiece);
  const existingIds = new Set(customPieces.map((p) => p.id.toUpperCase()));
  return [...customPieces, ...pieces.filter((p) => !existingIds.has(p.id.toUpperCase()))];
}

export async function getWorkRightsEvents(
  workId: string,
): Promise<AuthoryRightsEvent[]> {
  const combined: AuthoryRightsEvent[] = [];

  try {
    const { data, error } = await legacyCatalog
      .from("rights_events")
      .select("*")
      .eq("work_id", workId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      combined.push(...data.map(mapDbRowToRightsEvent));
    }
  } catch {
    // Fallback to local events
  }

  for (const local of readLocalEvents()) {
    if (
      local.workId.toUpperCase() === workId.toUpperCase() &&
      !combined.some((e) => e.id === local.id)
    ) {
      combined.push(local);
    }
  }

  if (combined.length === 0) {
    const work = await findWorkByIdOrHash(workId);
    if (work) {
      const initial = buildInitialWorkEvents(work);
      if (workId.toUpperCase() === "AUTH-2026-000101" || workId.toUpperCase() === "TK-0512") {
        initial.push({
          id: "EVT-2026-000101",
          workId: work.id,
          type: "license",
          actor: work.author,
          recipient: "Editorial Global / Exhibición Cultural",
          effectiveDate: "2026-10-17T18:00:00.000Z",
          terms: "Licencia de Expresión Cultural Tradicional y Co-creación Artesanal con 12% de regalías comunitarias en Soroban",
          stellarTransactionId: STELLAR_CONFIG.sampleRightsTxHash,
          createdAt: "2026-10-17T18:00:00.000Z",
        });
      }
      return initial;
    }
  }

  return combined.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function escapeHtml(str: string | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generatePassportCertificateHtml(
  work: AuthoryWork,
  verificationUrlOrEvents?: string | AuthoryRightsEvent[] | undefined,
): string {
  const defaultVerifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verificar?id=${encodeURIComponent(work.id)}`
      : `https://ancestral-craft-passport.lovable.app/verificar?id=${encodeURIComponent(work.id)}`;
  const verificationUrl =
    typeof verificationUrlOrEvents === "string"
      ? verificationUrlOrEvents
      : defaultVerifyUrl;

  const safeId = escapeHtml(work.id);
  const safeTitle = escapeHtml(work.title);
  const safeArtisan = escapeHtml(work.artisan || work.author);
  const safeCommunity = escapeHtml(work.community || work.region);
  const safeTechnique = escapeHtml(work.technique);
  const safeDescription = escapeHtml(work.description);
  const safeHash = escapeHtml(work.hash);
  const safeTx = escapeHtml(
    work.stellarTransactionId || STELLAR_CONFIG.sampleRegisterTxHash,
  );
  const safeContract = escapeHtml(STELLAR_CONFIG.contractId);
  const safeDate = escapeHtml(work.registeredAt);
  const safeVerifyUrl = /^https?:\/\//i.test(verificationUrl.trim())
    ? escapeHtml(verificationUrl.trim())
    : "";
  const txExplorerUrl = escapeHtml(getTxExplorerUrl(work.stellarTransactionId));
  const contractExplorerUrl = escapeHtml(getContractExplorerUrl());

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pasaporte Cultural Tlamatik — ${safeId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      background: #daeaf1;
      color: #1d3e5e;
      padding: 36px 20px;
      line-height: 1.5;
    }
    .cert {
      max-width: 820px;
      margin: 0 auto;
      background: #f6fafc;
      border: 2px solid #1d3e5e;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 18px 40px -18px rgba(29, 62, 94, 0.35);
    }
    .banner {
      background: #1d3e5e;
      color: #f6fafc;
      padding: 28px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .brand { font-family: Georgia, serif; font-size: 26px; font-weight: 700; }
    .badge {
      background: #c8a25a;
      color: #1d3e5e;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 6px 12px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .content { padding: 32px 36px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
    }
    .cell {
      background: #ffffff;
      border: 1px solid #b2cfd6;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .full { grid-column: span 2; }
    .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #325e7e;
      margin-bottom: 4px;
    }
    .val { font-size: 14px; font-weight: 600; word-break: break-all; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #b2cfd6;
      font-size: 12px;
      color: #325e7e;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }
    a { color: #1d3e5e; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="banner">
      <div>
        <div class="brand">Tlamatik</div>
        <div style="font-size: 12px; opacity: 0.8;">Pasaporte Cultural Físico-Digital · Stellar Soroban Testnet</div>
      </div>
      <div class="badge">Certificado en Stellar</div>
    </div>
    <div class="content">
      <h1 style="font-family: Georgia, serif; font-size: 24px;">${safeTitle}</h1>
      <p style="font-size: 14px; color: #325e7e; margin-top: 4px;">Pasaporte ${safeId} · Registrado el ${safeDate}</p>
      <div class="grid">
        <div class="cell">
          <div class="label">Maestro Artesano / Autor</div>
          <div class="val">${safeArtisan}</div>
        </div>
        <div class="cell">
          <div class="label">Comunidad y Técnica</div>
          <div class="val">${safeCommunity} · ${safeTechnique}</div>
        </div>
        <div class="cell full">
          <div class="label">Memoria y Descripción de la Obra</div>
          <div class="val">${safeDescription}</div>
        </div>
        <div class="cell full">
          <div class="label">Huella Criptográfica SHA-256</div>
          <div class="val mono">${safeHash}</div>
        </div>
        <div class="cell full">
          <div class="label">Smart Contract Soroban (Tlamatik Registry)</div>
          <div class="val mono"><a href="${contractExplorerUrl}" target="_blank" rel="noopener noreferrer">${safeContract}</a></div>
        </div>
        <div class="cell full">
          <div class="label">Transacción en Stellar Testnet</div>
          <div class="val mono"><a href="${txExplorerUrl}" target="_blank" rel="noopener noreferrer">${safeTx}</a></div>
        </div>
        ${
          safeVerifyUrl
            ? `<div class="cell full">
          <div class="label">URL de Verificación Pública</div>
          <div class="val mono"><a href="${safeVerifyUrl}">${safeVerifyUrl}</a></div>
        </div>`
            : ""
        }
      </div>
      <div class="footer">
        <span>Tlamatik · Memoria viva del patrimonio cultural</span>
        <span>Imprimible / Guardable como PDF</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadPassportCertificate(
  work: AuthoryWork,
  verificationUrlOrEvents?: string | AuthoryRightsEvent[] | undefined,
): void {
  if (typeof window === "undefined") return;
  const html = generatePassportCertificateHtml(work, verificationUrlOrEvents);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `Pasaporte_Tlamatik_${work.id}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  }, 100);
}
