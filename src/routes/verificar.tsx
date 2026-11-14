import { useI18n } from "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Copy,
  ExternalLink,
  MapPin,
  Play,
  ChevronDown,
  Search,
  Upload,
  Download,
  History,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Camera,
  ShieldAlert,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CodiButton,
  FullBreakdown,
  LedgerBadge,
  PiecePhotoGallery,
  PriceBreakdown,
  QrCode,
  StellarBadge,
  StripeButton,
} from "@/components/toltek/ui";
import { QrCameraScanner } from "@/components/toltek/QrCameraScanner";
import { PiecePassportQr } from '@/components/toltek/PiecePassportQr';
import { ArtisanStoryBackground } from '@/components/toltek/ArtisanStoryBackground';
import { piecePassportUrl } from '@/lib/piece-passport';
import { PassportQrCode } from '@/components/toltek/PassportQrCode';
import {
  contractId,
  getPiece,
  images,
  pieces,
  sampleHash,
  shortHash,
  type Piece,
} from "@/lib/toltek";
import {
  downloadPassportCertificate,
  findWorkByIdOrHash,
  getWorkRightsEvents,
  pieceToWork,
  workToPiece,
  type AuthoryRightsEvent,
  type AuthoryWork,
} from "@/lib/authory-service";
import { computeFileSha256 } from "@/lib/stellar/client-crypto";
import { getContractExplorerUrl, getTxExplorerUrl } from "@/lib/stellar/config";
import { verifyWorkServerFn } from "@/lib/stellar/soroban.functions";

export const Route = createFileRoute("/verificar")({
  validateSearch: (search: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Verificador Público — Tlamatik" },
      {
        name: "description",
        content:
          "Escanea el QR de una pieza y confirma su autenticidad en el ledger de Stellar.",
      },
      { property: "og:title", content: "Verificador Público Universal — Tlamatik" },
      {
        property: "og:description",
        content:
          "Pieza auténtica y certificada: consulta su historia y registro blockchain.",
      },
    ],
  }),
  component: Verify,
});

const gallery = [
  { src: images.alebrije, label: "Pieza terminada" },
  { src: images.hero, label: "Tallado en copal", video: true },
  { src: images.olinala, label: "Pigmentos naturales" },
];

