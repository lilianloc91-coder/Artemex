import { useI18n } from "@/i18n";
import { ArtisanStoryBackground } from '@/components/toltek/ArtisanStoryBackground';
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Images,
  Info,
  KeyRound,
  Loader2,
  MapPin,
  Ruler,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPriceBreakdown } from '@/lib/price-breakdown';
import { contractId, sampleHash, shortHash, type Piece } from "@/lib/toltek";
import { getContractExplorerUrl, getTxExplorerUrl } from "@/lib/stellar/config";
import {
  downloadPassportCertificate,
  pieceToWork,
  recordRightsEvent,
} from "@/lib/authory-service";
import {
  confirmPeyPaymentServerFn,
  createPeyCodiQrServerFn,
  createPeyPaymentLinkServerFn,
  dispatchSignedPeyWebhookServerFn,
  listPeyWebhookEventsServerFn,
  saveSpeiSettlement,
  type PeyCodiQrResponse,
  type PeyPaymentLinkResponse,
  type ProcessedPeyWebhookEvent,
} from "@/lib/pey/pey.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { encodeQrMatrix } from "@/lib/qr-encoder";
import { PiecePassportQr } from '@/components/toltek/PiecePassportQr';
import tlamatikMark from "@/assets/tlamatik-mark.png";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center justify-center text-center select-none leading-none", className)}>
      <span className="font-serif text-xl sm:text-2xl font-normal tracking-[0.24em] text-foreground uppercase">
        ARTE & ORIGEN
      </span>
      <span className="text-[8px] sm:text-[9px] tracking-[0.28em] text-muted-foreground uppercase font-sans font-medium mt-0.5">
        TLAMATIK · PASAPORTE CULTURAL
      </span>
    </span>
  );
}

export function StellarBadge({ className, label = "CERTIFICADO DE ORIGEN" }: { className?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-[#EAE0D2]/95 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#4A3D2F] uppercase backdrop-blur-xs border border-[#DCD0C0]/90 shadow-xs", className)}>
      <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#4A3D2F]/15 text-[9px] font-serif font-bold">@</span>
      <span>{t(label)}</span>
    </span>
  );
}

export function SectionTitle({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t(eyebrow)}</p>}
      <h2 className="font-serif text-3xl font-normal tracking-tight leading-tight md:text-4xl text-foreground">{t(title)}</h2>
      {sub && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t(sub)}</p>}
    </div>
  );
}

export function PiecePhotoGallery({
  photos,
  title,
  className,
}: {
  photos: string[];
  title?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const items = photos.length > 0 ? photos : [];

  if (items.length === 0) return null;

  const currentIdx = Math.min(active, items.length - 1);

  return (
    <div className={cn("flex flex-col bg-craft-photo overflow-hidden", className)}>
      <div className="relative flex-1 min-h-[300px] max-h-[65vh] md:max-h-none flex items-center justify-center overflow-hidden bg-craft-photo">
        <img
          src={items[currentIdx]}
          alt={title ? t(title) : "Foto de la pieza"}
          className="h-full w-full object-contain md:object-cover transition-opacity duration-300"
        />
        {items.length > 1 && (
          <>
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-xs font-mono shadow-sm">
              <Images className="h-3.5 w-3.5" />
              <span>{currentIdx + 1} / {items.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev > 0 ? prev - 1 : items.length - 1))}
              aria-label={t("Foto anterior")}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setActive((prev) => (prev < items.length - 1 ? prev + 1 : 0))}
              aria-label={t("Foto siguiente")}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-card border-t [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                currentIdx === i
                  ? "border-primary ring-2 ring-primary/40 scale-105"
                  : "border-border/60 opacity-70 hover:opacity-100"
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PieceCard({
  piece,
  action,
  index,
}: {
  piece: Piece;
  action?: React.ReactNode;
  index?: number;
}) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const clickable = !action;
  const gallery = piece.gallery && piece.gallery.length > 0 ? piece.gallery : [piece.image];
  const [currentIdx, setCurrentIdx] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : gallery.length - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIdx((prev) => (prev < gallery.length - 1 ? prev + 1 : 0));
  };

  const indexPrefix = index !== undefined ? `${String(index + 1).padStart(2, "0")}. ` : "";

  return (
    <>
    <article
      onClick={clickable ? (e) => { if (!(e.target as HTMLElement).closest("button,a")) setOpen(true); } : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" && e.target === e.currentTarget) setOpen(true); } : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
      aria-label={clickable ? t("Abrir pasaporte de {{title}}", { title: t(piece.title) }) : undefined}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
        clickable && "cursor-pointer"
      )}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-craft-photo">
        <img
          src={gallery[currentIdx] || piece.image}
          alt={t(piece.title)}
          loading="lazy"
          width={816}
          height={612}
          className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
        />
        <StellarBadge className="absolute left-3.5 top-3.5 z-10" />
        {gallery.length > 1 && (
          <div className="absolute right-3.5 top-3.5 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
            <Images className="h-3 w-3" />
            <span>{currentIdx + 1}/{gallery.length}</span>
          </div>
        )}
        {gallery.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            <button
              type="button"
              onClick={prevImage}
              aria-label={t("Foto anterior")}
              className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label={t("Foto siguiente")}
              className="pointer-events-auto grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-xs hover:bg-black/80 transition-colors shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
            {piece.community.toUpperCase()}, {piece.region.toUpperCase()}
          </p>
          <h3 className="font-serif text-base sm:text-lg font-semibold leading-snug text-foreground">
            {indexPrefix}{t(piece.title)}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {piece.artisan.toLowerCase().includes("colectivo") || piece.artisan.toLowerCase().includes("taller") || piece.artisan.toLowerCase().includes("familia")
              ? piece.artisan
              : `${t("Artesana(o)")}: ${piece.artisan}`} · {t(piece.technique)}
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-4 mt-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-sm font-semibold text-foreground">
                MXN {piece.priceMxn.toLocaleString("es-MX")}
              </span>
              <PriceBreakdown priceMxn={piece.priceMxn} piece={piece} />
            </div>
            {clickable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(true);
                }}
                className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                {t("Ver pasaporte →")}
              </button>
            ) : (
              <Link
                to="/verificar"
                search={{ id: piece.id }}
                className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors underline-offset-4 hover:underline"
              >
                {t("Ver pasaporte →")}
              </Link>
            )}
          </div>
          <PiecePassportQr piece={piece} compact />
          {!action && <CodiButton piece={piece} primary className="w-full h-auto min-h-10 whitespace-normal text-xs" />}
          {action}
        </div>
      </div>
    </article>
    {clickable && <PassportModal piece={piece} open={open} onOpenChange={setOpen} />}
    </>
  );
}

