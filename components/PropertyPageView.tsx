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
  usePageTitle(
    `${property.title} · Home View`,
    property.description,
    !!property.published,
  );
  return <PropertyPageContent property={source} />;
}
export function PropertyPageContent({
  property: source,
  preview = false,
}: {
  property: Property;
  preview?: boolean;
}) {
  const { locale, t } = useI18n();
  const property = localizeProperty(source, locale);
  const Container = preview ? "div" : "main";
  return (
    <>
      {!preview && <Header />}
      <Container
        className={`section-wrap property-page${preview ? " property-page-preview" : ""}`}
      >
        {!preview && (
          <Link href="/#propiedades" className="back-link">
            {t("← Volver al catálogo")}
          </Link>
        )}
        <div className="property-heading">
          <div>
            <p className="eyebrow">
              {t(property.operation).toUpperCase()}{" "}
              {t(
                preview
                  ? "· VISTA PREVIA · SIN PUBLICAR"
                  : property.published
                    ? "· PROPIEDAD PUBLICADA"
                    : "· PROPIEDAD DE DEMOSTRACIÓN",
              )}
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
                  <strong>{property.beds ?? t("Por confirmar")}</strong>{" "}
                  {t("recámaras")}
                </span>
                <span>
                  <strong>{property.baths ?? t("Por confirmar")}</strong>{" "}
                  {t("baños")}
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
              {!property.published && t("· DEMO")}
            </span>
            <strong>
              {property.price}
              <small> {t(priceUnit(property))}</small>
            </strong>
          </div>
          {!preview && <PropertyActions title={property.title} />}
        </div>
        <PropertyGallery title={property.title} images={property.gallery} />
        {!preview && <PropertySectionNav withTour={hasTour(property)} />}
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
                  : "Este inmueble se presenta con fotografías. El recorrido 360 aún no está disponible.",
              )}
            </p>
          </section>
        )}
        <PropertyLocation property={property} />
        <PropertyCosts property={property} />
      </Container>
      {!preview && (
        <footer className="site-footer">
          <Link href="/" className="brand">
            {t("homeview.")}
          </Link>
          <span>{t("Explora sin prisa. Imagina sin límites.")}</span>
          <span>
            {t(
              property.published
                ? "Propiedad publicada por la administración"
                : "Datos e imágenes ficticias · Demo",
            )}
          </span>
        </footer>
      )}
    </>
  );
}
