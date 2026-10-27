"use client";
import { ArrowIcon } from "@/components/ArrowIcon";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  filterProperties,
  formatMXN,
  hasTour,
  type Property,
} from "@/lib/properties";
import { rentalSummary } from "@/lib/property-terms";
import { PropertyMap } from "./PropertyMap";
import { PropertyCard } from "./PropertyCard";
import { localizeProperty } from "@/lib/localized-properties";
import { useI18n } from "./I18nProvider";
export function PropertyExplorer({
  properties,
  initialOperation = "Todas",
  initialType = "Todos",
}: {
  properties: Property[];
  initialOperation?: string;
  initialType?: string;
}) {
  const { locale, t } = useI18n();
  const localizedItems = useMemo(
    () => properties.map((property) => localizeProperty(property, locale)),
    [properties, locale],
  );
  const [operation, setOperation] = useState(initialOperation);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(initialType);
  const [maxPrice, setMaxPrice] = useState(Number.POSITIVE_INFINITY);
  const [mode, setMode] = useState<"cards" | "map">("map");
  const [selection, setSelection] = useState(properties[0].slug);
  // Search both catalog languages so changing language does not invalidate a typed query.
  const englishItems = useMemo(
    () => properties.map((property) => localizeProperty(property, "en")),
    [properties],
  );
  const filtered = useMemo(() => {
    const matchingSlugs = new Set(
      [
        ...filterProperties(properties, query, type, maxPrice, operation),
        ...filterProperties(englishItems, query, type, maxPrice, operation),
      ].map((property) => property.slug),
    );
    return localizedItems.filter((property) =>
      matchingSlugs.has(property.slug),
    );
  }, [
    properties,
    englishItems,
    localizedItems,
    query,
    type,
    maxPrice,
    operation,
  ]);
  const selected = filtered.find((p) => p.slug === selection) ?? filtered[0];
  function clear() {
    setQuery("");
    setType(initialType);
    setOperation(initialOperation);
    setMaxPrice(Number.POSITIVE_INFINITY);
  }
  return (
    <>
      <div
        className="operation-tabs"
        role="group"
        aria-label={t("Operación del catálogo")}
      >
        {["Todas", "Venta", "Renta"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={operation === value}
            onClick={() => {
              setOperation(value);
              setMaxPrice(Number.POSITIVE_INFINITY);
            }}
          >
            {t(
              value === "Todas"
                ? "Todas las propiedades"
                : value === "Venta"
                  ? "En venta"
                  : "En renta",
            )}
          </button>
        ))}
        <Link href="/alta">
          {t("Preparar mi anuncio")} <ArrowIcon />
        </Link>
      </div>
      <form
        className="search-bar"
        onSubmit={(event) => event.preventDefault()}
        role="search"
        aria-label={t("Buscar propiedades de demostración")}
      >
        <label className="search-location">
          <span>{t("UBICACIÓN O PROPIEDAD")}</span>
          <input
            placeholder={t("¿Dónde comienza tu próxima historia?")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>{t("TIPO DE INMUEBLE")}</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="Todos">{t("Todos")}</option>
            <option value="Casa">{t("Casas")}</option>
            <option value="Departamento">{t("Departamentos")}</option>
            <option value="Terreno">{t("Terrenos")}</option>
          </select>
        </label>
        <label>
          <span>{t("PRESUPUESTO MÁXIMO")}</span>
          <select
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          >
            <option value={Number.POSITIVE_INFINITY}>
              {t("Cualquier precio")}
            </option>
            {operation === "Renta" && (
              <>
                <option value={15000}>{t("Hasta $15,000 / mes")}</option>
                <option value={20000}>{t("Hasta $20,000 / mes")}</option>
                <option value={30000}>{t("Hasta $30,000 / mes")}</option>
              </>
            )}
            <option value={3000000}>{t("Hasta $3 millones")}</option>
            <option value={5000000}>{t("Hasta $5 millones")}</option>
            <option value={7000000}>{t("Hasta $7 millones")}</option>
          </select>
        </label>
        <button type="button" className="search-reset" onClick={clear}>
          {t("Limpiar filtros ↺")}
        </button>
      </form>
      <div className="catalog-bar">
        <span role="status">
          <strong>{String(filtered.length).padStart(2, "0")}</strong>{" "}
          {t("propiedades para explorar")}
        </span>
        <div
          className="view-toggle"
          role="group"
          aria-label={t("Vista de resultados")}
        >
          <button onClick={() => setMode("map")} aria-pressed={mode === "map"}>
            {t("⌖ Mapa + lista")}
          </button>
          <button
            onClick={() => setMode("cards")}
            aria-pressed={mode === "cards"}
          >
            {t("▦ Tarjetas")}
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-results">
          <span>⌕</span>
          <h3>{t("No encontramos espacios con esos filtros.")}</h3>
          <p>{t("Prueba otra ubicación o amplía tu presupuesto.")}</p>
          <button className="button button-dark" onClick={clear}>
            {t("Ver todas las propiedades")} <ArrowIcon />
          </button>
        </div>
      ) : mode === "cards" ? (
        <div className="property-grid">
          {filtered.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      ) : (
        <div className="explorer-layout">
          <div className="explorer-map">
            <PropertyMap
              properties={filtered}
              selected={selected.slug}
              onSelect={setSelection}
            />
            <div className="selected-property" aria-live="polite">
              <div>
                <span className="eyebrow">{t("SELECCIONADA EN EL MAPA")}</span>
                <strong>
                  {selected.title}
                  <span>{selected.location}</span>
                </strong>
              </div>
              <div>
                {selected.operation === "Renta" ? (
                  <>
                    <small>{t("Renta mensual")}</small>
                    <strong>
                      {rentalSummary(
                        selected.rental,
                        selected.maintenance,
                        locale,
                      )}
                    </strong>
                  </>
                ) : (
                  <>
                    <small>{t("Predial anual (demo)")}</small>
                    <strong>
                      {selected.sale.annualTax === null
                        ? t("Por confirmar")
                        : `${formatMXN(selected.sale.annualTax, locale)} MXN`}
                    </strong>
                  </>
                )}
              </div>
              <Link
                className="button button-dark"
                href={`/propiedades/${selected.slug}`}
              >
                {t(hasTour(selected) ? "Explorar en 360°" : "Ver inmueble")}{" "}
                <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="map-results">
            {filtered.map((property) => (
              <div
                key={property.slug}
                className={`map-result ${selected.slug === property.slug ? "active" : ""}`}
              >
                <PropertyCard property={property} />
                <button
                  className="locate-button"
                  onClick={() => setSelection(property.slug)}
                  aria-pressed={selected.slug === property.slug}
                >
                  ⌖{" "}
                  {selected.slug === property.slug
                    ? t("Seleccionada en el mapa")
                    : t("Ubicar {name} en el mapa", { name: property.title })}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="demo-note">
        {t(
          "Mapa vectorial propio de referencia · Anuncios, precios y posiciones de demostración ficticios. La renta se expresa por mes. Las galerías comparten ilustraciones; no representan domicilios reales.",
        )}
      </p>
    </>
  );
}
