"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as VectorMap, Marker, StyleSpecification } from "maplibre-gl";
import type { Protocol } from "pmtiles";
import type { Property } from "@/lib/properties";

const regions = {
  León: { center: [-101.686, 21.122] as [number, number], zoom: 12 },
  Guanajuato: { center: [-101, 20.94] as [number, number], zoom: 8 },
  México: { center: [-102.55, 23.63] as [number, number], zoom: 5 },
};
type Region = keyof typeof regions;
type TileState = "loading" | "ready" | "error";
type MapLibrary = typeof import("maplibre-gl");

// Shared for all viewers in this module. Removing a protocol on unmount would
// break another map that is still reading the same local archive.
let protocolReady: Promise<void> | undefined;
let protocol: Protocol | undefined;
async function registerArchiveProtocol(library: MapLibrary) {
  if (!protocolReady) {
    protocolReady = import("pmtiles")
      .then(({ Protocol }) => {
        protocol = new Protocol();
        library.addProtocol("pmtiles", protocol.tile);
      })
      .catch((error) => {
        protocolReady = undefined;
        throw error;
      });
  }
  return protocolReady;
}

function mapStyle(origin: string): StyleSpecification {
  const tileUrl = `pmtiles://${origin}/maps/home-view.pmtiles/{z}/{x}/{y}`;
  const definitions = [
    {
      scope: "mexico",
      minzoom: 3,
      maxzoom: 7,
      bounds: [-118.5, 14.3, -86.5, 32.8],
    },
    {
      scope: "guanajuato",
      minzoom: 8,
      maxzoom: 10,
      bounds: [-102.2, 19.8, -99.6, 21.9],
    },
    {
      scope: "leon",
      minzoom: 11,
      maxzoom: 14,
      bounds: [-101.84, 20.98, -101.52, 21.26],
    },
  ] as const;
  const sources: StyleSpecification["sources"] = {};
  const layers: StyleSpecification["layers"] = [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#101e1b" },
    },
  ];
  for (const definition of definitions) {
    const source = `homeview-${definition.scope}`;
    sources[source] = {
      type: "vector",
      tiles: [tileUrl],
      minzoom: definition.minzoom,
      maxzoom: definition.maxzoom,
      bounds: [...definition.bounds],
    };
    const common = {
      source,
      "source-layer": "basemap",
      minzoom: definition.minzoom,
    };
    const filter = (
      kind: string,
    ): ["all", ["==", string, string], ["==", string, string]] => [
      "all",
      ["==", "kind", kind],
      ["==", "scope", definition.scope],
    ];
    layers.push(
      {
        ...common,
        id: `${source}-land`,
        type: "fill",
        filter: filter("land"),
        paint: { "fill-color": "#1d261c" },
      },
      {
        ...common,
        id: `${source}-urban`,
        maxzoom: definition.scope === "leon" ? 24 : definition.maxzoom + 1,
        type: "fill",
        filter: filter("urban"),
        paint: { "fill-color": "#34432a", "fill-opacity": 0.78 },
      },
      {
        ...common,
        id: `${source}-water`,
        type: "fill",
        filter: filter("water"),
        paint: { "fill-color": "#1a3b35" },
      },
      {
        ...common,
        id: `${source}-boundaries`,
        type: "line",
        filter: filter("boundary"),
        paint: {
          "line-color": "#7f9460",
          "line-width": 1.2,
          "line-dasharray": [3, 2],
        },
      },
      {
        ...common,
        id: `${source}-guanajuato`,
        type: "line",
        filter: [
          "all",
          ["==", "kind", "boundary"],
          ["==", "scope", definition.scope],
          ["==", "name", "Guanajuato"],
        ],
        paint: { "line-color": "#c5f53a", "line-width": 2 },
      },
      {
        ...common,
        id: `${source}-road-casing`,
        maxzoom: definition.scope === "leon" ? 24 : definition.maxzoom + 1,
        type: "line",
        filter: filter("road"),
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#11180e",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            1.5,
            10,
            4,
            14,
            8,
          ],
        },
      },
      {
        ...common,
        id: `${source}-roads`,
        maxzoom: definition.scope === "leon" ? 24 : definition.maxzoom + 1,
        type: "line",
        filter: filter("road"),
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "class"],
            ["motorway", "trunk"],
            "#c9ca68",
            "primary",
            "#a0b16b",
            "#7f8e76",
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.7,
            10,
            2,
            14,
            5,
          ],
        },
      },
    );
  }
  return { version: 8, sources, layers };
}

