import { useI18n } from "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  FilePlus2,
  Printer,
  QrCode as QrIcon,
  UserPlus,
  Users,
  Package,
  Coins,
  Download,
  Landmark,
  CheckCircle2,
  BadgeCheck,
  ExternalLink,
  Webhook,
  Loader2,
  BookOpen,
  Pencil,
  Lock,
  Anchor,
  Search,
  ShieldCheck,
  Clock,
  ShoppingBag,
  Camera,
  Images,
  Upload,
  Sparkles,
  MapPin,
  UserRound,
  Check,
  RotateCcw,
  Compass,
  ArrowLeft,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QrCode, StellarBadge } from "@/components/toltek/ui";
import {
  artisans as seed,
  contractId,
  pieces as seedPieces,
  sampleHash,
  type Artisan,
  type Piece,
} from "@/lib/toltek";
import { cn } from "@/lib/utils";
import { PromoterRegistration } from "@/components/toltek/PromoterRegistration";
import { useAccount } from "@/components/toltek/AuthProvider";
import { profileOptions } from "@/lib/promoter-profile";
import { hashArtisanBanking } from "@/lib/artisan-banking";
import {
  listAllCatalogPieces,
  listAllRegisteredWorks,
  saveWorkAndInitialEvents,
  updateUnanchoredWork,
  type RegisteredWorkSummary,
} from "@/lib/authory-service";
import { computeDossierSha256 } from "@/lib/stellar/client-crypto";
import { registerWorkServerFn } from "@/lib/stellar/soroban.functions";
import { getContractExplorerUrl, getTxExplorerUrl } from "@/lib/stellar/config";
import {
  dispatchSignedPeyWebhookServerFn,
  readSpeiSettlements,
  saveSpeiSettlement,
  type SpeiSettlementItem,
} from "@/lib/pey/pey.functions";

export const Route = createFileRoute("/_authenticated/panel")({
  ssr: false,
  loader: ({ context }) => {
    if (!context?.user?.id) return null;
    return context.queryClient
      .ensureQueryData(profileOptions(context.user.id))
      .catch(() => null);
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Panel del Promotor Cultural — Tlamatik" },
      {
        name: "description",
        content:
          "Gestiona artesanos, obras catalogadas y kits QR de tu cooperativa.",
      },
      { property: "og:title", content: "Panel del Promotor y Cooperativa — Tlamatik" },
      {
        property: "og:description",
        content:
          "Métricas, catálogo de artesanos e impresión de Pasaportes Culturales.",
      },
    ],
  }),
  component: Panel,
});

type Tab =
  | "registro"
  | "obras"
  | "resumen"
  | "artesanos"
  | "kits"
  | "liquidaciones";

type WorkFilter = "all" | "editable" | "anchored" | "sold";

const REGION_OPTIONS: Piece["region"][] = [
  "Oaxaca",
  "Chiapas",
  "Jalisco",
  "Michoacán",
  "Guerrero",
  "Puebla",
];

const TECHNIQUE_OPTIONS: Piece["technique"][] = [
  "Textil",
  "Cerámica",
  "Talla en Madera",
  "Filigrana",
  "Laca",
];

const ARTISAN_TECHNIQUE_PILLS = [
  "Talla en Madera / Copal",
  "Textil y Telar de Cintura",
  "Alfarería y Barro Negro",
  "Filigrana en Plata",
  "Laca y Maque de Olinalá",
  "Cerámica Mayólica",
  "Cobre Martillado",
];

function getArtisanInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MA";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] ?? "") + (parts[1]![0] ?? "")).toUpperCase();
}

const seedLiquidaciones: SpeiSettlementItem[] = [
  {
    artisan: "Miriam Nava",
    piece: "TK-0512 · El Guardián del Monte: Tecuani de Acatlán",
    amount: "$1.00 MXN",
    date: "08 nov 2026",
    clave: "2026110840012000000000512",
    codiQrId: "35a13c0512",
  },
  {
    artisan: "Don Miguel Aguilar",
    piece: "TK-0042 · Alebrije Jaguar Nahual",
    amount: "$8,472.80 MXN",
    date: "07 nov 2026",
    clave: "2026110740014000009876543",
  },
  {
    artisan: "Doña Rosa Real",
    piece: "TK-0117 · Cántaro de Barro Negro",
    amount: "$3,284.40 MXN",
    date: "02 nov 2026",
    clave: "2026110240014000008765432",
  },
  {
    artisan: "Petrona Gómez",
    piece: "TK-0203 · Huipil de Telar de Cintura",
    amount: "$5,902.40 MXN",
    date: "28 oct 2026",
    clave: "2026102840014000007654321",
  },
];