/** Listed price includes the certificate commission; shipping is excluded. */
export function FullBreakdown({ piece }: { piece: Pick<Piece, 'priceMxn' | 'priceUsd'> }) {
  const { t, money } = useI18n();
  const breakdown = getPriceBreakdown(piece.priceMxn);
  const rows: [string, number][] = [["Monto de la obra", breakdown.totalMxn], ["Comisión de la plataforma · Certificado (5%, incluido)", breakdown.commissionMxn]];
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3"><dt className="min-w-0 text-muted-foreground">{t(k)}</dt><dd className="shrink-0 whitespace-nowrap font-mono">{money(v, 2)}</dd></div>
      ))}
      <div className="flex justify-between gap-3 border-t pt-2 font-semibold"><dt>{t("Total")}</dt><dd className="shrink-0 whitespace-nowrap font-mono">{money(breakdown.totalMxn, 2)}</dd></div>
      <div className="flex justify-between gap-3 border-t pt-2 text-jade"><dt className="min-w-0 font-medium">{t("El artesano recibe (95%)")}</dt><dd className="shrink-0 whitespace-nowrap font-mono font-semibold">{money(breakdown.artisanMxn, 2)}</dd></div>
      {piece.priceUsd && <p className="text-xs text-muted-foreground">{t("Precio internacional de la obra: USD $")}{" "}{piece.priceUsd}</p>}
    </dl>
  );
}

export function LedgerBadge({ piece }: { piece: Piece }) {
  const { t } = useI18n();
  const hash = piece.stellarTxHash ?? "";
  const url = getTxExplorerUrl(hash);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl border border-jade/30 bg-jade/10 p-3 text-sm transition-colors hover:bg-jade/15"
    >
      <img src={tlamatikMark} alt="" className="h-8 w-8 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-jade">{t("Inmutable ·")}{" "}{t(piece.ledgerStatus)}</span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{hash || "Soroban Testnet"}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-jade" />
    </a>
  );
}

export function StripeButton({ piece, className }: { piece: Piece; className?: string }) {
  const { t, money } = useI18n();
  return (
    <Button variant="outline" className={className} onClick={() => toast.success(t("Checkout de Stripe simulado"), { description: `${money(piece.priceMxn)} · ${piece.title}` })}>
      <CreditCard />{t("Buy in USD (Stripe)")}</Button>
  );
}

