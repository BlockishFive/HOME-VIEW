"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Property } from "@/lib/properties";

const regions = {
  León: { center: [21.122, -101.686] as [number, number], zoom: 13 },
  Guanajuato: { center: [20.94, -101.0] as [number, number], zoom: 8 },
  México: { center: [23.63, -102.55] as [number, number], zoom: 5 },
};
type Region = keyof typeof regions;
type TileState = "loading" | "ready" | "error";

function markerPrice(property: Property) {
  if (property.operation === "Renta") {
    return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(property.priceValue)} / mes`;
  }
  return property.priceValue >= 1000000
    ? `${(property.priceValue / 1000000).toFixed(2)} M`
    : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(
        property.priceValue,
      );
}

export function PropertyMap({
  properties,
  selected,
  onSelect,
}: {
  properties: Property[];
  selected: string;
  onSelect: (slug: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const library = useRef<typeof Leaflet | null>(null);
  const markers = useRef<Leaflet.LayerGroup | null>(null);
  const retry = useRef<(() => void) | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [region, setRegion] = useState<Region>("León");
  const [zoom, setZoom] = useState(13);
  const [initialized, setInitialized] = useState(false);
  const [tileState, setTileState] = useState<TileState>("loading");
  const [initializationError, setInitializationError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
    async function initialize() {
      try {
        const module = await import("leaflet");
        const L = module.default ?? module;
        if (cancelled || !host.current) return;
        instance = L.map(host.current, {
          center: regions.León.center,
          zoom: regions.León.zoom,
          minZoom: 4,
          maxZoom: 19,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
        });
        map.current = instance;
        library.current = L;
        markers.current = L.layerGroup().addTo(instance);
        // Keep failures until that exact tile succeeds or leaves the layer.
        // A partial pan may retain failed tiles from the previous request batch.
        const failedTiles = new Set<string>();
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            minZoom: 4,
            maxZoom: 19,
            // Codespaces can set a restrictive document policy. Send the real
            // site origin to OSM, without sharing paths or query parameters.
            referrerPolicy: "strict-origin-when-cross-origin",
            // Normal interactive use only: no background prefetch or offline downloads.
            updateWhenIdle: true,
            keepBuffer: 1,
          },
        );
        const tileKey = (coords: Leaflet.Coords) =>
          `${coords.z}/${coords.x}/${coords.y}`;
        function updateTileState() {
          if (cancelled) return;
          clearTimeout(loadingTimeout);
          if (failedTiles.size) setTileState("error");
          else if (tiles.isLoading()) {
            setTileState("loading");
            loadingTimeout = setTimeout(() => {
              if (!cancelled) setTileState("error");
            }, 15000);
          } else setTileState("ready");
        }
        retry.current = () => {
          failedTiles.clear();
          setTileState("loading");
          tiles.redraw();
        };
        tiles.on("loading", updateTileState);
        tiles.on("tileerror", (event: Leaflet.TileErrorEvent) => {
          failedTiles.add(tileKey(event.coords));
          updateTileState();
        });
        tiles.on("tileload", (event: Leaflet.TileEvent) => {
          failedTiles.delete(tileKey(event.coords));
          updateTileState();
        });
        tiles.on("tileunload", (event: Leaflet.TileEvent) => {
          failedTiles.delete(tileKey(event.coords));
          updateTileState();
        });
        tiles.on("load", updateTileState);
        tiles.addTo(instance);
        const activeMap = instance;
        activeMap.on("zoomend", () => {
          if (!cancelled) setZoom(activeMap.getZoom());
        });
        observer = new ResizeObserver(() =>
          activeMap.invalidateSize({ pan: false }),
        );
        observer.observe(host.current);
        setInitialized(true);
      } catch {
        if (!cancelled) {
          instance?.remove();
          instance = undefined;
          map.current = null;
          markers.current = null;
          setInitializationError(true);
          setTileState("error");
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      retry.current = null;
      observer?.disconnect();
      instance?.remove();
      map.current = null;
      library.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    const L = library.current;
    const group = markers.current;
    if (!initialized || !L || !group) return;
    group.clearLayers();
    for (const property of properties) {
      const point = property.coordinates;
      if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng))
        continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `geo-marker${selected === property.slug ? " selected" : ""}`;
      button.setAttribute("aria-pressed", String(selected === property.slug));
      button.setAttribute(
        "aria-label",
        `Seleccionar ${property.title} en el mapa, ${property.price} MXN${property.operation === "Renta" ? " por mes" : ""}`,
      );
      button.textContent = markerPrice(property);
      button.addEventListener("click", () => select.current(property.slug));
      L.DomEvent.disableClickPropagation(button);
      const icon = L.divIcon({
        html: button,
        className: "geo-marker-shell",
        iconSize: [112, 40],
        iconAnchor: [56, 40],
      });
      L.marker([point.lat, point.lng], { icon, keyboard: false }).addTo(group);
    }
  }, [properties, selected, initialized]);

  useEffect(() => {
    const property = properties.find((item) => item.slug === selected);
    const point = property?.coordinates;
    if (!initialized || !map.current || !point) return;
    map.current.setView(
      [point.lat, point.lng],
      Math.max(12, map.current.getZoom()),
      { animate: false },
    );
    setRegion("León");
  }, [selected, properties, initialized]);

  function chooseRegion(next: Region) {
    setRegion(next);
    map.current?.setView(regions[next].center, regions[next].zoom, {
      animate: false,
    });
  }

  return (
    <div
      className="property-map geo-map"
      data-zoom={zoom}
      data-region={region}
      data-tile-state={tileState}
    >
      <div
        ref={host}
        className="geo-map-canvas"
        role="region"
        aria-label={`Mapa geográfico de ${region}`}
      />
      <div
        className="geo-region-buttons"
        role="group"
        aria-label="Alcance del mapa"
      >
        {(Object.keys(regions) as Region[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => chooseRegion(name)}
            aria-pressed={region === name}
            disabled={!initialized}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="geo-map-controls"
        role="group"
        aria-label="Controles del mapa"
      >
        <button
          type="button"
          aria-label="Acercar mapa"
          disabled={!initialized || zoom >= 19}
          onClick={() => map.current?.zoomIn(undefined, { animate: false })}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar mapa"
          disabled={!initialized || zoom <= 4}
          onClick={() => map.current?.zoomOut(undefined, { animate: false })}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Actualizar cartografía"
          title="Actualizar cartografía"
          disabled={!initialized}
          onClick={() => retry.current?.()}
        >
          ↻
        </button>
        <button
          type="button"
          aria-label="Restablecer mapa"
          disabled={!initialized}
          onClick={() => chooseRegion("León")}
        >
          ⌖
        </button>
      </div>
      {tileState !== "ready" && (
        <div
          className={`geo-map-notice${tileState === "error" ? " geo-map-error" : ""}`}
          aria-live="polite"
        >
          <p>
            {initializationError
              ? "No se pudo iniciar el mapa. Recarga el visor para volver a intentarlo."
              : tileState === "error"
                ? "La cartografía no está disponible o tardó demasiado en cargar. Puedes reintentar; la lista y los marcadores siguen disponibles."
                : "Cargando cartografía de OpenStreetMap…"}
          </p>
          {tileState === "error" && (
            <div className="geo-map-recovery">
              <button
                type="button"
                onClick={() =>
                  initializationError
                    ? window.location.reload()
                    : retry.current?.()
                }
              >
                Volver a cargar mapa
              </button>
              <a
                href={`https://www.openstreetmap.org/#map=${regions[region].zoom}/${regions[region].center[0]}/${regions[region].center[1]}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver {region} en OpenStreetMap ↗
              </a>
            </div>
          )}
        </div>
      )}
      <div className="geo-map-footer">
        <span>
          Geografía real · Anuncios demo con ubicaciones aproximadas ficticias
        </span>
        <span className="geo-map-attribution">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener"
          >
            OpenStreetMap contributors
          </a>{" "}
          · ODbL
        </span>
      </div>
    </div>
  );
}
