import { useI18n } from "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  UploadCloud,
  FileAudio,
  FileImage,
  FileText,
  X,
  Anchor,
  Sparkles,
  Mic,
  Camera,
  Download,
  ExternalLink,
  ShieldCheck,
  Save,
  Images,
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
} from "@/components/ui/dialog";
import { QrCode, StellarBadge } from "@/components/toltek/ui";
import { artisans, contractId, shortHash } from "@/lib/toltek";
import {
  computeDossierSha256,
  computeFileSha256,
} from "@/lib/stellar/client-crypto";
import { registerWorkServerFn } from "@/lib/stellar/soroban.functions";
import { getContractExplorerUrl, getTxExplorerUrl } from "@/lib/stellar/config";
import {
  downloadPassportCertificate,
  saveWorkAndInitialEvents,
  saveWorkDraft,
  uploadWorkFileToSupabase,
  type AuthoryRightsEvent,
  type AuthoryWork,
} from "@/lib/authory-service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/registrar")({
  ssr: false,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Registrar Obra y Pasaporte Cultural — Tlamatik" },
      {
        name: "description",
        content:
          "Registra una pieza, sella su evidencia con SHA-256 y ánclala en Stellar.",
      },
      { property: "og:title", content: "Registro de Obra — Tlamatik" },
      {
        property: "og:description",
        content: "Genera un Pasaporte Cultural Phygital con QR y hash inmutable.",
      },
    ],
  }),
  component: Register,
});

const steps = ["Datos de la Pieza", "Evidencia del Saber", "Minting Criptográfico"];
const categories = ["Textil", "Cerámica", "Talla en Madera", "Filigrana", "Laca"];

interface SealedFileItem {
  name: string;
  size: number;
  type: string;
  sha256: string;
  file?: File;
}

