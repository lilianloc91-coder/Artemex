import { useI18n } from "@/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileSignature, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CodiButton,
  CuratorialPieceDetail,
  PieceCard,
  SectionTitle,
  StellarBadge,
} from "@/components/toltek/ui";
import {
  contractId,
  patterns,
  pieces as seedPieces,
  shortHash,
  type Pattern,
  type Piece,
} from "@/lib/toltek";
import { listAllCatalogPieces, recordRightsEvent } from "@/lib/authory-service";
import { recordRightsServerFn } from "@/lib/stellar/soroban.functions";
import { getContractExplorerUrl } from "@/lib/stellar/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mercado")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Mercado Ético y Licenciamiento B2B — Tlamatik" },
      {
        name: "description",
        content:
          "Compra artesanías certificadas o licencia patrones tradicionales con regalías para la comunidad.",
      },
      { property: "og:title", content: "Mercado Ético — Tlamatik" },
      {
        property: "og:description",
        content:
          "Artesanías con origen comunitario y licencias éticas firmadas en Soroban.",
      },
    ],
  }),
  component: Market,
});

const regions = ["Oaxaca", "Chiapas", "Jalisco", "Michoacán", "Guerrero", "Puebla"];
const techniques = ["Textil", "Cerámica", "Talla en Madera", "Filigrana", "Laca"];

export const artisanLicenseTypes = [
  {
    id: "moda-textil",
    name: "Moda & Textil Artesanal",
    termsName: "Licencia de Expresión Cultural Tradicional para Moda y Textil Ético",
    description: "Aplicación de patrones ancestrales en indumentaria respetando técnicas comunitarias.",
  },
  {
    id: "diseno-interiores",
    name: "Diseño & Interiorismo",
    termsName: "Licencia de Aplicación Artesanal en Decoración y Arquitectura de Interiores",
    description: "Uso de motivos originarios en mobiliario y proyectos de diseño colaborativo.",
  },
  {
    id: "edicion-limitada",
    name: "Edición Limitada Colaborativa",
    termsName: "Licencia de Co-creación y Edición Limitada con Taller Artesanal Originario",
    description: "Piezas producidas en alianza directa con el taller artesanal con estricta atribución.",
  },
  {
    id: "editorial-cultural",
    name: "Exhibición & Divulgación Cultural",
    termsName: "Licencia de Difusión Cultural, Museografía y Catálogo Curatorial de Tradición Viva",
    description: "Autorización para fines curatoriales, exposiciones y publicaciones culturales.",
  },
];

const uses = artisanLicenseTypes.map((l) => l.name);

