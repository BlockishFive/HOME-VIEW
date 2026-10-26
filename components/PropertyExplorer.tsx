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
import { PropertyMap } from "./PropertyMap";
import { PropertyCard } from "./PropertyCard";
export function PropertyExplorer({
  properties,
  initialOperation = "Todas",
  initialType = "Todos",
}: {
  properties: Property[];
  initialOperation?: string;
  initialType?: string;
}) {
  const [operation, setOperation] = useState(initialOperation);
  const [query, setQuery] = useState("");
  const [type, setType] = useState(initialType);
  const [maxPrice, setMaxPrice] = useState(Number.POSITIVE_INFINITY);
  const [mode, setMode] = useState<"cards" | "map">("map");
  const [selection, setSelection] = useState(properties[0].slug);
  const filtered = useMemo(
    () => filterProperties(properties, query, type, maxPrice, operation),
    [properties, query, type, maxPrice, operation],
  );
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
        aria-label="Operación del catálogo"
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
            {value === "Todas"
              ? "Todas las propiedades"
              : value === "Venta"
                ? "En venta"
                : "En renta"}
          </button>
        ))}
        <Link href="/alta">
          Preparar mi anuncio <ArrowIcon />
        </Link>
      </div>
      <form
        className="search-bar"
        onSubmit={(event) => event.preventDefault()}
        role="search"
        aria-label="Buscar propiedades de demostración"
      >
        <label className="search-location">
          <span>UBICACIÓN O PROPIEDAD</span>
          <input
            placeholder="¿Dónde comienza tu próxima historia?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span>TIPO DE INMUEBLE</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option>Todos</option>
            <option value="Casa">Casas</option>
            <option value="Departamento">Departamentos</option>
            <option value="Terreno">Terrenos</option>
          </select>
        </label>
        <label>
          <span>PRESUPUESTO MÁXIMO</span>
          <select
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          >
            <option value={Number.POSITIVE_INFINITY}>Cualquier precio</option>
            {operation === "Renta" && (
              <>
                <option value={15000}>Hasta $15,000 / mes</option>
                <option value={20000}>Hasta $20,000 / mes</option>
                <option value={30000}>Hasta $30,000 / mes</option>
              </>
            )}
            <option value={3000000}>Hasta $3 millones</option>
            <option value={5000000}>Hasta $5 millones</option>
            <option value={7000000}>Hasta $7 millones</option>
          </select>
        </label>
        <button type="button" className="search-reset" onClick={clear}>
          Limpiar filtros ↺
        </button>
      </form>
      <div className="catalog-bar">
        <span role="status">
          <strong>{String(filtered.length).padStart(2, "0")}</strong>{" "}
          propiedades para explorar
        </span>
        <div
          className="view-toggle"
          role="group"
          aria-label="Vista de resultados"
        >
          <button onClick={() => setMode("map")} aria-pressed={mode === "map"}>
            ⌖ Mapa + lista
          </button>
          <button
            onClick={() => setMode("cards")}
            aria-pressed={mode === "cards"}
          >
            ▦ Tarjetas
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-results">
          <span>⌕</span>
          <h3>No encontramos espacios con esos filtros.</h3>
          <p>Prueba otra ubicación o amplía tu presupuesto.</p>
          <button className="button button-dark" onClick={clear}>
            Ver todas las propiedades <ArrowIcon />
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
                <span className="eyebrow">SELECCIONADA EN EL MAPA</span>
                <strong>
                  {selected.title}
                  <span>{selected.location}</span>
                </strong>
              </div>
              <div>
                <small>Predial anual (demo)</small>
                <strong>
                  {formatMXN(selected.annualTax)} <small>MXN</small>
                </strong>
              </div>
              <Link
                className="button button-dark"
                href={`/propiedades/${selected.slug}`}
              >
                {hasTour(selected) ? "Explorar en 360°" : "Ver inmueble"}{" "}
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
                    ? "Seleccionada en el mapa"
                    : `Ubicar ${property.title} en el mapa`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="demo-note">
        Mapa vectorial propio de referencia · Anuncios, precios y posiciones de
        demostración ficticios. La renta se expresa por mes. Las galerías
        comparten ilustraciones; no representan domicilios reales.
      </p>
    </>
  );
}