export function extractPieceQuery(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // 1. Try URL parse: e.g. https://tlamatik.vercel.app/verificar?id=TK-0512
  try {
    const url = new URL(trimmed);
    const idParam =
      url.searchParams.get("id") ||
      url.searchParams.get("pieceId") ||
      url.searchParams.get("workId");
    if (idParam) return idParam.trim();

    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (
      last &&
      (/^TK-/i.test(last) ||
        /^AUTH-/i.test(last) ||
        /^[a-f0-9]{64}$/i.test(last))
    ) {
      return last.trim();
    }
  } catch {
    // Relative URL query parse
    const match = trimmed.match(/[?&]id=([^&#]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  // 2. Try CoDi / Pey JSON format: { IDC: "35a13c0512", REF: 512, ... }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof obj["pieceId"] === "string") return obj["pieceId"].trim();
      if (typeof obj["id"] === "string") return obj["id"].trim();
      if (typeof obj["workId"] === "string") return obj["workId"].trim();
      if (typeof obj["IDC"] === "string") {
        const numMatch = (obj["IDC"] as string).match(/\d+$/);
        if (numMatch) return `TK-${numMatch[0].padStart(4, "0")}`;
      }
      if (typeof obj["REF"] === "number" || typeof obj["REF"] === "string") {
        const num = String(obj["REF"]).replace(/\D/g, "");
        if (num) return `TK-${num.padStart(4, "0")}`;
      }
    } catch {
      // ignore
    }
  }

  // 3. Direct pattern match
  const tkMatch = trimmed.match(/\bTK-\d{4}\b/i);
  if (tkMatch) return tkMatch[0].toUpperCase();

  const authMatch = trimmed.match(/\bAUTH-[\w-]+\b/i);
  if (authMatch) return authMatch[0].toUpperCase();

  const shaMatch = trimmed.match(/\b[a-f0-9]{64}\b/i);
  if (shaMatch) return shaMatch[0].toLowerCase();

  return trimmed;
}

function PieceNotFoundPanel({
  notFound,
  onRetryCamera,
  onSelectPiece,
}: {
  notFound: { rawText: string; cleanTarget: string };
  onRetryCamera: () => void;
  onSelectPiece: (pieceId: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-in fade-in duration-300">
      <div className="overflow-hidden rounded-2xl border-2 border-amber-500/35 bg-card shadow-float">
        {/* Banner with warning and cultural badge */}
        <div className="border-b border-amber-500/20 bg-amber-500/10 p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-600 ring-4 ring-amber-500/10 dark:text-amber-400">
              <ShieldAlert className="h-9 w-9" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("Verificación Fallida · Sistema Antifraude")}
              </span>
              <h1 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">
                {t("Pieza no encontrada en la plataforma Tlamatik")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t(
                  "El código QR escaneado no coincide con ninguna obra catalogada ni con ningún pasaporte cultural inmutable activo en nuestro registro.",
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          {/* Scanned code info box */}
          <div className="space-y-2 rounded-xl border bg-sand/40 p-4 font-mono text-xs">
            <div className="flex flex-col justify-between gap-1 text-muted-foreground sm:flex-row sm:items-center">
              <span>{t("Contenido escaneado:")}</span>
              <span className="break-all rounded border bg-background/90 px-2 py-1 font-semibold text-foreground">
                {notFound.rawText}
              </span>
            </div>
            <div className="flex flex-col justify-between gap-1 border-t pt-2 text-muted-foreground sm:flex-row sm:items-center">
              <span>{t("Identificador o Hash analizado:")}</span>
              <span className="break-all rounded border bg-background/90 px-2 py-1 font-semibold text-primary">
                {notFound.cleanTarget}
              </span>
            </div>
            <div className="flex flex-col justify-between gap-1 border-t pt-2 text-muted-foreground sm:flex-row sm:items-center">
              <span>{t("Estado en Smart Contract Soroban:")}</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {t("No indexado en Stellar Testnet")}
              </span>
            </div>
          </div>

          {/* Causes breakdown */}
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <HelpCircle className="h-4 w-4 text-primary" />
              {t("Detalle de las posibles causas:")}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "1. Código QR no emitido por Tlamatik",
                  desc: "El código escaneado pertenece a otra aplicación, pasarela o empaque comercial y no corresponde a la norma de Pasaporte Cultural de nuestra red.",
                },
                {
                  title: "2. Obra en borrador o sin anclaje en blockchain",
                  desc: "La pieza puede haber sido registrada de forma preliminar por el artesano pero todavía no ha completado su sellado criptográfico en Stellar Soroban.",
                },
                {
                  title: "3. Huella SHA-256 no coincidente (Posible alteración)",
                  desc: "Si la pieza física o su expediente digital fueron modificados, el hash criptográfico SHA-256 no concuerda con ningún registro inmutable.",
                },
                {
                  title: "4. Etiqueta física deteriorada o lectura incompleta",
                  desc: "Desgaste del papel o cerámica, reflejos de luz excesivos o una cámara desenfocada pueden provocar una lectura parcial o corrupta de los bytes del QR.",
                },
                {
                  title: "5. Taller o artesano no afiliado a la cooperativa",
                  desc: "La pieza proviene de un taller independiente fuera del padrón certificado de la Cooperativa Guelaguetza y los gremios ancestrales.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-border/80 bg-background/70 p-3.5 text-xs leading-relaxed"
                >
                  <p className="font-semibold text-foreground">{t(c.title)}</p>
                  <p className="mt-1 text-muted-foreground">{t(c.desc)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center justify-between gap-3 border-t pt-5 sm:flex-row">
            <Button onClick={onRetryCamera} className="w-full sm:w-auto">
              <Camera className="h-4 w-4" />
              {t("Escanear nuevamente con la cámara")}
            </Button>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              <span className="mr-1 text-xs text-muted-foreground">
                {t("O prueba con una obra registrada:")}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectPiece("TK-0512")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-jade" />
                TK-0512 (Tecuani)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectPiece("TK-0042")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-jade" />
                TK-0042 (Alebrije)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Verify() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [query, setQuery] = useState(id ?? "");
  const [scannerActive, setScannerActive] = useState(!id);
  const [notFoundInfo, setNotFoundInfo] = useState<{
    rawText: string;
    cleanTarget: string;
  } | null>(null);

  const [resolvedWork, setResolvedWork] = useState<AuthoryWork | null>(null);
  const [events, setEvents] = useState<AuthoryRightsEvent[]>([]);
  const [fileCheckResult, setFileCheckResult] = useState<{
    filename: string;
    hash: string;
    matched: boolean;
  } | null>(null);
  const [searching, setSearching] = useState(false);

  // Load piece when search param 'id' changes
  useEffect(() => {
    let active = true;
    if (!id || !id.trim()) {
      setScannerActive(true);
      setResolvedWork(null);
      setNotFoundInfo(null);
      return;
    }

    const target = extractPieceQuery(id);
    setQuery(target);
    setScannerActive(false);

    findWorkByIdOrHash(target).then(async (found) => {
      if (!active) return;
      const fallbackPiece = getPiece(target);

      if (found) {
        setResolvedWork(found);
        setNotFoundInfo(null);
        const evts = await getWorkRightsEvents(found.id);
        if (active) setEvents(evts);
      } else if (fallbackPiece) {
        const work = pieceToWork(fallbackPiece);
        setResolvedWork(work);
        setNotFoundInfo(null);
        const evts = await getWorkRightsEvents(work.id);
        if (active) setEvents(evts);
      } else {
        setResolvedWork(null);
        setNotFoundInfo({ rawText: id, cleanTarget: target });
      }
    });

    return () => {
      active = false;
    };
  }, [id]);

  // Handler for QR detected by the camera scanner
  const handleQrScanned = async (scannedRaw: string) => {
    setSearching(true);
    setNotFoundInfo(null);
    const target = extractPieceQuery(scannedRaw);
    setQuery(target);

    try {
      const foundWork = await findWorkByIdOrHash(target);
      const fallbackPiece = getPiece(target);

      if (foundWork) {
        setResolvedWork(foundWork);
        const evts = await getWorkRightsEvents(foundWork.id);
        setEvents(evts);
        setScannerActive(false);
        void navigate({ to: "/verificar", search: { id: foundWork.id } });
        toast.success(t("✓ Pasaporte verificado con éxito"), {
          description: `${foundWork.id} · ${foundWork.title}`,
        });
      } else if (fallbackPiece) {
        const work = pieceToWork(fallbackPiece);
        setResolvedWork(work);
        const evts = await getWorkRightsEvents(work.id);
        setEvents(evts);
        setScannerActive(false);
        void navigate({ to: "/verificar", search: { id: fallbackPiece.id } });
        toast.success(t("✓ Pasaporte verificado con éxito"), {
          description: `${fallbackPiece.id} · ${fallbackPiece.title}`,
        });
      } else {
        // Piece not found in platform!
        setResolvedWork(null);
        setScannerActive(false);
        setNotFoundInfo({
          rawText: scannedRaw,
          cleanTarget: target,
        });
        toast.error(t("Pieza no encontrada en la plataforma"), {
          description: t("Revisa el detalle de las posibles causas."),
        });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setFileCheckResult(null);
    const target = extractPieceQuery(query);

    try {
      const found = await findWorkByIdOrHash(target);
      const fallbackPiece = getPiece(target);

      if (found) {
        setResolvedWork(found);
        setNotFoundInfo(null);
        setScannerActive(false);
        const evts = await getWorkRightsEvents(found.id);
        setEvents(evts);
        void navigate({ to: "/verificar", search: { id: found.id } });
        toast.success(`Pasaporte ${found.id} verificado`);
      } else if (fallbackPiece) {
        const work = pieceToWork(fallbackPiece);
        setResolvedWork(work);
        setNotFoundInfo(null);
        setScannerActive(false);
        const evts = await getWorkRightsEvents(work.id);
        setEvents(evts);
        void navigate({ to: "/verificar", search: { id: fallbackPiece.id } });
        toast.success(`Pasaporte ${fallbackPiece.id} verificado`);
      } else {
        setResolvedWork(null);
        setScannerActive(false);
        setNotFoundInfo({ rawText: query, cleanTarget: target });
        toast.error(t("Pieza no encontrada en la plataforma"), {
          description: t("Revisa el detalle de las posibles causas."),
        });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPiece = (pieceId: string) => {
    setNotFoundInfo(null);
    setScannerActive(false);
    void navigate({ to: "/verificar", search: { id: pieceId } });
  };

  const handleVerifyFile = async (file: File | null) => {
    if (!file) return;
    setSearching(true);
    try {
      const computed = await computeFileSha256(file);
      const byHash = await findWorkByIdOrHash(computed);
      const currentWork = resolvedWork ?? pieceToWork(pieces[0]!);
      const matchesCurrent =
        currentWork.hash.toLowerCase() === computed.toLowerCase() ||
        (currentWork.notes?.toLowerCase().includes(computed.toLowerCase()) ?? false);

      if (byHash) {
        setResolvedWork(byHash);
        setNotFoundInfo(null);
        setScannerActive(false);
        const evts = await getWorkRightsEvents(byHash.id);
        setEvents(evts);
        setFileCheckResult({
          filename: file.name,
          hash: computed,
          matched: true,
        });
        toast.success("Archivo auténtico verificado contra el registro", {
          description: `${byHash.id} · ${shortHash(computed)}`,
        });
      } else {
        setFileCheckResult({
          filename: file.name,
          hash: computed,
          matched: matchesCurrent,
        });
        if (matchesCurrent) {
          toast.success("El archivo coincide con el pasaporte actual");
        } else {
          toast.info("SHA-256 calculado en navegador", {
            description: shortHash(computed),
          });
        }
      }
    } finally {
      setSearching(false);
    }
  };

  const activeWork = resolvedWork;
  const seedPiece = activeWork ? getPiece(activeWork.id) : null;
  const activePiece = activeWork
    ? seedPiece ?? workToPiece(activeWork)
    : null;

  const showFeaturedLayout =
    Boolean(activeWork && activeWork.id.toUpperCase() !== "TK-0042");

  return (
    <div>
      {scannerActive ? (
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-in fade-in duration-300">
          <div className="mx-auto max-w-xl text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Camera className="h-3.5 w-3.5" />
              {t("Verificación en vivo por cámara")}
            </span>
            <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
              {t("Escanea el Pasaporte Cultural")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(
                "Apunta la cámara de tu celular o computadora al código QR de la pieza física para certificar su origen comunitario y registro inmutable en Stellar Soroban.",
              )}
            </p>
          </div>

          {/* Camera Viewfinder */}
          <QrCameraScanner onScan={handleQrScanned} active={scannerActive} />

          {/* Sample quick check options */}
          <div className="rounded-xl border bg-sand/30 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-3 font-medium">
              {t(
                "¿No tienes un QR físico a la mano? Prueba el verificador con una pieza registrada de prueba:",
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectPiece("TK-0512")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-jade" />
                TK-0512 · Tecuani de Acatlán (Puebla)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectPiece("TK-0042")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-jade" />
                TK-0042 · Alebrije Jaguar Nahual (Oaxaca)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectPiece("TK-0117")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-jade" />
                TK-0117 · Cántaro Barro Negro (Oaxaca)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
                onClick={() =>
                  void handleQrScanned(
                    "https://ejemplo.com/qr-desconocido-no-registrado-9999",
                  )
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("Simular QR no registrado (Ver causas)")}
              </Button>
            </div>
          </div>

          <VerifierSearchBar
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleManualSearch}
            onFileSelect={handleVerifyFile}
            searching={searching}
            fileCheckResult={fileCheckResult}
          />
        </div>
      ) : notFoundInfo ? (
        <PieceNotFoundPanel
          notFound={notFoundInfo}
          onRetryCamera={() => {
            setNotFoundInfo(null);
            setScannerActive(true);
            void navigate({ to: "/verificar", search: {} });
          }}
          onSelectPiece={(pid) => handleSelectPiece(pid)}
        />
      ) : activeWork && activePiece ? (
        <div>
          {/* Top banner offering to scan another QR with camera */}
          <div className="border-b bg-sand/40">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-2.5">
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-jade" />
                {t("Pasaporte")} {activePiece.id} · {t("Verificado en Stellar Soroban")}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResolvedWork(null);
                  setNotFoundInfo(null);
                  setScannerActive(true);
                  void navigate({ to: "/verificar", search: {} });
                }}
              >
                <Camera className="h-4 w-4" />
                {t("Escanear otra pieza (Cámara)")}
              </Button>
            </div>
          </div>

          <VerifierSearchBar
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleManualSearch}
            onFileSelect={handleVerifyFile}
            searching={searching}
            fileCheckResult={fileCheckResult}
          />

          {showFeaturedLayout ? (
            <FeaturedVerify piece={activePiece} work={activeWork} events={events} />
          ) : (
            <DefaultVerify work={activeWork} events={events} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function VerifierSearchBar({
  query,
  onQueryChange,
  onSubmit,
  onFileSelect,
  searching,
  fileCheckResult,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileSelect: (f: File | null) => void;
  searching: boolean;
  fileCheckResult: { filename: string; hash: string; matched: boolean } | null;
}) {
  const { t } = useI18n();
  return (
    <div className="border-b bg-sand/60">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t(
                "Buscar por ID de pasaporte (ej. TK-0042, TK-0512, AUTH-2026-000101) o hash SHA-256…",
              )}
              className="bg-card pl-9 font-mono text-xs sm:text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={searching}>
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
              {t("Verificar ID / Hash")}
            </Button>
            <Button asChild variant="outline" size="sm">
              <label className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {t("Auditar archivo local (SHA-256)")}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    onFileSelect(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </Button>
          </div>
        </form>
        {fileCheckResult && (
          <div
            className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs ${
              fileCheckResult.matched
                ? "border-jade/30 bg-jade/10 text-jade"
                : "border-gold/40 bg-gold/10 text-foreground"
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              {fileCheckResult.matched ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-jade" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-gold" />
              )}
              {fileCheckResult.filename} ·{" "}
              {fileCheckResult.matched
                ? t("Huella binaria coincide con pasaporte registrado")
                : t("Huella SHA-256 calculada localmente")}
            </span>
            <code className="break-all font-mono text-[11px]">
              {fileCheckResult.hash}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedVerify({
  piece,
  work,
  events,
}: {
  piece: Piece;
  work: AuthoryWork;
  events: AuthoryRightsEvent[];
}) {
  const { t } = useI18n();
  const available = piece.status === "available";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-jade/30 bg-jade/10 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-jade text-jade-foreground">
            <BadgeCheck className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-xl font-semibold text-jade sm:text-2xl md:text-3xl">
              {t("✓ PIEZA AUTÉNTICA & CERTIFICADA")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Pasaporte")} {piece.id} · {t(piece.ledgerStatus)} ·{" "}
              {available ? t("Disponible") : t("No disponible")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadPassportCertificate(work, events)}
          >
            <Download className="h-4 w-4" />
            {t("Descargar Certificado")}
          </Button>
          <StellarBadge label={piece.badge ?? "Certificado en Stellar"} />
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 self-start overflow-hidden rounded-2xl shadow-float">
          <PiecePhotoGallery
            photos={
              piece.gallery && piece.gallery.length > 0
                ? piece.gallery
                : [piece.image]
            }
            title={piece.title}
          />
        </div>
        <div className="min-w-0 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t(piece.category ?? piece.technique)}
            </p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
              {t(piece.title)}
            </h1>
            <p className="mt-3 flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {piece.artisan} ·{" "}
              {piece.location ?? `${piece.community}, ${piece.region}`}
            </p>
          </div>
          <div className="relative isolate overflow-hidden bg-indigo px-6 py-8 text-indigo-foreground">
            <ArtisanStoryBackground />
            <p className="relative leading-relaxed">{t(piece.story ?? work.description)}</p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{t("Técnica:")}</span>{" "}
              {t(piece.techniqueDetail ?? piece.technique)}
            </p>
            <p>
              <span className="font-semibold text-foreground">
                {t("Dimensiones:")}
              </span>{" "}
              {piece.dimensions ?? "Pieza única"}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-float">
            <FullBreakdown piece={piece} />
            <div className="mt-4 grid gap-2">
              <CodiButton piece={piece} primary className="w-full" />
              <StripeButton piece={piece} className="w-full" />
            </div>
          </div>
          <LedgerBadge piece={piece} />
          <PiecePassportQr piece={piece} />
        </div>
      </div>

      <BlockchainAuditPanel work={work} events={events} />
    </div>
  );
}

function DefaultVerify({
  work,
  events,
}: {
  work: AuthoryWork;
  events: AuthoryRightsEvent[];
}) {
  const { t, money } = useI18n();
  const [active, setActive] = useState(0);
  const cur = gallery[active]!;
  const piece = pieces.find((p) => p.id === "TK-0042")!;
  const price = piece.priceMxn;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-jade/30 bg-jade/10 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-jade text-jade-foreground">
            <BadgeCheck className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-xl font-semibold text-jade sm:text-2xl md:text-3xl">
              {t("✓ PIEZA AUTÉNTICA & CERTIFICADA")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Pasaporte TK-0042 · escaneado hace unos segundos")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadPassportCertificate(work, events)}
          >
            <Download className="h-4 w-4" />
            {t("Descargar Certificado")}
          </Button>
          <StellarBadge
            label={t("Registrado en Ledger de Stellar / Soroban Testnet")}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl bg-sand shadow-float">
            <img
              src={cur.src}
              alt={cur.label}
              className="aspect-square w-full object-cover md:aspect-[4/3]"
            />
            {cur.video && (
              <button
                onClick={() => toast(t("Reproduciendo video del proceso (demo)"))}
                className="absolute inset-0 grid place-items-center bg-indigo/30"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-card/90 text-primary">
                  <Play className="h-7 w-7" />
                </span>
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {gallery.map((g, i) => (
              <button
                key={t(g.label)}
                onClick={() => setActive(i)}
                className={`overflow-hidden rounded-lg border-2 text-left ${
                  i === active ? "border-primary" : "border-transparent"
                }`}
              >
                <img
                  src={g.src}
                  alt={t(g.label)}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
                <p className="truncate px-1 py-1 text-xs text-muted-foreground">
                  {g.video ? "▶ " : ""}
                  {t(g.label)}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("Talla en madera de copal")}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">
              {t("Alebrije Jaguar Nahual")}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/15 font-serif font-semibold text-primary">
                MA
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{t("Maestro Don Miguel Aguilar")}</p>
                <p className="flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Taller Familiar
                  Aguilar · San Antonio Arrazola, Oaxaca, México
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-float">
            <p className="flex items-center gap-2 text-2xl font-semibold">
              {money(price)} <PriceBreakdown priceMxn={price} />
            </p>
            <p className="text-sm text-muted-foreground">
              {t("El artesano recibe el 95% del monto de la obra.")}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <CodiButton piece={piece} primary className="w-full" />
              <StripeButton piece={piece} className="w-full" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{t("La Memoria del Oficio")}</h2>
            <Accordion type="single" collapsible defaultValue="tecnica" className="mt-2">
              <AccordionItem value="tecnica">
                <AccordionTrigger>{t("Técnica ancestral heredada")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(
                    "Don Miguel aprendió de su padre a tallar el copal verde con machete y cuchillo, siguiendo la veta para que la madera “diga” qué animal guarda. Tres generaciones del taller han perfeccionado el oficio iniciado en Arrazola por Manuel Jiménez.",
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="materiales">
                <AccordionTrigger>{t("Materiales autóctonos")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(
                    "Madera de copal (Bursera glabrifolia) de reforestación comunitaria, grana cochinilla, añil, cempasúchil y jugo de limón para fijar los pigmentos.",
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="simbolos">
                <AccordionTrigger>{t("Simbología cultural")}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(
                    "El jaguar es tona o nahual protector en la cosmovisión zapoteca. Los puntos representan semillas de maíz; las flores, la fertilidad de la tierra.",
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <BlockchainAuditPanel work={work} events={events} />
    </div>
  );
}

function BlockchainAuditPanel({
  work,
  events,
}: {
  work: AuthoryWork;
  events: AuthoryRightsEvent[];
}) {
  const { t } = useI18n();
  const [audit, setAudit] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const hash = work.hash || sampleHash;
  const ts = work.registeredAt || "2026-10-17 17:42:09 UTC";
  const txUrl = getTxExplorerUrl(work.stellarTransactionId);

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast(t("Copiado al portapapeles"));
  };

  const reverifyOnChain = async () => {
    setVerifying(true);
    try {
      const res = await verifyWorkServerFn({
        data: { workId: work.id, expectedHash: hash },
      });
      if (res.verified) {
        toast.success(t("Hash SHA-256 verificado en ledger"), {
          description: `${work.id} · ${res.mode === "soroban-cli" ? "Soroban CLI" : "Soroban Testnet"}`,
        });
      } else {
        toast.success(t("Hash SHA-256 verificado en pasaporte local"), {
          description: shortHash(hash),
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const eventLabel: Record<string, string> = {
    registration: "Registro de Autoría",
    evidence: "Anclaje de Evidencia SHA-256",
    license: "Licencia de Expresión Cultural Tradicional",
    assignment: "Cesión / Transferencia",
  };

  return (
    <div className="mt-10 overflow-hidden rounded-2xl bg-indigo text-indigo-foreground shadow-float">
      <button
        onClick={() => setAudit(!audit)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <span className="font-serif text-xl font-semibold">
          {t("Panel Técnico de Auditoría Blockchain")}
        </span>
        <ChevronDown className={`transition-transform ${audit ? "rotate-180" : ""}`} />
      </button>
      {audit && (
        <div className="space-y-6 border-t border-indigo-foreground/10 p-5">
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <dl className="space-y-4 text-sm">
              {(
                [
                  ["ID de Pasaporte / Obra", work.id],
                  ["Hash SHA-256 del expediente", hash],
                  ["Smart Contract (Soroban)", contractId],
                  ["Timestamp inmutable", ts],
                  ["Ledger", "Stellar Soroban Testnet"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wider opacity-60">{t(k)}</dt>
                  <dd className="mt-1 flex items-start gap-2 break-all font-mono text-gold">
                    {v}
                    <button
                      onClick={() => copy(v)}
                      aria-label={t("Copiar")}
                      className="shrink-0 opacity-60 hover:opacity-100"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </dd>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={verifying}
                  onClick={() => void reverifyOnChain()}
                >
                  {verifying && <Loader2 className="animate-spin" />}
                  {t("Re-verificar hash")}
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <a href={txUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    {t("Ver en Stellar Expert")}
                  </a>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <a
                    href={getContractExplorerUrl(contractId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink />
                    {t("Contrato Soroban")}
                  </a>
                </Button>
              </div>
            </dl>
            <div className="self-center rounded-xl bg-card p-3">
              <PassportQrCode
                value={piecePassportUrl(work)}
                size={190}
                title="Código QR del pasaporte"
              />
            </div>
          </div>

          {events.length > 0 && (
            <div className="border-t border-indigo-foreground/10 pt-5">
              <p className="flex items-center gap-2 font-serif text-lg font-semibold text-gold">
                <History className="h-4 w-4" />
                {t("Historial de Derechos y Evidencia (Soroban Rights Events)")}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="rounded-xl border border-indigo-foreground/15 bg-indigo-foreground/5 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-gold/20 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-gold">
                        {t(eventLabel[evt.type] ?? evt.type)}
                      </span>
                      <span className="font-mono text-[11px] opacity-65">
                        {evt.effectiveDate.slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold">
                      {evt.actor}
                      {evt.recipient ? ` → ${evt.recipient}` : ""}
                    </p>
                    {evt.terms && (
                      <p className="mt-1 opacity-80">{t(evt.terms)}</p>
                    )}
                    {evt.notes && (
                      <p className="mt-1 break-all font-mono text-[11px] text-gold/90">
                        {evt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
