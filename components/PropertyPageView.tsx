"use client";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyActions } from "@/components/PropertyActions";
import { PropertySectionNav } from "@/components/PropertySectionNav";
import { PropertyCosts } from "@/components/PropertyCosts";
import { PropertyDetails } from "@/components/PropertyDetails";
import { PropertyLocation } from "@/components/PropertyLocation";
import { PropertyTour } from "@/components/PropertyTour";
import { hasTour, priceUnit, type Property } from "@/lib/properties";
import { useI18n, usePageTitle } from "./I18nProvider";
import { localizeProperty } from "@/lib/localized-properties";
export function PropertyPageView({ property: source }: { property: Property }) {
  const { locale, t } = useI18n();
  const property = localizeProperty(source, locale);
  usePageTitle(`${property.title} · Home View`, property.description);
  return (
    <>
      <Header />
      <main className="section-wrap property-page">
        <Link href="/#propiedades" className="back-link">
          {t("← Volver al catálogo")}
        </Link>
        <div className="property-heading">
          <div>
            <p className="eyebrow">
              {t(property.operation).toUpperCase()}{" "}
              {t("· PROPIEDAD DE DEMOSTRACIÓN")}
            </p>
            <h1>{property.title}</h1>
            <p className="muted">
              {property.address}
              <br />
              {property.location}
            </p>
          </div>
          <div className="detail-facts">
            <span>
              <strong>{property.area}</strong> {t("m²")}
            </span>
            {property.propertyType !== "Terreno" && (
              <>
                <span>
                  <strong>{property.beds}</strong> {t("recámaras")}
                </span>
                <span>
                  <strong>{property.baths}</strong> {t("baños")}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="property-toolbar">
          <div className="property-asking-price">
            <span>
              {t(
                property.operation === "Renta"
                  ? "RENTA MENSUAL"
                  : "PRECIO DE VENTA",
              )}{" "}
              {t("· DEMO")}
            </span>
            <strong>
              {property.price}
              <small> {t(priceUnit(property))}</small>
            </strong>
          </div>
          <PropertyActions title={property.title} />
        </div>
        <PropertyGallery title={property.title} images={property.gallery} />
        <PropertySectionNav withTour={hasTour(property)} />
        <PropertyDetails property={property} />
        {hasTour(property) ? (
          <PropertyTour property={property} />
        ) : (
          <section className="no-tour">
            <h2>
              {t(
                property.propertyType === "Terreno"
                  ? "Un terreno, con toda la perspectiva."
                  : "Conoce la casa en imágenes.",
              )}
            </h2>
            <p>
              {t(
                property.propertyType === "Terreno"
                  ? "Este terreno se presenta con imágenes y ubicación; no tiene recorrido 360."
                  : "Esta casa en renta utiliza fotos convencionales. Un recorrido 360 requiere capturas panorámicas específicas.",
              )}
            </p>
          </section>
        )}
        <PropertyLocation property={property} />
        <PropertyCosts property={property} />
      </main>
      <footer className="site-footer">
        <Link href="/" className="brand">
          {t("homeview.")}
        </Link>
        <span>{t("Explora sin prisa. Imagina sin límites.")}</span>
        <span>{t("Datos e imágenes ficticias · Demo")}</span>
      </footer>
    </>
  );
}