function Market() {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"fisico" | "b2b">("fisico");
  const [catalog, setCatalog] = useState<Piece[]>(seedPieces);
  const [selectedPieceId, setSelectedPieceId] = useState<string>("TK-0701");
  const [region, setRegion] = useState<string | null>(null);
  const [tech, setTech] = useState<string | null>(null);
  const [max, setMax] = useState(10000);
  const [lic, setLic] = useState<Pattern | null>(null);
  const [use, setUse] = useState(uses[0] ?? "Textil comercial");
  const [royalty, setRoyalty] = useState(12);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    let active = true;
    listAllCatalogPieces().then((all) => {
      if (active && all.length > 0) setCatalog(all);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedPiece = useMemo(
    () => catalog.find((p) => p.id === selectedPieceId) || catalog[0] || seedPieces[0]!,
    [catalog, selectedPieceId],
  );

  const list = useMemo(
    () =>
      catalog.filter(
        (p) =>
          (!region || p.region === region) &&
          (!tech || p.technique === tech) &&
          p.priceMxn <= max,
      ),
    [catalog, region, tech, max],
  );

  const sign = async () => {
    if (!lic) return;
    setSigning(true);
    try {
      const selectedLicType =
        artisanLicenseTypes.find((l) => l.name === use) || artisanLicenseTypes[0]!;
      const eventId = `EVT-LIC-${Date.now().toString(36).toUpperCase()}`;
      const terms = `${selectedLicType.termsName} · Modalidad: ${use} · Regalías automáticas: ${royalty}% (${royalty * 100} bps) · Salvaguarda de Expresión Cultural Tradicional`;

      const sorobanRes = await recordRightsServerFn({
        data: {
          eventId,
          workId: lic.id,
          eventType: "license",
          actor: lic.community,
          recipient: "Marca Licenciataria B2B",
          terms,
        },
      });

      const nowIso = new Date().toISOString();
      await recordRightsEvent({
        id: eventId,
        workId: lic.id,
        type: "license",
        actor: lic.community,
        recipient: "Marca Licenciataria B2B",
        effectiveDate: sorobanRes.timestampIso || nowIso,
        terms,
        notes: `Soroban Tx: ${sorobanRes.txHash}`,
        stellarTransactionId: sorobanRes.txHash,
        createdAt: nowIso,
      });

      const communityName = lic.community;
      setSigning(false);
      setLic(null);
      toast.success(t("Licencia ética de expresión cultural aprobada"), {
        description: `${t("{{royalty}}% de regalías automáticas para {{community}}", {
          royalty,
          community: communityName,
        })} · Tx ${shortHash(sorobanRes.txHash)}`,
      });
    } catch {
      setSigning(false);
      toast.error(t("No se pudo firmar la licencia en Soroban"));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mx-auto flex w-full max-w-md rounded-2xl border bg-sand p-1 sm:w-fit sm:rounded-full">
        {(
          [
            ["fisico", "Comprar Artesanías Físicas"],
            ["b2b", "Licenciamiento Ético para Marcas"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2 text-center text-sm font-medium leading-tight transition-colors sm:rounded-full sm:px-4",
              mode === k ? "bg-indigo text-indigo-foreground" : "text-muted-foreground",
            )}
          >
            {t(l)}
          </button>
        ))}
      </div>

      {mode === "fisico" ? (
        <div className="mt-8 space-y-12">
          {/* Ficha Curatorial & Pasaporte Cultural (Look & Feel Arte & Origen) */}
          <section id="ficha-curatorial" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-sans uppercase tracking-[0.2em] text-muted-foreground">
                  {t("Detalle de Obra Certificada")}
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                  {t("Ficha Curatorial & Pasaporte")}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("Selecciona cualquier obra del catálogo para explorar su historia viva y trazabilidad")}
              </p>
            </div>

            <CuratorialPieceDetail piece={selectedPiece} />
          </section>

          {/* Catálogo de Obras Físicas y Filtros */}
          <section className="space-y-6 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                  {t("Catálogo de Obras Disponibles")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("{{count}} piezas certificadas en blockchain con comercio ético y directo", {
                    count: list.length,
                  })}
                </p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
              <aside className="space-y-6 rounded-xl border bg-card p-5 shadow-float lg:self-start">
                <Chips title={t("Región")} items={regions} value={region} onChange={setRegion} />
                <Chips title={t("Técnica")} items={techniques} value={tech} onChange={setTech} />
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    {t("Precio máximo: $")}
                    {max.toLocaleString(locale)} MXN
                  </p>
                  <Slider
                    min={250}
                    max={10000}
                    step={250}
                    value={[max]}
                    onValueChange={(v) => setMax(v[0] ?? 10000)}
                  />
                </div>
              </aside>
              <div>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((p, idx) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPieceId(p.id);
                        document.getElementById("ficha-curatorial")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={cn(
                        "cursor-pointer rounded-2xl transition-all",
                        selectedPiece.id === p.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                    >
                      <PieceCard
                        piece={p}
                        index={idx}
                        action={
                          <div className="flex w-full flex-col gap-1.5">
                            <CodiButton piece={p} primary className="w-full" />
                          </div>
                        }
                      />
                    </div>
                  ))}
                  {list.length === 0 && (
                    <p className="text-muted-foreground">
                      {t("No hay piezas con estos filtros.")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-10">
          <SectionTitle
            eyebrow={t("Para diseñadores, moda y arquitectura")}
            title={t("Patrones y Expresiones Culturales Tradicionales Registradas")}
            sub={t(
              "Usa un diseño tradicional de forma legal y ética: el consentimiento comunitario y las regalías quedan grabados en un contrato Soroban.",
            )}
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {patterns.map((p) => (
              <article
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-float sm:flex-row"
              >
                <img
                  src={p.image}
                  alt={t(p.name)}
                  loading="lazy"
                  className="aspect-video w-full object-cover sm:aspect-auto sm:w-44"
                />
                <div className="flex flex-1 flex-col p-5">
                  <StellarBadge label={`ECT · ${p.id}`} className="self-start" />
                  <h3 className="mt-3 text-xl font-semibold">{t(p.name)}</h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {p.community}
                  </p>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {t(p.description)}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm">
                      {t("Regalía sugerida")} <b>{p.royalty}%</b>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setLic(p);
                        setRoyalty(p.royalty);
                      }}
                    >
                      <FileSignature />
                      {t("Solicitar licencia")}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!lic} onOpenChange={(o) => !o && setLic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {t("Solicitud de licencia")}
            </DialogTitle>
            <DialogDescription>
              {t(lic?.name)} · {lic?.community}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold">
                {t("Modalidad de Licencia Artesanal y Expresión Cultural")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {artisanLicenseTypes.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setUse(item.name)}
                    className={cn(
                      "flex flex-col text-left rounded-xl border p-3 transition-colors",
                      use === item.name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-sand/60 text-foreground",
                    )}
                  >
                    <span className="text-xs font-semibold">{t(item.name)}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {t(item.description)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">
                {t("Regalías automáticas para la comunidad:")}{" "}
                <span className="text-primary">{royalty}%</span>
              </p>
              <Slider
                min={5}
                max={25}
                step={1}
                value={[royalty]}
                onValueChange={(v) => setRoyalty(v[0] ?? 12)}
              />
            </div>
            <div className="space-y-2 rounded-lg bg-sand p-3 font-mono text-xs text-muted-foreground">
              <p className="break-all">
                record_rights_event(work_id=&quot;{lic?.id}&quot;, type=&quot;license&quot;,
                terms=&quot;{artisanLicenseTypes.find((l) => l.name === use)?.termsName ?? use} ({royalty}%)&quot;)
              </p>
              <a
                href={getContractExplorerUrl(contractId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary underline"
              >
                Soroban: {contractId.slice(0, 10)}…{contractId.slice(-6)}{" "}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void sign()}
              disabled={signing}
              className="w-full"
            >
              {signing ? <Loader2 className="animate-spin" /> : <FileSignature />}{" "}
              {t("Firmar contrato en Soroban")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chips({
  title,
  items,
  value,
  onChange,
}: {
  title: string;
  items: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{t(title)}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Button
            key={i}
            variant={value === i ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(value === i ? null : i)}
            className="rounded-full text-xs"
          >
            {t(i)}
          </Button>
        ))}
      </div>
    </div>
  );
}
