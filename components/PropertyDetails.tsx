"use client";
import { useI18n } from "./I18nProvider";
import { localizeProperty } from "@/lib/localized-properties";
import { type Property } from "@/lib/properties";
import {
  communityLabel,
  formatMXN,
  maintenanceLabel,
} from "@/lib/property-terms";
export function PropertyDetails({
  property: sourceProperty,
}: {
  property: Property;
}) {
  const { locale, t } = useI18n();
  const property = localizeProperty(sourceProperty, locale);
  const facts = [
    ["Tipo de inmueble", property.propertyType],
    ["Tipo de construcción", property.buildingType],
    [
      "Niveles",
      property.propertyType === "Terreno"
        ? "No aplica"
        : String(property.levels),
    ],
    [
      property.propertyType === "Terreno"
        ? "Superficie de terreno anunciada"
        : "Superficie construida",
      `${property.area} m²`,
    ],
    ["Colonia / barrio", property.neighborhood],
    ["Localidad", "León, Guanajuato · Ubicación demo"],
    ["Régimen de propiedad", property.ownership],
    [
      "Superficie de terreno",
      property.plotArea === null
        ? "No especificada"
        : `${property.plotArea} m²`,
    ],
    [
      "Año de construcción",
      property.propertyType === "Terreno"
        ? "No aplica"
        : String(property.builtYear),
    ],
    ...(property.operation === "Venta"
      ? [
          [
            "Predial anual (demo)",
            property.sale.annualTax === null
              ? "Por confirmar"
              : `${formatMXN(property.sale.annualTax, locale)} MXN`,
          ],
        ]
      : []),
    [
      "Estacionamientos",
      property.propertyType === "Terreno"
        ? "No aplica"
        : String(property.parking),
    ],
    [
      "Recámaras / baños",
      property.propertyType === "Terreno"
        ? "No aplica"
        : `${property.beds} / ${property.baths}`,
    ],
    ["Operación", `${t(property.operation)} · ${t("Demostración")}`],
    ["Referencia del anuncio", property.reference],
    [
      "Mantenimiento (demo)",
      maintenanceLabel(
        property.maintenance,
        property.operation === "Renta",
        locale,
      ),
    ],
    [
      "Fraccionamiento o condominio",
      communityLabel(property.community, locale),
    ],
    ["Estado del anuncio", "Prototipo · Sin oferta real"],
  ];
  return (
    <section
      id="resumen"
      className="property-details"
      aria-labelledby="description-title"
      tabIndex={-1}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("LA HISTORIA DETRÁS DEL ESPACIO")}</p>
          <h2 id="description-title">{t("Descripción del inmueble")}</h2>
        </div>
        <span className="demo-pill">{t("Datos ficticios")}</span>
      </div>
      <p className="listing-description">{property.description}</p>
      <div className="feature-tags">
        {property.features.map((feature) => (
          <span key={feature}>✓ {feature}</span>
        ))}
      </div>
      <div className="summary-heading">
        <h3>{t("Resumen del inmueble")}</h3>
        <span>{t("Todo lo esencial, en un vistazo.")}</span>
      </div>
      <dl className="property-summary">
        {facts.map(([name, value]) => (
          <div key={name}>
            <dt>{t(name)}</dt>
            <dd>{t(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="demo-note">
        {t(
          "Ficha ilustrativa. Imágenes y plano compartidos entre inmuebles de demostración; no representan sus superficies ni características. Los regímenes indicados son ficticios y no acreditan titularidad o situación jurídica.",
        )}
      </p>
    </section>
  );
}
