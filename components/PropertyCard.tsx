"use client";
import { ArrowIcon } from "@/components/ArrowIcon";
import Image from "next/image";
import Link from "next/link";
import { hasTour, type Property } from "@/lib/properties";
import { maintenanceLabel, rentalSummary } from "@/lib/property-terms";
import { localizeProperty } from "@/lib/localized-properties";
import { useI18n } from "./I18nProvider";
export function PropertyCard({ property: source }: { property: Property }) {
  const { locale, t } = useI18n();
  const property = localizeProperty(source, locale);
  return (
    <Link href={`/propiedades/${property.slug}`} className="property-card">
      <div className="card-image">
        <Image
          src={property.cover}
          alt={t("Ilustración sintética de {name}", { name: property.title })}
          fill
          sizes="(max-width: 700px) 100vw, 33vw"
        />
        <span className="image-label">
          {t(hasTour(property) ? "↻ Recorrido 360°" : "Galería de imágenes")}
        </span>
        <span className="card-arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </div>
      <div className="card-body">
        <p className="eyebrow">{property.tag}</p>
        <div className="card-title">
          <h3>{property.title}</h3>
          <span>
            {property.price}
            <small>
              {" "}
              {t(property.operation === "Renta" ? "MXN / mes" : "MXN")}
            </small>
          </span>
        </div>
        <p className="card-cost-summary">
          {property.operation === "Renta"
            ? rentalSummary(property.rental, property.maintenance, locale)
            : t("Mantenimiento: {amount}", {
                amount: maintenanceLabel(property.maintenance, false, locale),
              })}
        </p>
        <p className="muted location">{property.location}</p>
        <div className="card-facts">
          <span>{property.area} m²</span>
          {property.propertyType === "Terreno" ? (
            <span>
              {t("Terreno")} · {t(property.operation)}
            </span>
          ) : (
            <>
              <span>{t("{count} recámaras", { count: property.beds })}</span>
              <span>{t("{count} baños", { count: property.baths })}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
