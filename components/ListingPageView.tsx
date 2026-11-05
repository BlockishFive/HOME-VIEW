"use client";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ListingForm } from "@/components/ListingForm";
import { useI18n, usePageTitle } from "./I18nProvider";
export function ListingPageView() {
  const { t } = useI18n();
  usePageTitle("Alta de inmueble · Borrador local · Home View", "Prepara una ficha de venta o renta con fotografías autorizadas. Guardado local en tu navegador, sin publicación automática.");
  return (
    <>
      <Header />
      <main className="section-wrap listing-page">
        <Link href="/#propiedades" className="back-link">
          {t("← Volver al catálogo")}
        </Link>
        <div className="listing-heading">
          <p className="eyebrow">{t("PREPARA TU PRIMER ANUNCIO")}</p>
          <h1>{t("Un nuevo espacio comienza aquí.")}</h1>
          <p>
            {t(
              "Empieza con tu casa en renta en León, Guanajuato. Completa la información y añade material autorizado para preparar un borrador local. No tiene protección por contraseña.",
            )}
          </p>
        </div>
        <ListingForm />
      </main>
      <footer className="site-footer">
        <span className="brand">{t("homeview.")}</span>
        <span>
          {t(
            "Preparación local · Sin cuentas, cobros ni publicación automática",
          )}
        </span>
      </footer>
    </>
  );
}