export function CulturalSeal({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center h-16 w-16 select-none shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path
          id="seal-curve-static"
          d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
          fill="transparent"
        />
        <text className="text-[9px] uppercase tracking-[0.25em] fill-[#D6CCA8] font-serif font-medium">
          <textPath href="#seal-curve-static" startOffset="0%">
            ORIGEN CERTIFICADO · PRESERVACIÓN CULTURAL ·
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-2.5 rounded-full border border-dashed border-[#D6CCA8]/50 flex flex-col items-center justify-center text-center p-1">
        <div className="h-3 w-3 rounded-full border border-[#D6CCA8]/70 flex items-center justify-center">
          <span className="text-[7px] text-[#D6CCA8]">★</span>
        </div>
        <span className="font-serif text-[6.5px] uppercase tracking-wider text-[#D6CCA8] mt-0.5">TLAMATIK</span>
      </div>
    </div>
  );
}

/** Ficha Curatorial & Pasaporte Cultural en split-screen (Look & Feel Arte & Origen) */
export function CuratorialPieceDetail({
  piece,
  onClose,
  showCornerLabels = true,
}: {
  piece: Piece;
  onClose?: () => void;
  showCornerLabels?: boolean;
}) {
  const { t } = useI18n();
  const [reserving, setReserving] = useState(false);

  const regionName = piece.regionDetail || `${piece.community}, Sierra de ${piece.region}`;
  const regionStory =
    piece.regionStory ||
    piece.story ||
    "El entorno montañoso cobija la memoria viva de la comunidad, preservando saberes y técnicas ancestrales transmitidas de generación en generación.";

  const cleanArtisanName = piece.artisan
    .split("-")[0]?.trim() || piece.artisan;

  const artisanBio =
    piece.artisanBio ||
    piece.story ||
    `${cleanArtisanName} preserva la herencia familiar y legado generacional en el oficio, transmitido con paciencia y maestría.`;

  const processAndMaterials =
    piece.processAndMaterials ||
    piece.techniqueDetail ||
    "Materiales autóctonos de recolección local, trabajados con técnicas tradicionales respetuosas con los ciclos de la tierra.";

  const curatorialFolio = piece.curatorialId || `ID: ${piece.id}`;

  const handleReserve = () => {
    setReserving(true);
    setTimeout(() => {
      setReserving(false);
      toast.success(t("Solicitud de reserva registrada"), {
        description: t("La pieza {{title}} ha quedado reservada por 24 horas para pago en firme.", {
          title: t(piece.title),
        }),
      });
    }, 600);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl">
      <div className="grid lg:grid-cols-12 min-h-[580px]">
        {/* COLUMNA IZQUIERDA: Tarjeta de la Obra y Acción de Compra */}
        <div className="lg:col-span-5 p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-card">
          <div className="space-y-6">
            {/* Foto de la Obra con Badge de Certificado */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-craft-photo border border-border/70 shadow-sm">
              <img
                src={piece.image}
                alt={t(piece.title)}
                className="h-full w-full object-contain"
              />
              <StellarBadge className="absolute left-3.5 top-3.5 z-10" />
            </div>

            {/* Ficha Comercial */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted-foreground">
                {piece.community.toUpperCase()}, {piece.region.toUpperCase()}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight text-foreground">
                {t(piece.title)}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
                {piece.artisan.toLowerCase().includes("colectivo") || piece.artisan.toLowerCase().includes("taller")
                  ? piece.artisan
                  : `${t("Artesana")}: ${piece.artisan}`}
              </p>
            </div>
          </div>

          <PiecePassportQr piece={piece} />
          <div className="pt-6 border-t border-border/60 space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="font-sans text-xl sm:text-2xl font-bold text-foreground">
                  MXN {piece.priceMxn.toLocaleString("es-MX")}
                </span>
                <PriceBreakdown priceMxn={piece.priceMxn} piece={piece} />
              </div>
              <span className="text-xs font-serif italic text-muted-foreground">
                {t("Obra única")}
              </span>
            </div>

            {/* Botones de acción directos: Adquirir (CoDi/SPEI) y Reservar */}
            <div className="grid gap-3 pt-1">
              <CodiButton
                piece={piece}
                primary
                className="w-full h-auto min-h-10 whitespace-normal shadow-sm py-2.5 font-medium"
              />
              <Button
                variant="outline"
                onClick={handleReserve}
                disabled={reserving}
                className="w-full rounded-xl border-border/90 text-foreground hover:bg-sand/60"
              >
                {reserving ? t("Reservando…") : t("Reservar pieza")}
              </Button>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <Link
                to="/verificar"
                search={{ id: piece.id }}
                className="hover:text-primary transition-colors hover:underline"
              >
                {t("Consultar pasaporte en verificador público →")}
              </Link>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Ficha Curatorial, Historia y Trazabilidad (Fondo Espresso) */}
        <div className="lg:col-span-7 relative p-6 sm:p-8 md:p-12 flex flex-col justify-between bg-[#28201B] text-[#F4EFE6] overflow-hidden">
          <ArtisanStoryBackground />

          {/* Contenido Editorial Curatorial */}
          <div className="relative z-10 space-y-7">
            {/* 1. La Región */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#A89D8D]">
                {t("La Región")}
              </p>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#F4EFE6]">
                {t(regionName)}
              </h3>
              <p className="text-xs sm:text-sm text-[#C5B9A8] leading-relaxed pt-1 max-w-xl">
                {t(regionStory)}
              </p>
            </div>

            {/* 2. Historia de la Artesana */}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#A89D8D]">
                {t("Historia de la Artesana")}
              </p>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#F4EFE6]">
                {cleanArtisanName}
              </h3>
              <p className="text-xs sm:text-sm text-[#C5B9A8] leading-relaxed pt-1 max-w-xl">
                {t(artisanBio)}
              </p>
            </div>

            {/* 3. Proceso Creativo & Materiales */}
            <div className="space-y-1">
              <h4 className="font-serif text-base sm:text-lg font-normal text-[#F4EFE6]">
                {t("Proceso Creativo & Materiales")}
              </h4>
              <p className="text-xs sm:text-sm text-[#C5B9A8] leading-relaxed pt-0.5 max-w-xl">
                {t(processAndMaterials)}
              </p>
            </div>
          </div>

          {/* 4. Documentación y Trazabilidad + Sello */}
          <div className="relative z-10 pt-8 mt-6 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h4 className="font-serif text-base sm:text-lg font-normal text-[#F4EFE6]">
                {t("Documentación y Trazabilidad")}
              </h4>
              <p className="text-xs font-mono text-[#D6CCA8] truncate">
                {curatorialFolio} · {t("Origen Certificado")}
              </p>
              <p className="text-[11px] text-[#A89D8D]">
                {t("Preservación Cultural")} · {piece.ledgerStatus || "Stellar Soroban"}
              </p>
            </div>

            <CulturalSeal className="shrink-0" />
          </div>
        </div>
      </div>

      {showCornerLabels && (
        <div className="flex items-center justify-between bg-sand/30 border-t border-border/40 px-6 py-2.5 text-[10px] font-serif uppercase tracking-widest text-muted-foreground">
          <span>{t("Ficha Curatorial & Pasaporte")}</span>
          <span>{t("Trazabilidad & Historia Viva")}</span>
        </div>
      )}
    </div>
  );
}

/** Modal de Pasaporte para piezas destacadas. */
export function PassportModal({ piece, open, onOpenChange }: { piece: Piece; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto p-0 border-0 bg-transparent shadow-none">
        <CuratorialPieceDetail piece={piece} onClose={() => onOpenChange(false)} showCornerLabels={true} />
      </DialogContent>
    </Dialog>
  );
}

/** Generador de código QR estándar ISO/IEC 18004 escaneable con cualquier cámara móvil o lector CoDi. */
export function QrCode({ value, size = 140, className }: { value: string; size?: number; className?: string }) {
  const { t } = useI18n();
  const matrix = encodeQrMatrix(value || "https://tlamatik.vercel.app");
  const n = matrix.length;
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++) {
    const row = matrix[y]!;
    for (let x = 0; x < n; x++) {
      if (row[x]) {
        cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
      }
    }
  }
  return (
    <svg
      viewBox={`-4 -4 ${n + 8} ${n + 8}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("rounded-md bg-white fill-black", className)}
      role="img"
      aria-label={t("Código QR del pasaporte")}
    >
      <rect x={-4} y={-4} width={n + 8} height={n + 8} fill="#ffffff" />
      {cells}
    </svg>
  );
}



/** Desglose transparente "Buyer Premium": 95% artesano / 5% certificado. */
export function PriceBreakdown({ priceMxn, piece }: { priceMxn: number; piece?: Piece }) {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("Ver desglose transparente del precio")}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] border-border bg-popover p-4 text-xs text-popover-foreground shadow-md">
        <p className="font-serif text-sm font-semibold">{t("Desglose transparente")}</p>
        <div className="mt-3"><FullBreakdown piece={piece ?? { priceMxn }} /></div>
      </PopoverContent>
    </Popover>
  );
}

/** Botón + modal de pago CoDi® / pey.mx conectado a api.pey.mx (/codi/qr y /payment-link/create) + Smart Contract Soroban en Stellar Testnet. */
export function CodiButton({ piece, className, primary }: { piece: Piece; className?: string; primary?: boolean }) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"qr" | "wait" | "done">("qr");
  const [stepProgress, setStepProgress] = useState(0);
  const [loadingApi, setLoadingApi] = useState(false);
  const [codiQr, setCodiQr] = useState<PeyCodiQrResponse | null>(null);
  const [paymentLink, setPaymentLink] = useState<PeyPaymentLinkResponse | null>(null);
  const [dualReceipt, setDualReceipt] = useState<ProcessedPeyWebhookEvent | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyOverride, setApiKeyOverride] = useState("");
  const [scanMode, setScanMode] = useState<"bank" | "camera">("bank");

  const { totalMxn } = getPriceBreakdown(piece.priceMxn);

  const copyValue = (val: string) => {
    navigator.clipboard?.writeText(val);
    toast(t("Copiado al portapapeles"));
  };

  const loadPeySession = async (customKey?: string) => {
    setLoadingApi(true);
    try {
      const originUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://ancestral-craft-passport.lovable.app";
      const [qrRes, linkRes] = await Promise.all([
        createPeyCodiQrServerFn({
          data: {
            pieceId: piece.id,
            title: piece.title,
            amountMxn: totalMxn,
            expirationSeconds: 600,
            apiKeyOverride: customKey || apiKeyOverride || undefined,
          },
        }),
        createPeyPaymentLinkServerFn({
          data: {
            pieceId: piece.id,
            title: piece.title,
            artisan: piece.artisan,
            community: piece.community,
            amountMxn: totalMxn,
            originUrl,
            apiKeyOverride: customKey || apiKeyOverride || undefined,
          },
        }),
      ]);
      setCodiQr(qrRes);
      setPaymentLink(linkRes);
    } catch {
      toast.error(t("No se pudo conectar con pey.mx"));
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    if (open && state === "qr") {
      void loadPeySession();
    }
  }, [open, piece.id]);

  // Escucha eventos entrantes del webhook POST /api/webhooks/pey y el estado en vivo del Payment Link
  useEffect(() => {
    if (!open || state !== "qr") return;
    const openedAtMs = Date.now() - 2000;
    const timer = window.setInterval(async () => {
      try {
        const events = await listPeyWebhookEventsServerFn({
          data: { pieceId: piece.id },
        });
        let recent = events.find(
          (e) => new Date(e.datePaidIso).getTime() >= openedAtMs,
        );

        // Si el Payment Link en vivo de pey.mx cambió a PAID, disparar el procesamiento del webhook + Smart Contract Stellar
        if (!recent && paymentLink?.mode === "live" && paymentLink.id) {
          const numRef = codiQr?.numRef || piece.id.replace(/\D/g, "") || "0512";
          const liveStatus = await confirmPeyPaymentServerFn({
            data: {
              paymentLinkId: paymentLink.id,
              codiQrId: codiQr?.id,
              amountMxn: totalMxn,
              numRef,
              apiKeyOverride: apiKeyOverride || undefined,
            },
          });
          if (liveStatus.status === "PAID") {
            recent = await dispatchSignedPeyWebhookServerFn({
              data: {
                eventType: "payment_link.payment_received",
                pieceId: piece.id,
                title: piece.title,
                artisan: piece.artisan,
                amountMxn: totalMxn,
                codiQrId: codiQr?.id || paymentLink.id,
                numRef,
                concept: codiQr?.concept,
                trackingKey: liveStatus.trackingKey,
                transactionId: liveStatus.transactionId,
              },
            });
          }
        }

        if (recent) {
          const netArtisanMxn = recent.netArtisanMxn.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          saveSpeiSettlement({
            artisan: recent.artisan,
            piece: `${recent.pieceId} · ${recent.pieceTitle}`,
            amount: `$${netArtisanMxn} MXN`,
            date: "08 nov 2026",
            clave: recent.trackingKey,
            codiQrId: recent.codiQrId,
            peyTransactionId: recent.transactionId,
            stellarTxHash: recent.sorobanTxHash,
            webhookEventType: recent.eventType,
          });
          setDualReceipt(recent);
          setState("done");
          toast.success(t("✓ Pago confirmado por pey.mx (SPEI)"), {
            description: `Webhook ${recent.eventType} + Stellar Tx ${shortHash(recent.sorobanTxHash)}`,
          });
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [open, state, piece.id, paymentLink?.id, paymentLink?.mode]);

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setTimeout(() => {
        setState("qr");
        setStepProgress(0);
        setDualReceipt(null);
      }, 250);
    }
  };

  const confirm = async () => {
    setState("wait");
    setStepProgress(0);
    try {
      const numRef = codiQr?.numRef || piece.id.replace(/\D/g, "") || "512";

      // Paso 1: Confirmar recepción del pago en pey.mx (CoDi / SPEI)
      await confirmPeyPaymentServerFn({
        data: {
          paymentLinkId: paymentLink?.id,
          codiQrId: codiQr?.id,
          amountMxn: totalMxn,
          numRef,
          apiKeyOverride: apiKeyOverride || undefined,
        },
      });
      setStepProgress(1);

      // Paso 2: Procesar notificación Webhook firmada y lanzar Smart Contract Soroban en Stellar Testnet
      const webhookRes = await dispatchSignedPeyWebhookServerFn({
        data: {
          eventType: "codi.qr.payment_received",
          pieceId: piece.id,
          title: piece.title,
          artisan: piece.artisan,
          amountMxn: totalMxn,
          codiQrId: codiQr?.id,
          numRef,
          concept: codiQr?.concept,
        },
      });
      setStepProgress(2);

      // Paso 3: Persistir evento de compra acreditada en el historial del pasaporte y en liquidaciones SPEI
      const terms = `Compra acreditada vía Webhook ${webhookRes.eventType} (pey.mx) · Cobro $${totalMxn} MXN · Clave SPEI ${webhookRes.trackingKey}`;
      await recordRightsEvent({
        id: webhookRes.sorobanEventId,
        workId: piece.id,
        type: "assignment",
        actor: piece.artisan,
        recipient: "Comprador Verificado CoDi (pey.mx)",
        effectiveDate: webhookRes.datePaidIso,
        terms,
        notes: `Webhook ID: ${webhookRes.webhookId} · IDC CoDi: ${webhookRes.codiQrId} · Pey Tx: ${webhookRes.transactionId} · Clave SPEI: ${webhookRes.trackingKey} · Soroban Tx: ${webhookRes.sorobanTxHash}`,
        stellarTransactionId: webhookRes.sorobanTxHash,
        createdAt: webhookRes.datePaidIso,
      });

      const netArtisanMxn = webhookRes.netArtisanMxn.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      saveSpeiSettlement({
        artisan: piece.artisan,
        piece: `${piece.id} · ${piece.title}`,
        amount: `$${netArtisanMxn} MXN`,
        date: "08 nov 2026",
        clave: webhookRes.trackingKey,
        codiQrId: webhookRes.codiQrId,
        peyTransactionId: webhookRes.transactionId,
        stellarTxHash: webhookRes.sorobanTxHash,
        webhookEventType: webhookRes.eventType,
      });

      setStepProgress(3);
      setDualReceipt(webhookRes);
      setState("done");
      toast.success(t("✓ Compra acreditada en SPEI y Stellar Testnet"), {
        description: `CEP ${webhookRes.trackingKey} · Tx ${shortHash(webhookRes.sorobanTxHash)}`,
      });
    } catch {
      setState("qr");
      setStepProgress(0);
      toast.error(t("No se pudo verificar el pago en pey.mx"));
    }
  };

  return (
    <>
      <Button
        variant={primary ? "default" : "outline"}
        size={primary ? "default" : "sm"}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Smartphone />{" "}
        {primary ? t("Pagar con CoDi® (pey.mx)") : t("Pagar con CoDi® (0% Comisión)")}
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[92vh] overflow-y-auto text-center sm:max-w-lg">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
              <span>pey.mx CoDi® SPEI</span>
              <span>×</span>
              <span>Stellar Soroban Testnet</span>
            </div>
            <DialogTitle className="font-serif text-2xl">
              {state === "done"
                ? t("Certificado de Compra Acreditada")
                : "CoDi® · pey.mx"}
            </DialogTitle>
            <DialogDescription>
              {piece.id} · {t(piece.title)} · {money(totalMxn)}
            </DialogDescription>
          </DialogHeader>

          {state === "wait" && (
            <div className="space-y-4 rounded-xl border bg-sand/70 p-5 text-left">
              <p className="text-center font-serif text-base font-semibold">
                {t("Procesando notificación de pago y Smart Contract…")}
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                {[
                  "1. Recibiendo evento Webhook de pago exitoso (pey.mx · codi.qr.payment_received)",
                  "2. Lanzando Smart Contract en Stellar Testnet (Soroban · record_rights_event)",
                  "3. Consolidando respuestas de cobro SPEI y hash en blockchain",
                ].map((label, idx) => (
                  <li key={label} className="flex items-start gap-2.5">
                    {stepProgress > idx ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-jade" />
                    ) : stepProgress === idx ? (
                      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border" />
                    )}
                    <span
                      className={
                        stepProgress >= idx
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {t(label)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state === "done" && dualReceipt && (
            <div className="space-y-4 text-left">
              {/* Banner de éxito dual */}
              <div className="rounded-xl border border-jade/30 bg-jade/10 p-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-jade" />
                <p className="mt-1.5 font-serif text-lg font-semibold text-jade">
                  {t("✓ Compra Acreditada: Cobro SPEI + Smart Contract Stellar")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dualReceipt.pieceId} · {t(dualReceipt.pieceTitle)} ·{" "}
                  {dualReceipt.artisan}
                </p>
              </div>

              {/* Resumen del Cobro */}
              <div className="rounded-xl border bg-card p-3.5 text-xs">
                <p className="mb-2 font-semibold uppercase tracking-wider text-primary">
                  {t("Resumen del Cobro Liquidado")}
                </p>
                <FullBreakdown piece={{ priceMxn: dualReceipt.amountMxn }} />
              </div>

              {/* Evento 1: Notificación Webhook pey.mx (CoDi / SPEI Banxico) */}
              <div className="rounded-xl border bg-sand/70 p-3.5 text-xs">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wider text-primary">
                    {t("1. Evento de Pago (Webhook pey.mx · SPEI)")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-jade/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-jade">
                    <ShieldCheck className="h-3 w-3" /> HMAC-SHA256
                  </span>
                </div>
                <dl className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{t("Evento:")}</dt>
                    <dd className="font-semibold text-foreground">
                      {dualReceipt.eventType}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Webhook ID:</dt>
                    <dd className="truncate">{dualReceipt.webhookId}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">IDC CoDi / Ref:</dt>
                    <dd>
                      {dualReceipt.codiQrId} · Ref {dualReceipt.numRef}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Pey Tx (ULID):</dt>
                    <dd className="flex items-center gap-1 truncate font-semibold">
                      {dualReceipt.transactionId}
                      <button
                        type="button"
                        onClick={() => copyValue(dualReceipt.transactionId)}
                        aria-label={t("Copiar")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">
                      {t("Clave de Rastreo Banxico")}:
                    </dt>
                    <dd className="flex items-center gap-1 font-semibold text-jade">
                      {dualReceipt.trackingKey}
                      <button
                        type="button"
                        onClick={() => copyValue(dualReceipt.trackingKey)}
                        aria-label={t("Copiar")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Evento 2: Smart Contract en Stellar Testnet (Soroban) */}
              <div className="rounded-xl border border-indigo/25 bg-indigo p-3.5 text-xs text-indigo-foreground">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wider text-gold">
                    {t("2. Smart Contract Stellar Testnet (Soroban)")}
                  </span>
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                    {dualReceipt.sorobanFunction}
                  </span>
                </div>
                <dl className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="opacity-70">{t("Contrato Soroban:")}</dt>
                    <dd className="flex items-center gap-1 text-gold">
                      {shortHash(dualReceipt.sorobanContractId, 6)}
                      <button
                        type="button"
                        onClick={() => copyValue(dualReceipt.sorobanContractId)}
                        aria-label={t("Copiar")}
                        className="opacity-75 hover:opacity-100"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="opacity-70">{t("Evento On-Chain:")}</dt>
                    <dd>
                      {dualReceipt.sorobanEventId} ({dualReceipt.sorobanEventType})
                    </dd>
                  </div>
                  <div>
                    <dt className="opacity-70">
                      {t("Hash de Transacción Stellar Testnet:")}
                    </dt>
                    <dd className="mt-0.5 flex items-center justify-between gap-2 break-all text-gold">
                      <span>{dualReceipt.sorobanTxHash}</span>
                      <button
                        type="button"
                        onClick={() => copyValue(dualReceipt.sorobanTxHash)}
                        aria-label={t("Copiar")}
                        className="shrink-0 opacity-75 hover:opacity-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="opacity-70">
                      {t("Hash SHA-256 de la Pieza / Pasaporte:")}
                    </dt>
                    <dd className="mt-0.5 flex items-center justify-between gap-2 break-all text-indigo-foreground/90">
                      <span>{dualReceipt.pieceSha256Hash || sampleHash}</span>
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(dualReceipt.pieceSha256Hash || sampleHash)
                        }
                        aria-label={t("Copiar")}
                        className="shrink-0 opacity-75 hover:opacity-100"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Acciones de acreditación */}
              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const workObj = {
                      ...pieceToWork(piece),
                      stellarTransactionId: dualReceipt.sorobanTxHash,
                    };
                    downloadPassportCertificate(workObj);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("Descargar Certificado")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={getTxExplorerUrl(dualReceipt.sorobanTxHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Stellar Expert <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <Link
                      to="/verificar"
                      search={{ id: piece.id }}
                      onClick={() => setOpen(false)}
                    >
                      {t("Ver en verificador →")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {state === "qr" && (
            <div className="space-y-4">
              {/* Selector de modo de escaneo: App Bancaria vs. Cámara / pey.mx */}
              <div className="flex rounded-lg border bg-sand/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setScanMode("bank")}
                  className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
                    scanMode === "bank"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📱 {t("App Bancaria (CoDi®)")}
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode("camera")}
                  className={`flex-1 rounded-md py-1.5 font-medium transition-all ${
                    scanMode === "camera"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📷 {t("Cámara / pey.mx")}
                </button>
              </div>

              <div className="mx-auto w-fit rounded-2xl border-4 border-primary/25 bg-card p-3 shadow-sm">
                {loadingApi ? (
                  <div className="grid h-[170px] w-[170px] place-items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : scanMode === "bank" ? (
                  codiQr?.qrImage ? (
                    <img
                      src={
                        codiQr.qrImage.startsWith("data:")
                          ? codiQr.qrImage
                          : `data:image/png;base64,${codiQr.qrImage}`
                      }
                      alt={t("Código QR CoDi Banxico")}
                      className="h-[170px] w-[170px] rounded-md object-contain"
                    />
                  ) : (
                    <QrCode
                      value={
                        codiQr?.qrString ||
                        JSON.stringify({
                          v: { DEV: "TLAMATIK-POS" },
                          TYP: 20,
                          IDC: `35a13c${piece.id.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`,
                          AMO: totalMxn,
                          REF: Number(piece.id.replace(/\D/g, "") || "512"),
                          DES: `Tlamatik ${piece.id} ${piece.title}`.slice(0, 40),
                          BEN: {
                            NAM: "Miriam Nava",
                            ACC: "012180015355682429",
                            BNK: 40012,
                          },
                        })
                      }
                      size={190}
                    />
                  )
                ) : (
                  <QrCode
                    value={
                      paymentLink?.url ||
                      "https://app.mipey.mx/checkout/payment-link/01M6Y8H4YY0X3X7W669C28S065"
                    }
                    size={190}
                  />
                )}
              </div>

              {scanMode === "bank" ? (
                <div className="space-y-2 text-xs">
                  <p className="font-medium text-foreground">
                    {t("Escanea desde tu app bancaria con 'Pagar QR / CoDi®'")}
                  </p>
                  <div className="rounded-lg border border-jade/30 bg-jade/10 p-2.5 text-left text-[11px] text-foreground">
                    <p className="font-semibold text-jade flex items-center gap-1">
                      <span>✓</span> {t("QR CoDi reconocido por tu banco (Banxico)")}
                    </p>
                    <ol className="mt-1 list-decimal pl-4 space-y-1 text-muted-foreground leading-relaxed">
                      <li>{t("Presiona el botón azul en la pantalla de tu app Bancomer (BBVA) para autorizar con tu Token Digital o huella.")}</li>
                      <li>{t("Presiona el botón 'Pagar con CoDi · Acreditar en Blockchain' abajo para cerrar el ciclo, recibir el comprobante SPEI y registrar la obra en Stellar Testnet.")}</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <p className="font-medium text-foreground">
                    {t("Escanea con la app de Cámara normal de tu celular")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("Abre directamente el portal seguro de checkout de pey.mx para pagar con tarjeta o solicitud CoDi push.")}
                  </p>
                </div>
              )}

              {codiQr && (
                <div className="rounded-xl border bg-sand/70 p-3 text-left font-mono text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">IDC CoDi (Banxico):</span>
                    <span className="font-semibold text-foreground">{codiQr.id}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Beneficiario SPEI:</span>
                    <span className="font-semibold text-foreground">Miriam Nava</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">CLABE Interbancaria:</span>
                    <span className="font-semibold text-foreground font-mono">012180015355682429</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Monto:</span>
                    <span className="font-semibold text-foreground">{money(totalMxn)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Ref. Numérica:</span>
                    <span>{codiQr.numRef}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-muted-foreground">Concepto SPEI:</span>
                    <span className="truncate">{codiQr.concept}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 border-t pt-1">
                    <span className="text-muted-foreground">Smart Contract:</span>
                    <a
                      href={getContractExplorerUrl(contractId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {shortHash(contractId, 6)}
                    </a>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Button
                  className="w-full"
                  onClick={() => void confirm()}
                  disabled={loadingApi}
                >
                  {t("Pagar con CoDi · Acreditar en Blockchain")}
                </Button>
                {paymentLink && (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={paymentLink.url} target="_blank" rel="noreferrer">
                      {t("Abrir Payment Link en pey.mx")}{" "}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>

              <div className="border-t pt-2 text-left">
                <button
                  type="button"
                  onClick={() => setShowKeyInput((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <KeyRound className="h-3 w-3" />
                  {t("Configurar Bearer API Key de pey.mx (opcional)")}
                </button>
                {showKeyInput && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      type="password"
                      value={apiKeyOverride}
                      onChange={(e) => setApiKeyOverride(e.target.value)}
                      placeholder="pey_live_... / Bearer token"
                      className="h-8 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      onClick={() => void loadPeySession(apiKeyOverride)}
                    >
                      {t("Conectar")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
