import { useI18n } from "@/i18n";
import { useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { profileOptions, savePromoterProfile } from "@/lib/promoter-profile";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Camera,
  Check,
  Compass,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { STELLAR_CONFIG } from "@/lib/stellar/config";
import { cn } from "@/lib/utils";

const roles = [
  "Antropólogo(a) / Etnólogo(a)",
  "Curador(a) de Arte Popular",
  "Gestor(a) Cultural",
  "Maestro(a) Artesano(a) Certificador(a)",
  "Representante de Cooperativa",
];
const specialties = [
  "Alfarería y Barro",
  "Textil y Telar",
  "Madera y Tallado",
  "Laca y Maque",
  "Metalistería",
  "Talavera y Cerámica",
  "Fibras Naturales",
  "Máscaras y Danza",
];
const states = [
  "Oaxaca",
  "Chiapas",
  "Guerrero",
  "Michoacán",
  "Puebla",
  "Jalisco",
  "Estado de México",
  "Yucatán",
  "Otro (Latinoamérica)",
];

const sel =
  "flex h-10 w-full rounded-md border border-input bg-background/80 px-3 text-sm transition-colors focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PR";
  return parts
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function PromoterRegistration() {
  const { t } = useI18n();
  const { user } = getRouteApi("/_authenticated").useRouteContext();
  const {
    data: { profile, photo: savedPhoto },
  } = useSuspenseQuery(profileOptions(user.id));
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(savedPhoto);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [picked, setPicked] = useState<string[]>(profile.specialties);
  const [accept, setAccept] = useState(profile.ethics_accepted);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(profile.submitted_at));
  const [f, setF] = useState({
    name: profile.display_name,
    curp: profile.official_id,
    email: profile.professional_email,
    role: profile.professional_title,
    org: profile.organization,
    cedula: profile.credential,
    years: String(profile.experience_years),
    state: profile.region,
    communities: profile.communities,
    bio: profile.bio,
  });

  useEffect(
    () => () => {
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
    },
    [photo],
  );

  const set =
    (k: keyof typeof f) => (e: { target: { value: string } }) =>
      setF({ ...f, [k]: e.target.value });

  const onPhoto = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("La foto debe pesar menos de 5 MB"));
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error(t("Selecciona una foto JPG o PNG"));
      return;
    }
    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
  };

  const toggle = (s: string) =>
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const submit = async () => {
    if (!f.name || !f.email || !f.role || !f.state || picked.length === 0) {
      toast.error(
        t("Completa nombre, correo, perfil, región y al menos una especialidad"),
      );
      return;
    }
    if (!photo) {
      toast.error(t("Agrega una foto del promotor"));
      return;
    }
    if (!accept) {
      toast.error(t("Acepta el código de ética de certificación"));
      return;
    }
    if (!Number.isInteger(Number(f.years)) || Number(f.years) < 0) {
      toast.error(t("Revisa los años de experiencia"));
      return;
    }
    setBusy(true);
    try {
      const saved = await savePromoterProfile({
        userId: user.id,
        updates: {
          display_name: f.name.trim(),
          official_id: f.curp,
          professional_email: f.email.trim(),
          professional_title: f.role,
          organization: f.org,
          credential: f.cedula,
          experience_years: Number(f.years),
          region: f.state,
          communities: f.communities,
          bio: f.bio,
          specialties: picked,
          ethics_accepted: accept,
          avatar_path: profile.avatar_path,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        photoFile,
        existingPhotoUrl: photo,
      });
      setPhoto(saved.photo);
      await queryClient.invalidateQueries({
        queryKey: ["promoter-profile", user.id],
      });
      setPhotoFile(null);
      setDone(true);
      toast.success(t("Perfil guardado"));
    } catch {
      toast.error(t("No se pudo guardar el perfil. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const identityDone = Boolean(f.name.trim() && f.email.trim() && photo);
  const roleDone = Boolean(f.role && Number(f.years) >= 0);
  const specsDone = picked.length > 0;
  const regionDone = Boolean(f.state);
  const completedSteps = [
    identityDone,
    roleDone,
    specsDone,
    regionDone,
    accept,
  ].filter(Boolean).length;

  if (done) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-float">
        <div className="greca" />
        <div className="talavera-bg p-8">
          <div className="mx-auto max-w-2xl rounded-2xl border bg-card/95 p-8 text-center shadow-float backdrop-blur-xs">
            <div className="relative mx-auto w-fit">
              {photo ? (
                <img
                  src={photo}
                  alt={f.name}
                  className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-gold/70"
                />
              ) : (
                <span className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-indigo font-serif text-3xl font-semibold text-gold ring-4 ring-gold/60">
                  {getInitials(f.name)}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-jade text-jade-foreground shadow-sm">
                <BadgeCheck className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t("Padrón de Certificadores · Tlamatik")}
            </p>
            <h2 className="mt-1 font-serif text-3xl font-semibold">{f.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(f.role)} · {t(f.state)}
              {f.org ? ` · ${f.org}` : ""}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {picked.map((value) => (
                <span
                  key={value}
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {t(value)}
                </span>
              ))}
            </div>

            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
              {t("Perfil profesional guardado ·")}{" "}
              <b className="text-foreground">
                {picked.map((value) => t(value)).join(", ")}
              </b>
            </p>

            <div className="mt-6 rounded-xl bg-sand/70 p-3 font-mono text-xs text-muted-foreground">
              Soroban Registry: {STELLAR_CONFIG.contractId.slice(0, 12)}…
              {STELLAR_CONFIG.contractId.slice(-8)}
            </div>

            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setDone(false)}
            >
              {t("Editar registro")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
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
                  {t("Registro del Promotor Certificador")}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {t(
                    "Tu perfil respalda la originalidad, la técnica y la procedencia de cada pieza que certifiques.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card/90 px-3.5 py-1.5 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-jade" />
              <span>{completedSteps}/5</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <fieldset className="rounded-xl border bg-background/40 p-5 sm:p-6">
            <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <UserRound className="h-3.5 w-3.5" />
              {t("Identidad")}
            </legend>
            <div className="mt-2 grid items-center gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="group flex w-full cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-dashed border-primary/35 bg-sand/40 p-4 text-center transition-colors hover:border-primary hover:bg-sand/70">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-card shadow-float transition-transform group-hover:scale-[1.02]">
                  {photo ? (
                    <img
                      src={photo}
                      alt={t("Foto del promotor")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-primary/60" />
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Camera className="h-3.5 w-3.5" />
                  {photo ? t("Cambiar foto") : t("Subir foto")}
                </span>
                <span className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  {t("Rostro visible · JPG/PNG · máx. 5 MB")}
                </span>
                <input
                  aria-label={t("Foto del promotor")}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => onPhoto(e.target.files?.[0])}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("Nombre completo *")}</Label>
                  <Input
                    value={f.name}
                    onChange={set("name")}
                    placeholder="Mtra. Elena Ruiz Matus"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("CURP / ID oficial")}</Label>
                  <Input
                    value={f.curp}
                    onChange={set("curp")}
                    placeholder="RUME850312MOCZTL09"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("Correo profesional *")}</Label>
                  <Input
                    type="email"
                    value={f.email}
                    onChange={set("email")}
                    placeholder="elena@cooperativa.mx"
                  />
                </div>
              </div>
            </div>
          </fieldset>

            <fieldset className="rounded-xl border bg-background/40 p-5 sm:p-6">
              <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Briefcase className="h-3.5 w-3.5" />
                {t("Perfil profesional")}
              </legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("Perfil *")}</Label>
                  <select className={sel} value={f.role} onChange={set("role")}>
                    <option value="">{t("Selecciona…")}</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {t(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Institución / Cooperativa")}</Label>
                  <Input
                    value={f.org}
                    onChange={set("org")}
                    placeholder="Cooperativa Guelaguetza"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Cédula o certificación")}</Label>
                  <Input
                    value={f.cedula}
                    onChange={set("cedula")}
                    placeholder={t("Cédula 12345678 / FONART")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Años de experiencia")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={f.years}
                    onChange={set("years")}
                    placeholder="12"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border bg-background/40 p-5">
              <legend className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Compass className="h-3.5 w-3.5" />
                {t("Técnicas que puede autenticar *")}
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {specialties.map((s) => {
                  const active = picked.includes(s);
                  return (
                    <Button
                      type="button"
                      key={s}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      aria-pressed={active}
                      onClick={() => toggle(s)}
                      className={cn(
                        "rounded-full text-xs transition-all",
                        active && "shadow-xs",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {t(s)}
                    </Button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border bg-background/40 p-5">
              <legend className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <MapPin className="h-3.5 w-3.5" />
                {t("Región de procedencia")}
              </legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("Estado / región *")}</Label>
                  <select
                    className={sel}
                    value={f.state}
                    onChange={set("state")}
                  >
                    <option value="">{t("Selecciona…")}</option>
                    {states.map((r) => (
                      <option key={r} value={r}>
                        {t(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Comunidades que acompaña")}</Label>
                  <Input
                    value={f.communities}
                    onChange={set("communities")}
                    placeholder="Tilcajete, Coyotepec, Arrazola"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("Trayectoria breve")}</Label>
                  <Textarea
                    rows={3}
                    value={f.bio}
                    onChange={set("bio")}
                    placeholder={t(
                      "Investigación de campo, curadurías, vínculo con talleres…",
                    )}
                  />
                </div>
              </div>
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/25 bg-sand/60 p-4 text-sm transition-colors hover:bg-sand">
              <Checkbox
                checked={accept}
                onCheckedChange={(v) => setAccept(v === true)}
                className="mt-0.5"
              />
              <span className="leading-relaxed">
                {t(
                  "Me comprometo con el código de ética Tlamatik: certificar solo piezas cuya autoría, técnica y origen haya verificado, respetando el consentimiento de cada comunidad.",
                )}
              </span>
            </label>

            <div className="flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-jade" />
                {t("Tu firma quedará vinculada a cada pasaporte en Stellar.")}
              </p>
              <Button size="lg" onClick={submit} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Enviando…")}
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    {t("Enviar registro")}
                  </>
                )}
              </Button>
            </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="overflow-hidden rounded-2xl bg-indigo text-indigo-foreground shadow-float">
          <div className="greca" />
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                <Sparkles className="h-3.5 w-3.5" /> {t("Pasaporte Cultural")}
              </span>
              <span className="rounded-full bg-indigo-foreground/10 px-2 py-0.5 font-mono text-[10px] opacity-80">
                {t("Vista previa")}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3.5">
              {photo ? (
                <img
                  src={photo}
                  alt=""
                  aria-hidden="true"
                  className="h-14 w-14 shrink-0 rounded-full border-2 border-gold/60 object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/40 bg-indigo-foreground/10 font-serif text-lg font-semibold text-gold">
                  {getInitials(f.name)}
                </span>
              )}
              <div className="min-w-0">
                <h3 className="truncate font-serif text-lg font-semibold">
                  {f.name.trim() || t("Nombre completo")}
                </h3>
                <p className="truncate text-xs text-gold">
                  {f.role ? t(f.role) : t("Perfil profesional")}
                </p>
                {f.state && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs opacity-75">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {t(f.state)}
                    {f.communities ? ` · ${f.communities}` : ""}
                  </p>
                )}
              </div>
            </div>

            {f.org.trim() && (
              <p className="mt-3 rounded-lg bg-indigo-foreground/10 px-3 py-2 text-xs opacity-90">
                {f.org}
              </p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-indigo-foreground/10 p-2.5">
                <dt className="text-[10px] uppercase tracking-wider opacity-70">
                  {t("Años de experiencia")}
                </dt>
                <dd className="mt-0.5 font-serif text-lg font-semibold text-gold">
                  {f.years || "0"}
                </dd>
              </div>
              <div className="rounded-lg bg-indigo-foreground/10 p-2.5">
                <dt className="text-[10px] uppercase tracking-wider opacity-70">
                  {t("Técnica")}
                </dt>
                <dd className="mt-0.5 font-serif text-lg font-semibold text-gold">
                  {picked.length}
                </dd>
              </div>
            </dl>

            {picked.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-indigo-foreground/15 pt-3">
                {picked.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-indigo-foreground/10 px-2.5 py-0.5 text-[11px] text-gold"
                  >
                    {t(item)}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-indigo-foreground/10 p-3 font-mono text-[10px] opacity-80">
              <p className="uppercase tracking-wider text-gold">
                Soroban Smart Contract
              </p>
              <p className="mt-1 truncate">{STELLAR_CONFIG.contractId}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
