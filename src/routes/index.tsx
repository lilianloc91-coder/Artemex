import { useI18n } from "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Eye, Fingerprint, Map, MapPin, QrCode, Shapes, Store, Users, CalendarDays, HandCoins, ShieldCheck, Sparkles, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieceCard } from "@/components/toltek/ui";
import { images, pieces, type Piece } from "@/lib/toltek";
import heroValle from "@/assets/landing-hero-photo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Tlamatik — Cada pieza, su historia" },
      { name: "description", content: "Pasaportes culturales físico-digitales en Stellar: conoce quién hizo cada pieza artesanal, su comunidad, su técnica y su origen." },
      { property: "og:title", content: "Tlamatik — Cada pieza, su historia" },
      { property: "og:description", content: "Artesanía, comunidades y saberes de México con pasaporte verificable y comercio justo." },
    ],
  }),
  component: Index,
});

const byId = (id: string) => pieces.find((p) => p.id === id);
const starters = ["TK-0701", "TK-0512", "TK-0702"].map(byId).filter((p): p is Piece => Boolean(p));
const thread = byId("TK-0702") ?? pieces[0];

const routes = [
  { n: "01", title: "Regiones", text: "Mapa interactivo de territorios y sus oficios.", to: "/regiones", icon: Map },
  { n: "02", title: "Comunidades", text: "Micrositios con historias, saberes y obras de cada comunidad.", to: "/regiones", icon: Users },
  { n: "03", title: "Verificar", text: "Consulta el pasaporte de cualquier pieza desde su código QR.", to: "/verificar", icon: QrCode },
  { n: "04", title: "Mercado", text: "Obras con pasaporte activo y pago directo al taller.", to: "/mercado", icon: Store },
] as const;

const modes = [
  { label: "Comparte su historia", icon: BookOpen },
  { label: "Muestra sus obras", icon: Eye },
  { label: "Ofrece piezas en Tlamatik", icon: Store },
  { label: "Vende en un punto propio", icon: MapPin },
  { label: "Talleres programados", icon: CalendarDays },
];

const promises = [
  { title: "Cada comunidad decide qué comparte", text: "Saberes, ubicación, fotografías y venta solo si se autorizan.", icon: Users },
  { title: "El precio lo decide quien hace la pieza", text: "Liquidación directa en $MXN a la cuenta del taller.", icon: HandCoins },
  { title: "Registro verificable en Stellar", text: "Cada pasaporte guarda un hash inmutable consultable por cualquiera.", icon: ShieldCheck },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{children}</p>;
}

function Index() {
  const { t } = useI18n();
  return (
    <div className="pb-16">
      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden">
        <img src={heroValle} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-12 md:py-24">
          <div className="min-w-0 space-y-5 md:col-span-7">
            <Eyebrow>{t("Artesanía, comunidades y saberes de México")}</Eyebrow>
            <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t("Cada pieza, su historia")}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("Detrás de cada obra hay una persona, un oficio y una comunidad que decide cómo compartirlos.")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" variant="outline" className="rounded-full bg-background/70">
                <Link to="/regiones">{t("Conocer comunidades")}</Link>
              </Button>
            </div>
          </div>
          {thread && (
            <div className="min-w-0 md:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
                <img src={thread.image} alt={thread.title} className="aspect-[4/3] w-full bg-[var(--craft-photo)] object-cover" />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg text-foreground">{t(thread.title)}</p>
                    <p className="truncate text-xs text-muted-foreground">{thread.community} · {t(thread.technique)}</p>
                  </div>
                  <QrCode className="h-6 w-6 shrink-0 text-primary" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 pt-16 sm:px-6">
        {/* Quiénes somos */}
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <Eyebrow>{t("Quiénes somos")}</Eyebrow>
            <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
              {t("Un espacio cultural para conocer la artesanía desde quienes la hacen")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("Tlamatik reúne regiones, comunidades, saberes y piezas en un mismo recorrido. Cada pieza lleva un pasaporte con código QR que abre la historia que su autora o autor decidió compartir.")}
            </p>
          </div>
          <ul className="space-y-3">
            {promises.map((p) => (
              <li key={p.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary"><p.icon className="h-5 w-5 text-primary" /></span>
                <div>
                  <p className="font-semibold text-foreground">{t(p.title)}</p>
                  <p className="text-sm text-muted-foreground">{t(p.text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Tres piezas */}
        <section className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{t("Para empezar")}</Eyebrow>
              <h2 className="font-serif text-3xl tracking-tight text-foreground">{t("Tres piezas, tres historias")}</h2>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/mercado">{t("Explorar todo el catálogo")} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {starters.map((p, i) => <PieceCard key={p.id} piece={p} index={i} />)}
          </div>
        </section>

        {/* El hilo de una pieza */}
        {thread && (
          <section className="rounded-3xl bg-secondary/60 p-6 sm:p-10">
            <Eyebrow>{t("El hilo de una pieza")}</Eyebrow>
            <h2 className="font-serif text-3xl tracking-tight text-foreground">{t("Una pieza no está sola")}</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-4">
              {[
                { icon: Shapes, k: "La pieza", v: t(thread.title) },
                { icon: Fingerprint, k: "Quién la hizo", v: thread.artisan },
                { icon: Landmark, k: "Su comunidad", v: thread.regionDetail ?? thread.community },
                { icon: Sparkles, k: "El saber que la sostiene", v: thread.techniqueDetail ?? t(thread.technique) },
              ].map((s, i) => (
                <li key={s.k} className="relative rounded-2xl border border-border bg-card p-5">
                  <span className="absolute right-4 top-3 font-serif text-3xl text-primary/15">{i + 1}</span>
                  <s.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(s.k)}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{s.v}</p>
                </li>
              ))}
            </ol>
            <Link to="/verificar" search={{ id: thread.id }} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("Ver el pasaporte completo")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}

        {/* Recorridos */}
        <section className="space-y-8">
          <div>
            <Eyebrow>{t("Explora")}</Eyebrow>
            <h2 className="font-serif text-3xl tracking-tight text-foreground">{t("Recorridos para empezar")}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {routes.map((r) => (
              <Link key={r.n} to={r.to} className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-2xl text-primary/40">{r.n}</span>
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-4 font-serif text-xl text-foreground">{t(r.title)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(r.text)}</p>
                <ArrowRight className="mt-4 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

        {/* Formas de participar */}
        <section className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{t("Cada comunidad decide cómo participar")}</p>
          <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">{t("Ninguna forma es mejor que otra")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-85">
            {t("Algunas comparten solo su historia; otras muestran sus obras, venden en lugares que eligieron o abren talleres en fechas fijas.")}
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {modes.map((m) => (
              <li key={m.label} className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-2 text-sm">
                <m.icon className="h-4 w-4" /> {t(m.label)}
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