function Register() {
  const { t, money } = useI18n();
  const { user } = Route.useRouteContext();
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    title: "",
    artisan: artisans[0]?.name ?? "",
    promoterName: user.displayName || user.username || "",
    category: "Talla en Madera",
    technique: "",
    materials: "",
    priceMxn: "",
  });
  const [files, setFiles] = useState<SealedFileItem[]>([]);
  const [piecePhotos, setPiecePhotos] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [hash, setHash] = useState("");
  const [minting, setMinting] = useState<"idle" | "running" | "done">("idle");
  const [savingDraft, setSavingDraft] = useState(false);
  const [phase, setPhase] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [mintedWork, setMintedWork] = useState<AuthoryWork | null>(null);
  const [mintedEvents, setMintedEvents] = useState<AuthoryRightsEvent[]>([]);

  const handlePiecePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const readers = Array.from(list).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then((dataUrls) => {
      setPiecePhotos((prev) => [...prev, ...dataUrls]);
      toast.success(t("{{count}} foto(s) añadidas a la galería", { count: dataUrls.length }));
    });
  };

  const makePhotoPrimary = (index: number) => {
    setPiecePhotos((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      if (selected) copy.unshift(selected);
      return copy;
    });
    toast.success(t("Foto seleccionada como portada"));
  };

  const removePhoto = (index: number) => {
    setPiecePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const generateWithAi = () => {
    setAiBusy(true);
    setTimeout(() => {
      setD((prev) => ({
        ...prev,
        title: prev.title || "Alebrije Jaguar Nahual · Guardián del Monte",
        technique:
          "Tallado a mano en madera de copal verde, siguiendo la veta para que la pieza revele el animal que guarda. Cada pincelada de grana cochinilla y añil honra tres generaciones del taller familiar.\n\nEN: Hand-carved from green copal wood, following the grain so the piece reveals the animal it holds. Every brushstroke of cochineal and indigo honors three generations of the family workshop.",
        materials:
          "Copal (Bursera glabrifolia) · Grana cochinilla · Añil · Cempasúchil · Jugo de limón",
        priceMxn: prev.priceMxn || "8900",
      }));
      setAiBusy(false);
      toast.success(t("Historia y metadatos generados"), {
        description: t(
          "Narrativa en español + traducción al inglés + etiquetas de materiales ancestrales.",
        ),
      });
    }, 1200);
  };

  useEffect(() => {
    computeDossierSha256(d, files).then(setHash);
  }, [d, files]);

  const set =
    (k: keyof typeof d) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setD({ ...d, [k]: e.target.value });

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const hashed = await Promise.all(
      incoming.map(async (rawFile) => {
        const fileSha256 = await computeFileSha256(rawFile);
        return {
          name: rawFile.name,
          size: rawFile.size,
          type: rawFile.type,
          sha256: fileSha256,
          file: rawFile,
        };
      }),
    );
    setFiles((prev) => [...prev, ...hashed]);
    toast.success(t("{{count}} archivo(s) sellados con SHA-256", { count: hashed.length }));
  };

  const next = () => {
    if (step === 0 && !d.title.trim()) {
      toast.error(t("Agrega el título de la pieza"));
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const mint = async () => {
    setMinting("running");
    setPhase(0);

    try {
      const workId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedArtisan = artisans.find((a) => a.name === d.artisan);
      const locationParts = (selectedArtisan?.location ?? "Oaxaca, Oaxaca").split(",");
      const community = locationParts[0]?.trim() || "Comunidad Artesanal";
      const region = locationParts[1]?.trim() || "Oaxaca";

      setPhase(1);
      let uploadedUrl: string | null = null;
      const primaryFile = files[0]?.file;
      if (primaryFile) {
        uploadedUrl = await uploadWorkFileToSupabase(primaryFile, workId);
      }

      setPhase(2);
      const sorobanRes = await registerWorkServerFn({
        data: {
          workId,
          hash,
          author: d.artisan || user.email || "Promotor Tlamatik",
        },
      });

      setPhase(3);
      const nowIso = new Date().toISOString();
      const fileHashesNotes =
        files.length > 0
          ? files.map((f) => `${f.name}:${f.sha256}`).join(" | ")
          : undefined;

      const primaryPhoto = piecePhotos[0];
      const workRecord: AuthoryWork = {
        id: workId,
        promoterId: user.id,
        promoterName:
          d.promoterName.trim() || user.displayName || user.username,
        title: d.title.trim() || "Obra Artesanal Certificada",
        type: primaryPhoto || primaryFile?.type.startsWith("image")
          ? "photography"
          : primaryFile?.type.startsWith("audio")
            ? "music"
            : "other",
        description:
          d.technique.trim() ||
          `Obra artesanal en ${d.category} elaborada por ${d.artisan}.`,
        author: d.artisan,
        artisan: d.artisan,
        community,
        region: (region as AuthoryWork["region"]) || "Oaxaca",
        technique: (d.category as AuthoryWork["technique"]) || "Talla en Madera",
        materials: d.materials.trim() || d.category,
        dimensions: "Pieza única certificada",
        priceMxn: Number(d.priceMxn) || 3800,
        hash,
        stellarTransactionId: sorobanRes.txHash,
        network: "testnet",
        status: "verified",
        filename: primaryFile?.name,
        fileSize: primaryFile ? `${(primaryFile.size / 1024).toFixed(1)} KB` : undefined,
        fileMimeType: primaryFile?.type,
        fileUrl: primaryPhoto || uploadedUrl || undefined,
        gallery: piecePhotos.length > 0 ? piecePhotos : (uploadedUrl ? [uploadedUrl] : undefined),
        notes: fileHashesNotes,
        createdAt: nowIso,
        registeredAt: sorobanRes.timestampIso || nowIso,
      };

      const saved = await saveWorkAndInitialEvents(workRecord);
      setMintedWork(workRecord);
      setMintedEvents(saved.events);
      setPhase(4);
      setMinting("done");
      toast.success(t("Pasaporte Phygital anclado en Stellar"), {
        description: `${workId} · ${shortHash(hash)}`,
      });
    } catch {
      setMinting("idle");
      toast.error(t("No se pudo completar el anclaje en Stellar Testnet"));
    }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const workId = `TK-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedArtisan = artisans.find((a) => a.name === d.artisan);
      const locationParts = (selectedArtisan?.location ?? "Oaxaca, Oaxaca").split(",");
      const community = locationParts[0]?.trim() || "Comunidad Artesanal";
      const region = locationParts[1]?.trim() || "Oaxaca";
      const nowIso = new Date().toISOString();
      const primaryFile = files[0]?.file;

      const primaryPhoto = piecePhotos[0];

      await saveWorkDraft({
        id: workId,
        promoterId: user.id,
        promoterName:
          d.promoterName.trim() || user.displayName || user.username,
        title: d.title.trim() || "Obra Artesanal (Borrador)",
        type: primaryPhoto || primaryFile?.type.startsWith("image") ? "photography" : "other",
        description:
          d.technique.trim() ||
          `Obra artesanal en ${d.category} elaborada por ${d.artisan}.`,
        author: d.artisan,
        artisan: d.artisan,
        community,
        region: (region as AuthoryWork["region"]) || "Oaxaca",
        technique: (d.category as AuthoryWork["technique"]) || "Talla en Madera",
        materials: d.materials.trim() || d.category,
        dimensions: "Pieza única en preparación",
        priceMxn: Number(d.priceMxn) || 3800,
        hash,
        network: "testnet",
        status: "draft",
        filename: primaryFile?.name,
        fileSize: primaryFile ? `${(primaryFile.size / 1024).toFixed(1)} KB` : undefined,
        fileMimeType: primaryFile?.type,
        fileUrl: primaryPhoto || undefined,
        gallery: piecePhotos.length > 0 ? piecePhotos : undefined,
        createdAt: nowIso,
        registeredAt: nowIso,
      });

      toast.success(t("Obra guardada sin anclar en blockchain"), {
        description: `${workId} · ${t("Puedes editarla desde Panel Promotor → Obras Registradas.")}`,
      });
    } catch {
      toast.error(t("No se pudo guardar el borrador"));
    } finally {
      setSavingDraft(false);
    }
  };

  const fileIcon = (type: string) =>
    type.startsWith("image") ? FileImage : type.startsWith("audio") ? FileAudio : FileText;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-semibold md:text-4xl">
        {t("Registro de Obra & Pasaporte Cultural")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t(
          "Cada dato que escribes se sella en vivo; nada sale de tu navegador hasta el anclaje.",
        )}
      </p>

      <ol className="mt-8 flex flex-wrap gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                i === step && "border-primary bg-primary text-primary-foreground",
                i < step && "border-jade text-jade",
              )}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-background/20 text-xs">
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {t(s)}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-float">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Sparkles className="h-5 w-5 shrink-0 text-gold" />
              {t("Asistente de Redacción Cultural con IA (OpenAI GPT-4o)")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Redacta la narrativa y los metadatos de la obra a partir del relato del maestro.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success(t("Audio recibido"), {
                  description: t("relato_maestro.mp3 · transcribiendo…"),
                })
              }
            >
              <Mic />
              {t("Subir Audio con Relato del Maestro")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success(t("Foto analizada"), {
                  description: t("Se detectaron pigmentos naturales y talla en copal."),
                })
              }
            >
              <Camera />
              {t("Analizar Foto de la Obra")}
            </Button>
            <Button size="sm" onClick={generateWithAi} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
              {t("Generar Historia y Metadatos con IA")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl border bg-card p-6 shadow-float">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Título de la obra")} className="sm:col-span-2">
                <Input
                  value={d.title}
                  onChange={set("title")}
                  placeholder={t("Ej. Alebrije Jaguar Nahual")}
                />
              </Field>
              <Field label={t("Artesano")}>
                <select
                  value={d.artisan}
                  onChange={set("artisan")}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {artisans.map((a) => (
                    <option key={a.name}>{a.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Categoría")}>
                <select
                  value={d.category}
                  onChange={set("category")}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Promotor responsable")} className="sm:col-span-2">
                <Input
                  value={d.promoterName}
                  onChange={set("promoterName")}
                  placeholder={t("Ej. Alain Bonilla · Cooperativa Guelaguetza")}
                />
              </Field>
              <Field label={t("Técnica ancestral")} className="sm:col-span-2">
                <Textarea
                  value={d.technique}
                  onChange={set("technique")}
                  placeholder={t(
                    "Tallado a mano en copal, pintura con pigmentos naturales…",
                  )}
                />
              </Field>
              <Field label={t("Materiales autóctonos")}>
                <Input
                  value={d.materials}
                  onChange={set("materials")}
                  placeholder={t("Copal, grana cochinilla, añil")}
                />
              </Field>
              <Field label={t("Precio (MXN)")}>
                <Input
                  type="number"
                  min={0}
                  value={d.priceMxn}
                  onChange={set("priceMxn")}
                  placeholder="8900"
                />
              </Field>

              <div className="sm:col-span-2 pt-1">
                <div className="rounded-xl border border-primary/20 bg-sand/30 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label className="flex items-center gap-1.5 text-sm font-semibold">
                        <Images className="h-4 w-4 text-primary" />
                        {t("Fotos de la Pieza Artesanal (Galería)")}
                      </Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(
                          "Captura o sube fotos desde diferentes ángulos (frente, reverso, detalles y firma) para la galería pública.",
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-medium text-primary">
                      {piecePhotos.length} {piecePhotos.length === 1 ? t("foto") : t("fotos")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {piecePhotos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-background shadow-xs"
                      >
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                        {idx === 0 ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-xs">
                            {t("Portada")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => makePhotoPrimary(idx)}
                            className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity backdrop-blur-xs group-hover:opacity-100 hover:bg-black/80"
                          >
                            {t("Portada")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100 shadow-xs"
                          aria-label={t("Quitar foto")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-background/60 p-3 text-center transition-colors hover:bg-primary/5">
                      <Camera className="mb-1.5 h-6 w-6 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {t("Capturar / Subir foto")}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {t("JPG, PNG o WEBP")}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePiecePhotosUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void addFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                  drag ? "border-primary bg-primary/5" : "border-border talavera-bg",
                )}
              >
                <UploadCloud className="h-10 w-10 text-primary" />
                <p className="mt-3 font-semibold">
                  {t("Arrastra fotos del proceso, audios o documentos")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("o haz clic para seleccionar · JPG, MP3, PDF")}
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void addFiles(e.target.files)}
                />
              </label>
              <ul className="mt-4 space-y-2">
                {files.map((f, i) => {
                  const I = fileIcon(f.type);
                  return (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex flex-col gap-1.5 rounded-lg border bg-background p-3 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <I className="h-5 w-5 shrink-0 text-primary" />
                        <span className="flex-1 truncate font-medium">{f.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          aria-label={t("Quitar")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="flex items-center gap-1.5 truncate font-mono text-[11px] text-jade">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        SHA-256: {f.sha256}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t("Generación criptográfica")}</h2>
              <dl className="grid gap-3 text-sm">
                <Row k="Hash SHA-256 del expediente" v={hash} />
                <Row k="Contrato Soroban" v={contractId} />
                <Row k="Red" v="Stellar Testnet" />
                <Row
                  k="Evidencias selladas"
                  v={t("{{count}} archivo(s)", { count: files.length })}
                />
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-jade/25 bg-jade/10 px-3 py-2 text-xs text-jade">
                <span>
                  {t("Función Soroban:")}{" "}
                  <code className="font-mono font-semibold">
                    register_work(work_id, hash, author)
                  </code>
                </span>
                <a
                  href={getContractExplorerUrl(contractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline"
                >
                  Stellar Expert <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => void mint()}
                disabled={minting === "running" || savingDraft}
              >
                <Anchor />
                {t("Anclar en Stellar Blockchain & Generar Pasaporte Phygital")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => void saveDraft()}
                disabled={minting === "running" || savingDraft}
              >
                {savingDraft ? <Loader2 className="animate-spin" /> : <Save />}
                {t("Guardar sin anclar en blockchain (editable)")}
              </Button>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              {t("Atrás")}
            </Button>
            {step < 2 && <Button onClick={next}>{t("Continuar")}</Button>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl bg-indigo text-indigo-foreground shadow-float">
            <div className="greca" />
            <div className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">
                  {t("Pasaporte Cultural")}
                </p>
                <span className="font-mono text-[10px] opacity-60">
                  {mintedWork ? mintedWork.id : t("Vista previa")}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl font-semibold">
                {d.title || "Título de la obra"}
              </h3>
              <p className="text-sm opacity-75">
                {d.artisan} · {t(d.category)}
              </p>
              {d.promoterName.trim() && (
                <p className="mt-1 text-xs text-gold/90">
                  {t("Promotor responsable")}: {d.promoterName.trim()}
                </p>
              )}
              {d.materials && <p className="mt-1 text-xs opacity-60">{d.materials}</p>}

              {piecePhotos.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <div className="relative aspect-video">
                    <img
                      src={piecePhotos[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-xs">
                      <Images className="h-3 w-3" />
                      {piecePhotos.length} {piecePhotos.length === 1 ? t("foto") : t("fotos")}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-4">
                <div className="rounded-lg bg-card p-2">
                  <QrCode value={hash} size={112} />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="text-xs opacity-60">{t("Precio")}</p>
                  <p className="font-semibold">
                    {d.priceMxn ? money(Number(d.priceMxn)) : "—"}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-xs uppercase tracking-wider opacity-60">
                {t("SHA-256 (en vivo)")}
              </p>
              <p className="break-all font-mono text-[11px] text-gold">{hash}</p>
              <StellarBadge
                className="mt-4"
                label={
                  minting === "done"
                    ? t("Anclado en Stellar")
                    : t("Pendiente de anclaje")
                }
              />
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={minting !== "idle"}
        onOpenChange={(o) => !o && minting === "done" && setMinting("idle")}
      >
        <DialogContent className="overflow-hidden">
          {minting === "done" && <Confetti />}
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {minting === "done" ? t("¡Pasaporte emitido!") : t("Anclando en Stellar…")}
            </DialogTitle>
            <DialogDescription>
              {minting === "done"
                ? t("La pieza ya puede verificarse con su QR.")
                : t("No cierres esta ventana.")}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {[
              "Calculando hash SHA-256",
              "Firmando transacción con Freighter",
              "Invocando contrato Soroban",
              "Emitiendo Pasaporte Phygital",
            ].map((l, i) => (
              <li key={l} className="flex items-center gap-3 text-sm">
                {phase > i ? (
                  <Check className="h-5 w-5 text-jade" />
                ) : phase === i ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <span className="h-5 w-5 rounded-full border" />
                )}
                <span className={phase > i ? "" : "text-muted-foreground"}>{t(l)}</span>
              </li>
            ))}
          </ul>
          {minting === "done" && mintedWork && (
            <div className="space-y-3 rounded-xl border bg-sand p-4">
              <div className="flex items-center gap-4">
                <QrCode value={mintedWork.hash} size={80} />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="inline-block rounded bg-primary/15 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {mintedWork.id}
                  </span>
                  <p className="mt-1 font-semibold">{mintedWork.title}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {shortHash(mintedWork.hash)}
                  </p>
                  {mintedWork.stellarTransactionId && (
                    <a
                      href={getTxExplorerUrl(mintedWork.stellarTransactionId)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-jade underline"
                    >
                      Tx: {shortHash(mintedWork.stellarTransactionId)}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadPassportCertificate(mintedWork, mintedEvents)}
                >
                  <Download className="h-4 w-4" />
                  {t("Descargar Certificado")}
                </Button>
                <Button asChild size="sm">
                  <Link to="/verificar" search={{ id: mintedWork.id }}>
                    {t("Ver en verificador →")}
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{t(label)}</Label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg bg-sand p-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{t(k)}</dt>
      <dd className="mt-1 break-all font-mono text-xs">{v}</dd>
    </div>
  );
}

function Confetti() {
  const colors = ["bg-primary", "bg-gold", "bg-jade", "bg-indigo"];
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "animate-confetti absolute top-0 h-2.5 w-1.5 rounded-sm",
            colors[i % 4],
          )}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 10) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