function Panel() {
  const { t, money } = useI18n();
  const { user } = useAccount();
  const [tab, setTab] = useState<Tab>("registro");
  const [list, setList] = useState<Artisan[]>(seed);
  const [catalogPieces, setCatalogPieces] = useState<Piece[]>(seedPieces);
  const [registeredWorks, setRegisteredWorks] = useState<RegisteredWorkSummary[]>([]);
  const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
  const [workSearch, setWorkSearch] = useState("");
  const [editingWork, setEditingWork] = useState<RegisteredWorkSummary | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    artisan: "",
    promoterName: "",
    community: "",
    region: "Oaxaca" as Piece["region"],
    technique: "Talla en Madera" as Piece["technique"],
    materials: "",
    dimensions: "",
    priceMxn: "",
    description: "",
  });
  const [savingWork, setSavingWork] = useState(false);
  const [anchoringId, setAnchoringId] = useState<string | null>(null);
  const [liquidaciones, setLiquidaciones] = useState<SpeiSettlementItem[]>(seedLiquidaciones);
  const [artisanSubTab, setArtisanSubTab] = useState<"catalogo" | "formulario">("catalogo");
  const [editingArtisan, setEditingArtisan] = useState<Artisan | null>(null);
  const [form, setForm] = useState({
    name: "",
    technique: "",
    location: "",
    years: "",
    materials: "",
    bio: "",
    photo: "",
    bank: "",
    account: "",
    clabe: "",
  });

  const resetArtisanForm = () => {
    setForm({
      name: "",
      technique: "",
      location: "",
      years: "",
      materials: "",
      bio: "",
      photo: "",
      bank: "",
      account: "",
      clabe: "",
    });
  };

  const startNewArtisan = () => {
    setEditingArtisan(null);
    resetArtisanForm();
    setArtisanSubTab("formulario");
  };

  const startEditingArtisan = (artisan: Artisan) => {
    setEditingArtisan(artisan);
    setForm({
      name: artisan.name,
      technique: artisan.technique,
      location: artisan.location,
      years: "",
      materials: "",
      bio: artisan.bio || "",
      photo: artisan.photo || "",
      bank: "",
      account: "",
      clabe: "",
    });
    setArtisanSubTab("formulario");
  };
  const [adding, setAdding] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const handleArtisanPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, photo: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const tecuani = seedPieces[0]!;
      const totalMxn =
        tecuani.priceMxn +
        (tecuani.certFeeMxn ?? 0) +
        (tecuani.shippingMxn ?? 0);
      const res = await dispatchSignedPeyWebhookServerFn({
        data: {
          eventType: "codi.qr.payment_received",
          pieceId: tecuani.id,
          title: tecuani.title,
          artisan: tecuani.artisan,
          amountMxn: totalMxn,
          numRef: "0512",
        },
      });
      const netMxn = res.netArtisanMxn.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      saveSpeiSettlement({
        artisan: res.artisan,
        piece: `${res.pieceId} · ${res.pieceTitle}`,
        amount: `$${netMxn} MXN`,
        date: "08 nov 2026",
        clave: res.trackingKey,
        codiQrId: res.codiQrId,
        peyTransactionId: res.transactionId,
        stellarTxHash: res.sorobanTxHash,
        webhookEventType: res.eventType,
      });
      setLiquidaciones(readSpeiSettlements(seedLiquidaciones));
      toast.success(t("Webhook de pey.mx procesado"), {
        description: `${res.eventType} · ${res.pieceId} · CEP ${res.trackingKey}`,
      });
    } catch {
      toast.error(t("No se pudo procesar el webhook de prueba"));
    } finally {
      setTestingWebhook(false);
    }
  };

  const refreshWorks = async () => {
    const [catalog, registered] = await Promise.all([
      listAllCatalogPieces(),
      listAllRegisteredWorks(),
    ]);
    if (catalog.length > 0) setCatalogPieces(catalog);
    setRegisteredWorks(registered);
  };

  useEffect(() => {
    let active = true;
    setLiquidaciones(readSpeiSettlements(seedLiquidaciones));
    Promise.all([listAllCatalogPieces(), listAllRegisteredWorks()]).then(
      ([allCatalog, allRegistered]) => {
        if (!active) return;
        if (allCatalog.length > 0) setCatalogPieces(allCatalog);
        setRegisteredWorks(allRegistered);
      },
    );
    return () => {
      active = false;
    };
  }, [tab]);

  const openEditWork = (item: RegisteredWorkSummary) => {
    if (item.anchoredOnChain) {
      toast.error(t("Obra inmutable en blockchain"), {
        description: t(
          "Esta pieza ya fue anclada en Stellar Soroban y no puede modificarse.",
        ),
      });
      return;
    }
    setEditingWork(item);
    setEditForm({
      title: item.work.title,
      artisan: item.work.artisan,
      promoterName:
        item.work.promoterName || user?.displayName || user?.username || "",
      community: item.work.community,
      region: item.work.region,
      technique: item.work.technique,
      materials: item.work.materials,
      dimensions: item.work.dimensions ?? "",
      priceMxn: String(item.work.priceMxn || ""),
      description: item.work.description,
    });
  };

  const saveWorkEdits = async () => {
    if (!editingWork) return;
    if (!editForm.title.trim() || !editForm.artisan.trim()) {
      toast.error(t("Completa al menos el título y el artesano de la obra"));
      return;
    }
    setSavingWork(true);
    try {
      const updatedHash = await computeDossierSha256(
        {
          title: editForm.title.trim(),
          artisan: editForm.artisan.trim(),
          category: editForm.technique,
          technique: editForm.description.trim(),
          materials: editForm.materials.trim(),
          priceMxn: editForm.priceMxn.trim(),
        },
        [],
      );
      await updateUnanchoredWork(editingWork.work.id, {
        title: editForm.title,
        artisan: editForm.artisan,
        promoterName: editForm.promoterName,
        community: editForm.community,
        region: editForm.region,
        technique: editForm.technique,
        materials: editForm.materials,
        dimensions: editForm.dimensions,
        priceMxn: Number(editForm.priceMxn) || editingWork.work.priceMxn,
        description: editForm.description,
        hash: updatedHash,
      });
      await refreshWorks();
      setEditingWork(null);
      toast.success(t("Obra actualizada correctamente"));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? t(err.message)
          : t("No se pudo actualizar la obra"),
      );
    } finally {
      setSavingWork(false);
    }
  };

  const anchorWorkNow = async (item: RegisteredWorkSummary) => {
    if (item.anchoredOnChain) return;
    setAnchoringId(item.work.id);
    try {
      const sorobanRes = await registerWorkServerFn({
        data: {
          workId: item.work.id,
          hash: item.work.hash,
          author: item.work.artisan || item.work.author,
        },
      });
      await saveWorkAndInitialEvents({
        ...item.work,
        status: "verified",
        stellarTransactionId: sorobanRes.txHash,
        registeredAt: sorobanRes.timestampIso || new Date().toISOString(),
      });
      await refreshWorks();
      toast.success(t("Obra anclada en Stellar Soroban"), {
        description: `${item.work.id} · Tx ${sorobanRes.txHash.slice(0, 10)}…`,
      });
    } catch {
      toast.error(t("No se pudo completar el anclaje en Stellar Testnet"));
    } finally {
      setAnchoringId(null);
    }
  };

  const nav = [
    { id: "registro" as const, label: "Registro del Promotor", icon: BadgeCheck },
    { id: "artesanos" as const, label: "Catálogo de Artesanos", icon: Users },
    { id: "obras" as const, label: "Registro de Obras", icon: BookOpen },
    { id: "kits" as const, label: "Kits Phygital QR", icon: QrIcon },
    { id: "liquidaciones" as const, label: "Liquidaciones SPEI", icon: Landmark },
    { id: "resumen" as const, label: "Resumen / Métricas", icon: BarChart3 },
  ];

  const add = async () => {
    if (!form.name.trim()) {
      toast.error(t("Escribe el nombre del artesano"));
      return;
    }
    setAdding(true);
    try {
      const bankingHashes = await hashArtisanBanking({
        bank: form.bank,
        account: form.account,
        clabe: form.clabe,
      });
      const initials = getArtisanInitials(form.name);

      if (editingArtisan) {
        setList((previous) =>
          previous.map((a) => {
            if (a.name === editingArtisan.name) {
              return {
                ...a,
                name: form.name.trim(),
                technique: form.technique.trim() || a.technique,
                location: form.location.trim() || a.location,
                bio: form.bio.trim() || undefined,
                photo: form.photo || a.photo,
                initials,
                bankingHashes: bankingHashes || a.bankingHashes,
              };
            }
            return a;
          }),
        );
        toast.success(t("Información del artesano actualizada"), {
          description: `${form.name.trim()} · ${form.technique.trim()}`,
        });
      } else {
        const newArtisan: Artisan = {
          name: form.name.trim(),
          technique: form.technique.trim() || "Artesanía Tradicional",
          location: form.location.trim() || "Oaxaca, México",
          bio: form.bio.trim() || undefined,
          photo: form.photo || undefined,
          bankingHashes,
          status: "Verificada",
          pieces: 0,
          usdc: 0,
          initials,
        };
        setList((previous) => [newArtisan, ...previous]);
        toast.success(t("Maestro artesano registrado en el Padrón"), {
          description: `${newArtisan.name} · ${newArtisan.technique}`,
        });
      }

      setEditingArtisan(null);
      resetArtisanForm();
      setArtisanSubTab("catalogo");
    } catch {
      toast.error(
        t("No se pudo proteger la información bancaria. Inténtalo de nuevo."),
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside aria-label={t("Panel del Promotor")} className="flex gap-2 overflow-x-auto border-b border-border bg-background py-3 text-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:sticky lg:top-24 lg:flex-col lg:self-start lg:border-b-0 lg:border-r lg:pr-5">
        <h1 className="hidden px-3 pb-3 text-2xl font-normal lg:block">{t("Panel del Promotor")}</h1>
        <p className="hidden px-3 pb-4 text-xs text-muted-foreground lg:block">
          Cooperativa Guelaguetza
        </p>
        {nav.map((n) => (
          <Button
            key={n.id}
            variant="ghost"
            onClick={() => setTab(n.id)}
            aria-pressed={tab === n.id}
            className={cn(
              "h-auto shrink-0 justify-start gap-2.5 whitespace-nowrap rounded-md px-3 py-3 text-left text-sm font-medium lg:w-full",
              tab === n.id
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            <span>{t(n.label)}</span>
          </Button>
        ))}
      </aside>

      <section className="min-w-0 space-y-6">
        {tab === "registro" && <PromoterRegistration />}
        {tab === "obras" && (() => {
          const totalCount = registeredWorks.length;
          const editableCount = registeredWorks.filter((w) => !w.anchoredOnChain).length;
          const anchoredCount = registeredWorks.filter((w) => w.anchoredOnChain).length;
          const commercialCount = registeredWorks.filter(
            (w) => w.saleStatus === "sold" || w.saleStatus === "licensed",
          ).length;

          const q = workSearch.trim().toLowerCase();
          const filteredWorks = registeredWorks.filter((item) => {
            if (workFilter === "editable" && item.anchoredOnChain) return false;
            if (workFilter === "anchored" && !item.anchoredOnChain) return false;
            if (
              workFilter === "sold" &&
              item.saleStatus !== "sold" &&
              item.saleStatus !== "licensed"
            ) {
              return false;
            }
            if (!q) return true;
            return (
              item.work.id.toLowerCase().includes(q) ||
              item.work.title.toLowerCase().includes(q) ||
              item.work.artisan.toLowerCase().includes(q) ||
              item.work.community.toLowerCase().includes(q) ||
              item.work.region.toLowerCase().includes(q) ||
              item.work.technique.toLowerCase().includes(q)
            );
          });

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Obras registradas",
                    value: String(totalCount),
                    icon: BookOpen,
                    tone: "text-primary",
                  },
                  {
                    label: "Pendientes de anclaje (Editables)",
                    value: String(editableCount),
                    icon: Clock,
                    tone: "text-amber-700",
                  },
                  {
                    label: "Ancladas en Stellar Soroban",
                    value: String(anchoredCount),
                    icon: ShieldCheck,
                    tone: "text-jade",
                  },
                  {
                    label: "Vendidas o licenciadas",
                    value: String(commercialCount),
                    icon: ShoppingBag,
                    tone: "text-indigo",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border bg-card p-5 shadow-float"
                  >
                    <stat.icon className={cn("h-5 w-5", stat.tone)} />
                    <p className="mt-3 font-serif text-3xl font-semibold">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(stat.label)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-float">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {t("Catálogo de Obras Registradas")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(
                        "Consulta el estado de registro, anclaje en Stellar Soroban y venta. Las piezas sin anclar pueden editarse antes de quedar inmutables en blockchain.",
                      )}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/registrar">
                      <FilePlus2 />
                      {t("Registrar nueva obra")}
                    </Link>
                  </Button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "all", label: "Todas" },
                        { id: "editable", label: "Sin anclar (Editables)" },
                        { id: "anchored", label: "Ancladas en Blockchain" },
                        { id: "sold", label: "Vendidas / Licenciadas" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setWorkFilter(f.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          workFilter === f.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-sand",
                        )}
                      >
                        {t(f.label)}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={workSearch}
                      onChange={(e) => setWorkSearch(e.target.value)}
                      placeholder={t("Buscar por ID, título o artesano…")}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {filteredWorks.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-sand/40 p-10 text-center">
                      <p className="font-medium">
                        {t("No hay obras que coincidan con el filtro seleccionado")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("Prueba otro filtro o registra una nueva pieza en la plataforma.")}
                      </p>
                    </div>
                  ) : (
                    filteredWorks.map((item) => {
                      const w = item.work;
                      const isAnchoring = anchoringId === w.id;
                      const saleMeta = {
                        draft: {
                          label: "En preparación (No publicada)",
                          className:
                            "border-amber-500/30 bg-amber-500/10 text-amber-800",
                        },
                        available: {
                          label: "Disponible en Mercado Ético",
                          className: "border-primary/25 bg-primary/10 text-primary",
                        },
                        licensed: {
                          label: "Licenciada B2B",
                          className: "border-indigo/30 bg-indigo/10 text-indigo",
                        },
                        sold: {
                          label: "Vendida · Liquidada SPEI",
                          className: "border-jade/30 bg-jade/15 text-jade",
                        },
                      }[item.saleStatus];

                      return (
                        <article
                          key={w.id}
                          className="rounded-xl border bg-background p-4 transition-shadow hover:shadow-sm sm:p-5"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <img
                                src={item.image}
                                alt={w.title}
                                className="h-24 w-24 shrink-0 rounded-xl border object-cover"
                              />
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-sand px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                                    {w.id}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                      item.anchoredOnChain
                                        ? "border-jade/30 bg-jade/15 text-jade"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-800",
                                    )}
                                  >
                                    {item.anchoredOnChain ? (
                                      <>
                                        <ShieldCheck className="h-3 w-3" />
                                        {t("Anclada en Blockchain")}
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3 w-3" />
                                        {t("Registrada · Sin anclar en blockchain")}
                                      </>
                                    )}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                      saleMeta.className,
                                    )}
                                  >
                                    {t(saleMeta.label)}
                                  </span>
                                </div>

                                <h3 className="font-serif text-lg font-semibold leading-snug">
                                  {w.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  <strong className="font-medium text-foreground">
                                    {w.artisan}
                                  </strong>{" "}
                                  · {w.community}, {t(w.region)} · {t(w.technique)}
                                </p>
                                {w.promoterName && (
                                  <p className="text-xs text-muted-foreground">
                                    {t("Promotor responsable")}:{" "}
                                    <span className="font-medium text-foreground">
                                      {w.promoterName}
                                    </span>
                                  </p>
                                )}
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {w.materials ? `${t("Materiales")}: ${w.materials}` : w.description}
                                  {w.dimensions ? ` · ${w.dimensions}` : ""}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
                                  <span className="font-semibold text-foreground">
                                    {money(w.priceMxn)}
                                  </span>
                                  <span className="font-mono">
                                    SHA-256: {w.hash.slice(0, 12)}…{w.hash.slice(-6)}
                                  </span>
                                  {item.anchoredOnChain && w.stellarTransactionId && (
                                    <a
                                      href={getTxExplorerUrl(w.stellarTransactionId)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                                    >
                                      Tx {w.stellarTransactionId.slice(0, 8)}…
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  {item.settlementTrackingKey && (
                                    <span className="font-mono text-jade">
                                      CEP {item.settlementTrackingKey}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                              {!item.anchoredOnChain ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditWork(item)}
                                    disabled={isAnchoring}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t("Editar información")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => void anchorWorkNow(item)}
                                    disabled={isAnchoring}
                                  >
                                    {isAnchoring ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        {t("Anclando…")}
                                      </>
                                    ) : (
                                      <>
                                        <Anchor className="h-3.5 w-3.5" />
                                        {t("Anclar en Blockchain")}
                                      </>
                                    )}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span
                                    title={t(
                                      "Esta pieza ya fue anclada en Stellar Soroban y es inmutable.",
                                    )}
                                    className="inline-flex items-center gap-1.5 rounded-lg border bg-sand/70 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                    {t("Edición bloqueada (Inmutable)")}
                                  </span>
                                  <Button asChild size="sm" variant="outline">
                                    <Link to="/verificar" search={{ id: w.id }}>
                                      {t("Ver pasaporte →")}
                                    </Link>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {tab === "resumen" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Artesanos apadrinados",
                  value: String(list.length + 18),
                  icon: Users,
                },
                {
                  label: "Piezas catalogadas",
                  value: String(136 + catalogPieces.length),
                  icon: Package,
                },
                {
                  label: "Recibido para la comunidad",
                  value: "$83,420 MXN",
                  icon: Coins,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border bg-card p-5 shadow-float"
                >
                  <m.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-serif text-3xl font-semibold">{m.value}</p>
                  <p className="text-sm text-muted-foreground">{t(m.label)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-float">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    {t("Resumen y Métricas de la Cooperativa")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "Monitoreo de trazabilidad cultural, dispersión directa SPEI y pasaportes anclados en Stellar Soroban.",
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setTab("artesanos")}>
                    <Users className="h-4 w-4" />
                    {t("Ver artesanos")}
                  </Button>
                  <Button size="sm" onClick={() => setTab("obras")}>
                    <BookOpen className="h-4 w-4" />
                    {t("Ver obras")}
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-sand/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("Dispersión Directa")}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-bold text-jade">95.2%</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Sin intermediarios, vía SPEI / CoDi® Banxico.")}
                  </p>
                </div>
                <div className="rounded-xl border bg-sand/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("Obras Inmutables")}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-bold text-primary">
                    {catalogPieces.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Con hash SHA-256 en Stellar Soroban.")}
                  </p>
                </div>
                <div className="rounded-xl border bg-sand/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("Comunidades Activas")}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-bold text-gold">6</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Oaxaca, Puebla, Chiapas, Michoacán, Guerrero.")}
                  </p>
                </div>
                <div className="rounded-xl border bg-sand/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("Liquidaciones SPEI")}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-bold text-indigo">
                    {liquidaciones.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Comprobantes con clave de rastreo Banxico.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "artesanos" && (
          <div className="space-y-6">
            {/* Barra superior de navegación interna (sin modales) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-serif text-base font-semibold">
                    {t("Padrón de Maestros y Artesanos")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {artisanSubTab === "formulario"
                      ? editingArtisan
                        ? t("Editando información de {name}", { name: editingArtisan.name })
                        : t("Formulario de registro y credencialización comunitaria")
                      : t("Directorio registrado · {count} maestros activos", {
                          count: list.length,
                        })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={artisanSubTab === "catalogo" ? "default" : "ghost"}
                  onClick={() => {
                    setEditingArtisan(null);
                    setArtisanSubTab("catalogo");
                  }}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t("Listado de Artesanos")} ({list.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={artisanSubTab === "formulario" ? "default" : "ghost"}
                  onClick={startNewArtisan}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {editingArtisan ? t("Editar Artesano") : t("Agregar Artesano")}
                </Button>
              </div>
            </div>

            {/* VISTA 1: Formulario Completo de Registro / Edición */}
            {artisanSubTab === "formulario" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingArtisan(null);
                      setArtisanSubTab("catalogo");
                    }}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("Volver al Listado de Artesanos")}
                  </Button>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {editingArtisan ? t("Modo Edición") : t("Nuevo Registro")}
                  </span>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                  {/* Formulario Principal */}
                  <div className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-float">
                    <div className="greca" />
                    <div className="talavera-bg border-b p-6 sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo text-gold shadow-float">
                            <UserRound className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                              {t("Padrón Cultural · Stellar Soroban")}
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
                              {editingArtisan
                                ? t("Editar Maestro Artesano")
                                : t("Registro de Maestro Artesano")}
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                              {editingArtisan
                                ? t(
                                    "Modifica la información, semblanza cultural y datos del maestro artesano {name}.",
                                    { name: editingArtisan.name },
                                  )
                                : t(
                                    "Registra la identidad, saberes ancestrales, linaje y datos protegidos de liquidación del maestro artesano.",
                                  )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border bg-card/90 px-3.5 py-1.5 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-jade" />
                          <span>{editingArtisan ? t("Actualizando Padrón") : t("Padrón Tlamatik")}</span>
                        </div>
                      </div>
                    </div>

                  <div className="space-y-6 p-6 sm:p-8">
                    {/* Sección 1: Identidad y Fotografía */}
                    <fieldset className="rounded-xl border bg-background/40 p-5 sm:p-6">
                      <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <UserRound className="h-3.5 w-3.5" />
                        {t("Identidad del Maestro Artesano")}
                      </legend>

                      <div className="mt-2 grid items-center gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
                        <label className="group flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-dashed border-primary/35 bg-sand/40 p-4 text-center transition-colors hover:border-primary hover:bg-sand/70">
                          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-card shadow-float transition-transform group-hover:scale-[1.02]">
                            {form.photo ? (
                              <img
                                src={form.photo}
                                alt={form.name || t("Foto del artesano")}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Camera className="h-8 w-8 text-primary/60" />
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            <Upload className="h-3.5 w-3.5" />
                            {form.photo ? t("Cambiar foto") : t("Subir foto")}
                          </span>
                          <span className="text-center text-[11px] leading-relaxed text-muted-foreground">
                            {t("Rostro o retrato en taller · JPG/PNG")}
                          </span>
                          <input
                            aria-label={t("Foto del artesano")}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleArtisanPhoto}
                          />
                        </label>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="artisan-full-name">
                              {t("Nombre completo del maestro *")}
                            </Label>
                            <Input
                              id="artisan-full-name"
                              value={form.name}
                              onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                              }
                              placeholder={t("Ej. Don Miguel Aguilar / Doña Juana Gómez")}
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="artisan-comunidad">
                                {t("Comunidad y Estado *")}
                              </Label>
                              <Input
                                id="artisan-comunidad"
                                value={form.location}
                                onChange={(e) =>
                                  setForm({ ...form, location: e.target.value })
                                }
                                placeholder={t("Ej. San Antonio Arrazola, Oaxaca")}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="artisan-years">
                                {t("Años de experiencia / Linaje")}
                              </Label>
                              <Input
                                id="artisan-years"
                                value={form.years}
                                onChange={(e) =>
                                  setForm({ ...form, years: e.target.value })
                                }
                                placeholder={t("Ej. 35 años · 3ª generación familiar")}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="artisan-technique-input">
                              {t("Técnica ancestral principal *")}
                            </Label>
                            <Input
                              id="artisan-technique-input"
                              value={form.technique}
                              onChange={(e) =>
                                setForm({ ...form, technique: e.target.value })
                              }
                              placeholder={t("Ej. Talla en copal / Textil en telar de cintura")}
                            />

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ARTISAN_TECHNIQUE_PILLS.map((pill) => {
                                const selected = form.technique === pill;
                                return (
                                  <button
                                    key={pill}
                                    type="button"
                                    onClick={() =>
                                      setForm({ ...form, technique: pill })
                                    }
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                      selected
                                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                        : "border-primary/20 bg-background hover:bg-sand/60",
                                    )}
                                  >
                                    {selected && <Check className="mr-1 inline h-3 w-3" />}
                                    {t(pill)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    {/* Sección 2: Semblanza Cultural y Saberes */}
                    <fieldset className="rounded-xl border bg-background/40 p-5 sm:p-6">
                      <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <Compass className="h-3.5 w-3.5" />
                        {t("Semblanza Cultural y Saberes Ancestrales")}
                      </legend>

                      <div className="mt-2 space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="artisan-bio-area">
                            {t("Biografía y trayectoria del maestro")}
                          </Label>
                          <Textarea
                            id="artisan-bio-area"
                            rows={4}
                            value={form.bio}
                            onChange={(e) =>
                              setForm({ ...form, bio: e.target.value })
                            }
                            placeholder={t(
                              "Relata su historia de vida, linaje familiar, saberes heredados de sus abuelos, técnicas distintivas y reconocimientos comunitarios...",
                            )}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="artisan-materials-input">
                            {t("Materiales autóctonos predilectos")}
                          </Label>
                          <Input
                            id="artisan-materials-input"
                            value={form.materials}
                            onChange={(e) =>
                              setForm({ ...form, materials: e.target.value })
                            }
                            placeholder={t("Ej. Madera de copal, añil, grana cochinilla, barro negro")}
                          />
                        </div>
                      </div>
                    </fieldset>

                    {/* Sección 3: Liquidaciones SPEI y Datos Bancarios Protegidos */}
                    <fieldset className="rounded-xl border bg-background/40 p-5 sm:p-6">
                      <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                        <Landmark className="h-3.5 w-3.5" />
                        {t("Datos Bancarios para Liquidaciones SPEI (Protegidos con SHA-256)")}
                      </legend>

                      <div className="mt-2 space-y-4">
                        <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-sand/60 p-4 text-xs leading-relaxed text-muted-foreground">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-jade" />
                          <span>
                            {t(
                              "Por soberanía y seguridad del artesano, los datos bancarios no se exponen públicamente: solo se conservan hashes criptográficos SHA-256 con sal para liquidar directamente por SPEI / CoDi® sin comisiones intermediarias.",
                            )}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="artisan-bank-field">{t("Banco")}</Label>
                            <Input
                              id="artisan-bank-field"
                              value={form.bank}
                              onChange={(e) =>
                                setForm({ ...form, bank: e.target.value })
                              }
                              placeholder={t("BBVA, Banorte, Santander...")}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="artisan-account-field">{t("Cuenta")}</Label>
                            <Input
                              id="artisan-account-field"
                              inputMode="numeric"
                              value={form.account}
                              onChange={(e) =>
                                setForm({ ...form, account: e.target.value })
                              }
                              placeholder="1234567890"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="artisan-clabe-field">
                              {t("CLABE interbancaria (18 dígitos)")}
                            </Label>
                            <Input
                              id="artisan-clabe-field"
                              inputMode="numeric"
                              maxLength={18}
                              value={form.clabe}
                              onChange={(e) =>
                                setForm({ ...form, clabe: e.target.value })
                              }
                              placeholder="012180015355682429"
                            />
                          </div>
                        </div>
                      </div>
                    </fieldset>

                    {/* Botones de acción del formulario */}
                    <div className="flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingArtisan(null);
                            setArtisanSubTab("catalogo");
                          }}
                          disabled={adding}
                        >
                          <ArrowLeft className="h-4 w-4" />
                          {t("Volver al Listado")} ({list.length})
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={resetArtisanForm}
                          disabled={adding}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t("Limpiar")}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        size="lg"
                        disabled={adding}
                        onClick={() => void add()}
                      >
                        {adding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("Guardando…")}
                          </>
                        ) : editingArtisan ? (
                          <>
                            <Save className="h-4 w-4" />
                            {t("Guardar Cambios")}
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            {t("Guardar en el Padrón")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Vista Previa en Vivo (Pasaporte del Maestro Artesano) */}
                <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                  <div className="overflow-hidden rounded-2xl bg-indigo text-indigo-foreground shadow-float">
                    <div className="greca" />
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("Pasaporte Cultural")}
                        </span>
                        <span className="rounded-full bg-indigo-foreground/10 px-2 py-0.5 font-mono text-[10px] opacity-80">
                          {editingArtisan ? t("Editando") : t("Vista previa")}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3.5">
                        {form.photo ? (
                          <img
                            src={form.photo}
                            alt=""
                            aria-hidden="true"
                            className="h-14 w-14 shrink-0 rounded-full border-2 border-gold/60 object-cover shadow-sm"
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/40 bg-indigo-foreground/10 font-serif text-lg font-semibold text-gold">
                            {getArtisanInitials(form.name)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate font-serif text-lg font-semibold text-white">
                            {form.name.trim() || t("Nombre del Maestro")}
                          </h3>
                          <p className="truncate text-xs text-gold">
                            {form.technique ? t(form.technique) : t("Técnica ancestral")}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs opacity-75">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {form.location ? t(form.location) : t("Comunidad de origen")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 border-y border-indigo-foreground/15 py-3 text-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gold/80">
                            {t("Trayectoria")}
                          </p>
                          <p className="font-serif text-sm font-semibold">
                            {form.years ? form.years : t("Maestría")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gold/80">
                            {t("Piezas")}
                          </p>
                          <p className="font-serif text-sm font-semibold">
                            {editingArtisan ? `${editingArtisan.pieces} ${t("obras")}` : `0 ${t("obras")}`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-wider text-gold/80">
                          {t("Semblanza cultural")}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed opacity-85">
                          {form.bio.trim() ||
                            t(
                              "Semblanza del artesano, linaje familiar y preservación de saberes milenarios...",
                            )}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl border border-gold/20 bg-black/25 p-3">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-gold/80">
                          Stellar Soroban Registry
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] opacity-75">
                          {contractId.slice(0, 10)}…{contractId.slice(-8)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-jade">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{t("Liquidaciones directas SPEI / CoDi®")}</span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}

            {/* VISTA 2: Directorio de Artesanos y Métricas */}
            {artisanSubTab === "catalogo" && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Artesanos apadrinados",
                      value: String(list.length + 18),
                      icon: Users,
                    },
                    {
                      label: "Piezas catalogadas",
                      value: String(136 + catalogPieces.length),
                      icon: Package,
                    },
                    {
                      label: "Recibido para la comunidad",
                      value: "$83,420 MXN",
                      icon: Coins,
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-xl border bg-card p-5 shadow-float"
                    >
                      <m.icon className="h-5 w-5 text-primary" />
                      <p className="mt-3 font-serif text-3xl font-semibold">{m.value}</p>
                      <p className="text-sm text-muted-foreground">{t(m.label)}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border bg-card shadow-float">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                    <div>
                      <h2 className="text-xl font-semibold">{t("Catálogo de Artesanos")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "Directorio de maestros y maestras tradicionales, su biografía, fotografía y datos bancarios protegidos.",
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={startNewArtisan}
                      className="gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t("Agregar Nuevo Artesano")}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-sand text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="p-3">{t("Artesano")}</th>
                          <th className="p-3">{t("Biografía / Trayectoria")}</th>
                          <th className="p-3">{t("Técnica")}</th>
                          <th className="p-3">{t("Ubicación")}</th>
                          <th className="p-3">{t("Piezas")}</th>
                          <th className="p-3">{t("Ventas registradas")}</th>
                          <th className="p-3">{t("Estado")}</th>
                          {["Banco", "Cuenta", "CLABE interbancaria"].map((label) => (
                            <th key={label} className="p-3">
                              {t(label)}
                            </th>
                          ))}
                          <th className="p-3 text-right">{t("Acciones")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((a) => (
                          <tr key={a.name} className="border-t">
                            <td className="p-3">
                              <span className="flex items-center gap-3">
                                {a.photo ? (
                                  <img
                                    src={a.photo}
                                    alt={a.name}
                                    className="h-10 w-10 shrink-0 rounded-full border border-primary/25 object-cover shadow-xs"
                                  />
                                ) : (
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                    {a.initials}
                                  </span>
                                )}
                                <span className="font-medium whitespace-nowrap">{a.name}</span>
                              </span>
                            </td>
                            <td className="p-3 max-w-xs text-xs text-muted-foreground">
                              {a.bio ? (
                                <span className="line-clamp-2" title={a.bio}>
                                  {a.bio}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              {t(a.technique)}
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap">
                              {a.location}
                            </td>
                            <td className="p-3">{a.pieces}</td>
                            <td className="p-3 font-mono">{money(Math.round(a.usdc * 17.2))}</td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                                  a.status === "Verificada" && "bg-jade/15 text-jade",
                                  a.status === "Activa" &&
                                    "bg-gold/20 text-gold-foreground",
                                  a.status === "Pendiente KYC" &&
                                    "bg-primary/10 text-primary",
                                )}
                              >
                                {t(a.status)}
                              </span>
                            </td>
                            {(["bank", "account", "clabe"] as const).map((field) => (
                              <td
                                key={field}
                                className="p-3 font-mono text-xs text-muted-foreground"
                              >
                                <span
                                  className="block max-w-32 truncate"
                                  title={a.bankingHashes?.[field]}
                                >
                                  {a.bankingHashes?.[field] ?? "—"}
                                </span>
                              </td>
                            ))}
                            <td className="p-3 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingArtisan(a)}
                                className="h-8 gap-1.5 text-xs border-primary/25 hover:bg-primary/10"
                                title={t("Editar información del artesano")}
                              >
                                <Pencil className="h-3.5 w-3.5 text-primary" />
                                <span>{t("Editar")}</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "kits" && (
          <div className="rounded-xl border bg-card p-5 shadow-float">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t("Kits Phygital QR")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("Etiquetas listas para adjuntar a cada pieza física del taller.")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success(
                      t("PDF de {{count}} etiquetas generado", {
                        count: catalogPieces.length,
                      }),
                    )
                  }
                >
                  <Download /> PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast(t("Enviando a impresión masiva…"));
                    setTimeout(() => window.print(), 300);
                  }}
                >
                  <Printer />
                  {t("Imprimir lote")}
                </Button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {catalogPieces.map((p, i) => (
                <div
                  key={p.id}
                  className="rounded-xl border-2 border-dashed border-primary/30 bg-background p-4"
                >
                  <div className="greca mb-3" />
                  <div className="flex gap-3">
                    <QrCode
                      value={`https://tlamatik.vercel.app/verificar?id=${p.id}`}
                      size={88}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {t("PASAPORTE CULTURAL ·")} {p.id}
                      </p>
                      <p className="truncate font-serif font-semibold">
                        {t(p.title)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.artisan}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.community}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StellarBadge label={t("Escanea · Verifica en Stellar")} />
                    <Link
                      to="/verificar"
                      search={{ id: p.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("Abrir →")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "liquidaciones" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 shadow-float">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-jade/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-jade">
                    <Webhook className="h-3.5 w-3.5" /> Standard Webhooks (HMAC-SHA256) · Activo
                  </div>
                  <h3 className="font-serif text-lg font-semibold">
                    {t("Webhook Listener pey.mx (CoDi & Payment Links)")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Endpoint: <code className="rounded bg-card px-1.5 py-0.5 font-mono">POST /api/webhooks/pey</code> · Eventos:{" "}
                    <code className="font-mono">codi.qr.payment_received</code>,{" "}
                    <code className="font-mono">codi.pn.payment_received</code>,{" "}
                    <code className="font-mono">payment_link.payment_received</code>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testingWebhook}
                  onClick={() => void triggerTestWebhook()}
                >
                  {testingWebhook ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Webhook className="h-4 w-4" />
                  )}
                  {t("Simular Webhook Tecuani (TK-0512)")}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-float">
              <h2 className="text-xl font-semibold">
                {t("Histórico de Liquidaciones Bancarias (SPEI)")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Comprobantes Electrónicos de Pago (CEP de Banxico) emitidos a las tarjetas de débito de los artesanos.",
                )}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {liquidaciones.map((l) => (
                  <article
                    key={l.clave}
                    className="rounded-xl border bg-background p-4"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-jade/15 px-2.5 py-1 text-xs font-semibold text-jade">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("Transferido a Tarjeta de Débito (SPEI)")}
                    </span>
                    <p className="mt-3 font-semibold">{l.artisan}</p>
                    <p className="text-xs text-muted-foreground">{l.piece}</p>
                    <p className="mt-2 font-serif text-2xl font-semibold">
                      {l.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(l.date)} · CEP Banxico
                      {l.webhookEventType ? ` · ${l.webhookEventType}` : ""}
                    </p>
                    <div className="mt-3 rounded-lg bg-sand p-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t("Clave de Rastreo Banxico")}
                      </p>
                      <p className="break-all font-mono text-xs">{l.clave}</p>
                    </div>
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="mt-2 h-auto px-0"
                    >
                      <a
                        href={getContractExplorerUrl(contractId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("Ver auditoría en Stellar Explorer ↗")}{" "}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(editingWork)}
        onOpenChange={(isOpen) => {
          if (savingWork) return;
          if (!isOpen) setEditingWork(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {t("Editar información de la obra")} · {editingWork?.work.id}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Esta obra aún no ha sido anclada en Stellar Soroban. Al guardar los cambios se recalculará su huella SHA-256.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-work-title">{t("Título de la obra *")}</Label>
              <Input
                id="edit-work-title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-artisan">{t("Maestro Artesano *")}</Label>
              <Input
                id="edit-work-artisan"
                value={editForm.artisan}
                onChange={(e) =>
                  setEditForm({ ...editForm, artisan: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-promoter">
                {t("Promotor responsable")}
              </Label>
              <Input
                id="edit-work-promoter"
                value={editForm.promoterName}
                onChange={(e) =>
                  setEditForm({ ...editForm, promoterName: e.target.value })
                }
                placeholder={t("Ej. Alain Bonilla · Cooperativa Guelaguetza")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-community">{t("Comunidad")}</Label>
              <Input
                id="edit-work-community"
                value={editForm.community}
                onChange={(e) =>
                  setEditForm({ ...editForm, community: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-region">{t("Región")}</Label>
              <select
                id="edit-work-region"
                value={editForm.region}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    region: e.target.value as Piece["region"],
                  })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-technique">{t("Técnica")}</Label>
              <select
                id="edit-work-technique"
                value={editForm.technique}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    technique: e.target.value as Piece["technique"],
                  })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TECHNIQUE_OPTIONS.map((tech) => (
                  <option key={tech} value={tech}>
                    {t(tech)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-price">{t("Precio (MXN)")}</Label>
              <Input
                id="edit-work-price"
                type="number"
                min={1}
                value={editForm.priceMxn}
                onChange={(e) =>
                  setEditForm({ ...editForm, priceMxn: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-work-dimensions">{t("Dimensiones")}</Label>
              <Input
                id="edit-work-dimensions"
                value={editForm.dimensions}
                onChange={(e) =>
                  setEditForm({ ...editForm, dimensions: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-work-materials">{t("Materiales")}</Label>
              <Input
                id="edit-work-materials"
                value={editForm.materials}
                onChange={(e) =>
                  setEditForm({ ...editForm, materials: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-work-description">
                {t("Descripción / Historia de la pieza")}
              </Label>
              <Textarea
                id="edit-work-description"
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={savingWork}
              onClick={() => setEditingWork(null)}
            >
              {t("Cancelar")}
            </Button>
            <Button
              type="button"
              disabled={savingWork}
              onClick={() => void saveWorkEdits()}
            >
              {savingWork ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("Guardando…")}
                </>
              ) : (
                t("Guardar cambios")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
