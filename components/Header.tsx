"use client";
import Link from "next/link";
import { useI18n } from "./I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
export function Header() {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label={t("Home View, inicio")}>
        <span className="brand-mark" aria-hidden="true">
          ⌂
        </span>{" "}
        home<span className="brand-light">view</span>
        <span className="brand-dot">.</span>
      </Link>
      <nav aria-label={t("Navegación principal")}>
        <Link href="/venta">{t("Venta")}</Link>
        <Link href="/renta">{t("Renta")}</Link>
        <Link href="/terrenos">{t("Terrenos")}</Link>
        <Link href="/alta#saved-title">{t("Mis borradores")}</Link>
        <Link href="/alta" className="header-add">
          {t("Alta de inmueble")}
        </Link>
        <span className="demo-pill">{t("Prototipo demo")}</span>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
