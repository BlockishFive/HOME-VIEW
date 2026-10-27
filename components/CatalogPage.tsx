"use client";
import Link from "next/link";
import { Header } from "./Header";
import { PropertyExplorer } from "./PropertyExplorer";
import { properties } from "@/lib/properties";
import { useI18n, usePageTitle } from "./I18nProvider";
export function CatalogPage({
  title,
  description,
  operation = "Todas",
  type = "Todos",
}: {
  title: string;
  description: string;
  operation?: string;
  type?: string;
}) {
  const { t } = useI18n();
  const pageTitle=type === "Terreno" ? "Terrenos" : operation === "Renta" ? "Propiedades en renta" : "Propiedades en venta";
  usePageTitle(`${t(pageTitle)} · Home View`, description);
  return (
    <>
      <Header />
      <main className="section-wrap catalog-page">
        <Link href="/" className="back-link">
          {t("← Inicio")}
        </Link>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("MÉXICO · GUANAJUATO · LEÓN")}</p>
            <h1>{t(title)}</h1>
          </div>
          <p>{t(description)}</p>
        </div>
        <PropertyExplorer
          properties={properties}
          initialOperation={operation}
          initialType={type}
        />
      </main>
      <footer className="site-footer">
        <span className="brand">homeview.</span>
        <span>{t("Propiedades de demostración · Sin ofertas reales")}</span>
      </footer>
    </>
  );
}
