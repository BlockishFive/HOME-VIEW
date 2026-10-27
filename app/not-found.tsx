"use client";
import { useI18n, usePageTitle } from "@/components/I18nProvider";
import { ArrowIcon } from "@/components/ArrowIcon";
import Link from "next/link";
import { Header } from "@/components/Header";
export default function NotFound() {
  const { t } = useI18n();
  usePageTitle("Propiedad no encontrada · Home View");
  return (
    <>
      <Header />
      <main className="section-wrap missing">
        <p className="eyebrow">{t("404 · ESPACIO NO ENCONTRADO")}</p>
        <h1>{t("Esta puerta no lleva a ningún lugar.")}</h1>
        <p>
          {t(
            "La propiedad que buscas no está en nuestro catálogo de demostración.",
          )}
        </p>
        <Link href="/" className="button button-dark">
          {t("Explorar propiedades")}
          <ArrowIcon />
        </Link>
      </main>
    </>
  );
}
