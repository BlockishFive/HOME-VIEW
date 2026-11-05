"use client";
import { useI18n } from "./I18nProvider";
import {
  externalMapLinks,
  hasVisitAccess,
  visitAccessPoint,
  type VisitAccess,
} from "@/lib/visit-access";
import type { Point } from "@/lib/location";
export function MapReferenceLinks({ point }: { point: Point }) {
  const { t } = useI18n(),
    links = externalMapLinks(point);
  return (
    <div className="map-reference-links">
      <p>
        {t(
          "Al abrir un enlace externo compartirás esas coordenadas con el proveedor. No se envían notas privadas ni se consulta automáticamente.",
        )}
      </p>
      <a href={links.osm} target="_blank" rel="noopener noreferrer">
        {t("Comparar en OpenStreetMap")}
      </a>
      <a href={links.google} target="_blank" rel="noopener noreferrer">
        {t("Comparar en Google Maps")}
      </a>
      <a href={links.directions} target="_blank" rel="noopener noreferrer">
        {t("Indicaciones en Google Maps")}
      </a>
    </div>
  );
}
export function VisitAccessDetails({ access }: { access?: VisitAccess }) {
  const { t } = useI18n();
  if (!hasVisitAccess(access)) return null;
  const point = visitAccessPoint(access);
  return (
    <section
      className="visit-access-details"
      aria-label={t("Referencia privada de acceso")}
    >
      <h3>{t("Acceso para visitas · Solo privado")}</h3>
      <p>
        {t(
          "Esta referencia no aparece en el catálogo, la ficha pública ni sus mapas.",
        )}
      </p>
      {point && (
        <p>
          {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
        </p>
      )}
      {access?.notes && <p className="visit-access-notes">{access.notes}</p>}
      {point && <MapReferenceLinks point={point} />}
    </section>
  );
}
