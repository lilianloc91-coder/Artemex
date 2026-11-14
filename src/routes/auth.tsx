import { useI18n } from "@/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/toltek/ui";
import { useAccount } from "@/components/toltek/AuthProvider";
import {
  registerWithPassword,
  signInWithPassword,
} from "@/lib/platform-auth";
import { protectedDestination } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: protectedDestination(search["next"]),
  }),
  head: () => ({
    meta: [
      { title: "Acceso de Promotores — Tlamatik" },
      {
        name: "description",
        content:
          "Inicia sesión o regístrate con usuario y contraseña para acceder al Panel del Promotor y registro de obras de Tlamatik.",
      },
      { property: "og:title", content: "Acceso de Promotores — Tlamatik" },
      {
        property: "og:description",
        content: "Ingreso seguro al Panel del Promotor Cultural.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "login" | "register";

function AuthPage() {
  const { t } = useI18n();
  const { next } = Route.useSearch();
  const { user, loading } = useAccount();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const destination = protectedDestination(
      sessionStorage.getItem("tlamatik-auth-next") ?? next,
    );
    sessionStorage.removeItem("tlamatik-auth-next");
    void navigate({ to: destination, replace: true });
  }, [user, next, navigate]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    sessionStorage.setItem("tlamatik-auth-next", next);

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      setBusy(true);
      try {
        await registerWithPassword({
          username,
          password,
          displayName,
        });
        toast.success(t("Cuenta creada e inicio de sesión exitoso"));
        await navigate({ to: next, replace: true });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo completar el registro.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      await signInWithPassword({ username, password });
      toast.success(t("Sesión iniciada correctamente"));
      await navigate({ to: next, replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión. Verifica tus datos.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-5 py-14">
      <Logo />
      <ShieldCheck className="mt-7 h-8 w-8 text-gold" />
      <h1 className="mt-3 text-center text-3xl font-semibold">
        {t("Acceso del Promotor")}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === "login"
          ? t("Inicia sesión con tu usuario y contraseña para continuar.")
          : t("Regístrate dentro de la plataforma para gestionar obras y artesanos.")}
      </p>

      <div className="mt-6 w-full rounded-2xl border bg-card p-6 shadow-float">
        <div
          role="tablist"
          aria-label={t("Método de acceso")}
          className="grid grid-cols-2 gap-1.5 rounded-xl bg-sand p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => switchMode("login")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LogIn className="h-4 w-4" />
            {t("Iniciar sesión")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => switchMode("register")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserPlus className="h-4 w-4" />
            {t("Crear cuenta")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-display-name">
                {t("Nombre completo (opcional)")}
              </Label>
              <Input
                id="auth-display-name"
                type="text"
                autoComplete="name"
                placeholder={t("Ej. Miriam Nava / Taller Mixteco")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={busy}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-username">{t("Usuario")}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-username"
                type="text"
                required
                autoComplete="username"
                placeholder={t("Ej. miriam.nava")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
                disabled={busy}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">{t("Contraseña")}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder={t("Mínimo 6 caracteres")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword
                    ? t("Ocultar contraseña")
                    : t("Mostrar contraseña")
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-confirm-password">
                {t("Confirmar contraseña")}
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder={t("Repite tu contraseña")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  disabled={busy}
                />
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy || loading || Boolean(user)}
            className="w-full"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "login" ? t("Iniciar sesión") : t("Registrarme e ingresar")}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>
              {t("¿Aún no tienes cuenta?")}{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-semibold text-primary hover:underline"
              >
                {t("Regístrate aquí")}
              </button>
            </>
          ) : (
            <>
              {t("¿Ya tienes una cuenta?")}{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-primary hover:underline"
              >
                {t("Inicia sesión")}
              </button>
            </>
          )}
        </p>
      </div>

      <Button asChild variant="link" className="mt-5">
        <Link to="/">{t("Volver a Inicio")}</Link>
      </Button>
    </section>
  );
}