function markerPrice(property: Property) {
  if (property.operation === "Renta")
    return `${new Intl.NumberFormat("es-MX").format(property.priceValue)} / mes`;
  return property.priceValue >= 1000000
    ? `${(property.priceValue / 1000000).toFixed(2)} M`
    : new Intl.NumberFormat("es-MX").format(property.priceValue);
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
  const map = useRef<VectorMap | null>(null);
  const library = useRef<MapLibrary | null>(null);
  const propertyMarkers = useRef<Marker[]>([]);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [region, setRegion] = useState<Region>("León");
  const [zoom, setZoom] = useState(12);
  const [initialized, setInitialized] = useState(false);
  const [tileState, setTileState] = useState<TileState>("loading");
  const [generation, setGeneration] = useState(0);
  const [initializationError, setInitializationError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: VectorMap | undefined;
    let observer: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let sourceFailed = false;
    const cityMarkers: Marker[] = [];
    setInitialized(false);
    setInitializationError(false);
    setTileState("loading");
    async function initialize() {
      try {
        const M = await import("maplibre-gl");
        await registerArchiveProtocol(M);
        if (generation > 0) {
          // PMTiles retains a rejected header promise. A user-requested retry
          // gets a fresh reader without unregistering the shared protocol.
          const { PMTiles } = await import("pmtiles");
          protocol?.add(
            new PMTiles(
              new URL("/maps/home-view.pmtiles", window.location.origin).href,
            ),
          );
        }
        M.setWorkerUrl(
          new URL("/maps/maplibre-gl-worker.mjs", window.location.origin).href,
        );
        M.setWorkerCount(1);
        if (cancelled || !host.current) return;
        instance = new M.Map({
          container: host.current,
          style: mapStyle(window.location.origin),
          center: regions.León.center,
          zoom: regions.León.zoom,
          minZoom: 3,
          maxZoom: 14,
          maxBounds: [-120, 13, -85, 34],
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          scrollZoom: false,
          renderWorldCopies: false,
        });
        map.current = instance;
        library.current = M;
        const activeMap = instance;
        function markLoading() {
          if (cancelled || sourceFailed) return;
          clearTimeout(timeout);
          setTileState("loading");
          timeout = setTimeout(() => {
            if (!cancelled) {
              sourceFailed = true;
              setTileState("error");
            }
          }, 15000);
        }
        function checkReady() {
          if (cancelled || sourceFailed || !activeMap.isStyleLoaded()) return;
          if (activeMap.areTilesLoaded()) {
            clearTimeout(timeout);
            setTileState("ready");
          }
        }
        activeMap.on("dataloading", markLoading);
        activeMap.on("sourcedata", checkReady);
        activeMap.on("idle", checkReady);
        activeMap.on("error", (event) => {
          if (!cancelled && !sourceFailed)
            console.error(
              "Home View vector map:",
              event.error?.message ?? "Map rendering error",
            );
          if (!cancelled) {
            sourceFailed = true;
            clearTimeout(timeout);
            setTileState("error");
          }
        });
        activeMap.on("zoomend", () => {
          if (!cancelled) setZoom(activeMap.getZoom());
        });
        activeMap.on("load", () => {
          if (cancelled) return;
          checkReady();
        });
        for (const [name, position] of [
          ["León", [-101.686, 21.122]],
          ["Guanajuato", [-101.257, 21.019]],
          ["Ciudad de México", [-99.133, 19.433]],
        ] as const) {
          const label = document.createElement("span");
          label.className = "geo-city-label";
          label.textContent = name;
          label.setAttribute("aria-hidden", "true");
          cityMarkers.push(
            new M.Marker({ element: label, anchor: "top", offset: [0, 14] })
              .setLngLat([position[0], position[1]])
              .addTo(activeMap),
          );
        }
        observer = new ResizeObserver(() => activeMap.resize());
        observer.observe(host.current);
        markLoading();
        setRegion("León");
        setZoom(regions.León.zoom);
        setInitialized(true);
      } catch {
        if (!cancelled) {
          instance?.remove();
          instance = undefined;
          map.current = null;
          library.current = null;
          setInitializationError(true);
          setTileState("error");
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      observer?.disconnect();
      for (const marker of propertyMarkers.current) marker.remove();
      propertyMarkers.current = [];
      for (const marker of cityMarkers) marker.remove();
      instance?.remove();
      map.current = null;
      library.current = null;
    };
  }, [generation]);

  useEffect(() => {
    const M = library.current;
    const activeMap = map.current;
    if (!initialized || !M || !activeMap) return;
    for (const marker of propertyMarkers.current) marker.remove();
    propertyMarkers.current = [];
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
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        select.current(property.slug);
      });
      propertyMarkers.current.push(
        new M.Marker({ element: button, anchor: "bottom" })
          .setLngLat([point.lng, point.lat])
          .addTo(activeMap),
      );
    }
  }, [properties, selected, initialized, generation]);

  useEffect(() => {
    const property = properties.find((item) => item.slug === selected);
    if (!initialized || !map.current || !property) return;
    map.current.jumpTo({
      center: [property.coordinates.lng, property.coordinates.lat],
      zoom: Math.max(12, map.current.getZoom()),
    });
    setRegion("León");
  }, [selected, properties, initialized, generation]);

  function chooseRegion(next: Region) {
    setRegion(next);
    map.current?.jumpTo(regions[next]);
  }
  function retry() {
    setGeneration((value) => value + 1);
  }

  return (
    <div
      className="property-map geo-map"
      data-zoom={zoom}
      data-region={region}
      data-tile-state={tileState}
      data-map-engine="maplibre-pmtiles"
    >
      <div
        ref={host}
        className="geo-map-canvas"
        role="region"
        aria-label={`Mapa vectorial de ${region}`}
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
          disabled={!initialized || zoom >= 14}
          onClick={() => map.current?.zoomIn({ duration: 0 })}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar mapa"
          disabled={!initialized || zoom <= 3}
          onClick={() => map.current?.zoomOut({ duration: 0 })}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Actualizar cartografía"
          title="Actualizar cartografía"
          disabled={!initialized}
          onClick={retry}
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
            {tileState === "error"
              ? initializationError
                ? "No se pudo iniciar el visor vectorial. Comprueba que WebGL esté disponible."
                : "No se pudo cargar el mapa local. La lista de propiedades sigue disponible."
              : "Preparando el mapa de Home View…"}
          </p>
          {tileState === "error" && (
            <div className="geo-map-recovery">
              <button type="button" onClick={retry}>
                Volver a cargar mapa
              </button>
            </div>
          )}
        </div>
      )}
      <div className="geo-map-footer">
        <span>Mapa de referencia · Vías principales · Anuncios ficticios</span>
        <span className="geo-map-attribution">
          Datos:{" "}
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Natural Earth
          </a>{" "}
          · Dominio público
        </span>
      </div>
    </div>
  );
}
