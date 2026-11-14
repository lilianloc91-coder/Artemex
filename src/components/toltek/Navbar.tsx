import { Link, useNavigate, useHydrated } from "@tanstack/react-router";
import { Menu, X, LogOut, UserRound, Search, ShoppingBag, User, ScanLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOutPlatform } from "@/lib/platform-auth";
import { useAccount } from "./AuthProvider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./ui";
import { useI18n } from "@/i18n";

const leftLinks: Array<{ to: "/" | "/verificar" | "/mercado" | "/regiones"; hash?: string; es: string; en: string }> = [
  { to: "/", es: "Inicio", en: "Home" },
  { to: "/verificar", es: "Exposiciones", en: "Exhibitions" },
  { to: "/mercado", es: "Colecciones", en: "Collections" },
  { to: "/regiones", es: "Regiones", en: "Regions" },
];

export function Navbar() {
  const { t, language, setLanguage } = useI18n();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const { user } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await signOutPlatform();
    } catch {
      toast.error(t("No se pudo cerrar sesión"));
      return;
    }
    setOpen(false);
    await navigate({ to: "/auth", search: { next: "/panel" }, replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 sm:px-6 xl:flex xl:justify-between xl:gap-4">
        {/* Navegación izquierda (Estilo Galería) */}
        <nav className="hidden min-w-0 items-center gap-5 xl:flex xl:flex-1">
          {leftLinks.map((l) => (
            <Link
              key={l.es}
              to={l.to}
              {...(l.hash ? { hash: l.hash } : {})}
              activeOptions={{ exact: l.to === "/" && !l.hash }}
              className="relative py-1 text-xs font-medium tracking-wide text-foreground/75 transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary",
              }}
            >
              {t(l.es)}
            </Link>
          ))}
        </nav>

        {/* Logo Central: ARTE & ORIGEN */}
        <div className="flex min-w-0 items-center justify-start py-1 xl:shrink-0 xl:justify-center [&_a]:min-w-0 [&_a]:max-w-full">
          <Link to="/" className="transition-opacity hover:opacity-90">
            <Logo />
          </Link>
        </div>

        {/* Acciones y navegación derecha */}
        <div className="hidden xl:flex xl:flex-1 items-center justify-end gap-3 [&>a]:whitespace-nowrap">
          <Button asChild variant="ghost" size="icon" title={t("Escanear Pasaporte (Cámara)")}><Link to="/verificar" search={{}} aria-label={t("Escanear Pasaporte (Cámara)")}><ScanLine className="h-4 w-4" /></Link></Button>
          <Link
            to="/panel"
            className="text-xs font-medium tracking-wide text-foreground/75 transition-colors hover:text-foreground"
          >
            {t("Panel del Promotor")}
          </Link>

          <div className="h-4 w-px bg-border/80" />

          {/* Iconos sutiles: Búsqueda, Usuario, Carrito */}
          <Link
            to="/mercado"
            aria-label={t("Buscar")}
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/panel"
                className="flex items-center gap-1.5 rounded-full border border-border/80 bg-sand/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-sand transition-colors"
              >
                <UserRound className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-28 truncate">{user.displayName || user.username}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={signOut}
                title={t("Cerrar sesión")}
                aria-label={t("Cerrar sesión")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Link
              to="/auth"
              search={{ next: "/panel" }}
              aria-label={t("Iniciar sesión")}
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              <User className="h-4 w-4" />
            </Link>
          )}

          <Link
            to="/mercado"
            aria-label={t("Bolsa de compra")}
            className="relative text-foreground/70 transition-colors hover:text-foreground"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-2 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              0
            </span>
          </Link>

          <select
            disabled={!hydrated}
            aria-label={t("Idioma")}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-7 rounded border border-border/60 bg-transparent px-1.5 text-[11px] font-medium text-foreground/75 focus:outline-none"
          >
            <option value="es">ES</option>
            <option value="en">EN</option>
            <option value="zh-CN">ZH</option>
          </select>
        </div>

        {/* Botón hamburguesa móvil */}
        <div className="flex shrink-0 items-center gap-1 xl:hidden">
          <Button asChild variant="ghost" size="icon" title={t("Escanear Pasaporte (Cámara)")}><Link to="/verificar" search={{}} onClick={() => setOpen(false)} aria-label={t("Escanear Pasaporte (Cámara)")}><ScanLine className="h-5 w-5" /></Link></Button>
          <Link
            to="/mercado"
            aria-label={t("Bolsa de compra")}
            className="relative text-foreground/70"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-2 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              0
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/80 hover:text-foreground"
            onClick={() => setOpen(!open)}
            aria-label={t("Menú")}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {open && (
        <nav className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-border/80 bg-background px-4 py-4 space-y-2 xl:hidden">
          {leftLinks.map((l) => (
            <Link
              key={l.es}
              to={l.to}
              {...(l.hash ? { hash: l.hash } : {})}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: l.to === "/" && !l.hash }}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/85 hover:bg-sand"
              activeProps={{ className: "bg-sand text-foreground font-semibold" }}
            >
              {t(l.es)}
            </Link>
          ))}
          <Link
            to="/panel"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/85 hover:bg-sand"
          >
            {t("Panel de Promotor")}
          </Link>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between px-3">
            <span className="text-xs text-muted-foreground">{t("Idioma")}</span>
            <select
              disabled={!hydrated}
              aria-label={t("Idioma")}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-8 rounded border border-border/60 bg-transparent px-2 text-xs font-medium text-foreground/80"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
            </select>
          </div>
        </nav>
      )}
      <div className="greca" />
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/80 bg-[#241E1A] text-[#F4EFE6]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="inline-block text-left">
            <span className="font-serif text-2xl tracking-[0.22em] text-[#F4EFE6] block uppercase">
              ARTE & ORIGEN
            </span>
            <span className="text-[9px] tracking-[0.28em] text-[#C2B7A7] uppercase font-sans font-medium block mt-1">
              TLAMATIK · MEMORIA VIVA DEL PATRIMONIO
            </span>
          </div>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-[#C2B7A7]">
            {t(
              "Plataforma de certificación de origen, pasaportes culturales phygital y comercio justo para las maestras y maestros artesanos de los pueblos originarios de México.",
            )}
          </p>
          <div className="mt-6 flex items-center gap-6 text-xs text-[#A89D8D]">
            <span>Cuetzalan · Oaxaca · Chiapas · Guerrero · Michoacán · Puebla</span>
          </div>
        </div>

        <div className="space-y-3 text-xs text-[#C2B7A7]">
          <p className="font-semibold uppercase tracking-wider text-[#F4EFE6]">{t("Navegación")}</p>
          <p>
            <Link to="/" className="hover:text-white transition-colors">
              {t("Inicio")}
            </Link>
          </p>
          <p>
            <Link to="/verificar" className="hover:text-white transition-colors">
              {t("Verificar Pasaporte (QR)")}
            </Link>
          </p>
          <p>
            <Link to="/mercado" className="hover:text-white transition-colors">
              {t("Mercado Ético & Colecciones")}
            </Link>
          </p>
          <p>
            <Link to="/panel" className="hover:text-white transition-colors">
              {t("Panel de Promotor Comunitario")}
            </Link>
          </p>
        </div>

        <div className="space-y-3 text-xs text-[#C2B7A7]">
          <p className="font-semibold uppercase tracking-wider text-[#F4EFE6]">
            {t("Tecnología & Soberanía")}
          </p>
          <p>Stellar Soroban Testnet (Smart Contracts)</p>
          <p>Cálculo Local de Hash SHA-256 (W3C Web Crypto)</p>
          <p>Dispersión Bancaria Directa vía CoDi® / SPEI</p>
          <p>0% de comisión para los artesanos</p>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left text-[11px] text-[#A89D8D]">
          <p>
            {t(
              "Inclusión financiera real: 95% del importe se liquida de inmediato en moneda nacional ($MXN) a la cuenta bancaria del taller.",
            )}
          </p>
          <p className="opacity-70">{t("Tlamatik © 2026 · Certificado de Origen")}</p>
        </div>
      </div>
    </footer>
  );
}
