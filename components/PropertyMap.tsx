"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as VectorMap, Marker, StyleSpecification } from "maplibre-gl";
import type { Protocol } from "pmtiles";
import type { Property } from "@/lib/properties";
import { useI18n } from "./I18nProvider";
import { streetMapStyle } from "@/lib/street-map-style";
import { validPoint, type Point } from "@/lib/location";
import { translate, type Locale } from "@/lib/i18n";

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

function markerPrice(property: Property, locale: Locale) {
  if (property.operation === "Renta")
    return translate(locale, "{amount} / mes", {
      amount: new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX").format(
        property.priceValue,
      ),
    });
  return property.priceValue >= 1000000
    ? `${(property.priceValue / 1000000).toFixed(2)} M`
    : new Intl.NumberFormat("es-MX").format(property.priceValue);
}

export function PropertyMap({
  properties,
  selected,
  onSelect,
  capture,
}: {
  properties: Property[];
  selected: string;
  onSelect: (slug: string) => void;
  capture?: {
    point: Point;
    onChange: (point: Point) => void;
    label?: string;
    reference?: { point: Point; label: string };
  };
}) {
  const { locale, t } = useI18n();
  const [streets, setStreets] = useState(false);
  const captureRef = useRef(capture);
  captureRef.current = capture;
  const captureMarker = useRef<Marker | null>(null);
  const referenceMarker = useRef<Marker | null>(null);
  const lastCapturePoint = useRef("");
  const [expanded, setExpanded] = useState(false);
  const maxZoom = streets ? 19 : 14;
  const cityLabels = useRef<{ element: HTMLSpanElement; name: string }[]>([]);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<VectorMap | null>(null);
  const library = useRef<MapLibrary | null>(null);
  const propertyMarkers = useRef<Marker[]>([]);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const view = useRef<{
    center: [number, number];
    zoom: number;
    region: Region;
  } | null>(null);
  const lastSelection = useRef("");
  const select = useRef(onSelect);
  select.current = onSelect;
  const [region, setRegion] = useState<Region>("León");
  const [zoom, setZoom] = useState(12);
  const [initialized, setInitialized] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
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
          style: streets
            ? streetMapStyle(localeRef.current)
            : mapStyle(window.location.origin),
          center:
            view.current?.center ??
            (captureRef.current && validPoint(captureRef.current.point)
              ? [captureRef.current.point.lng, captureRef.current.point.lat]
              : captureRef.current?.reference &&
                  validPoint(captureRef.current.reference.point)
                ? [
                    captureRef.current.reference.point.lng,
                    captureRef.current.reference.point.lat,
                  ]
                : regions.León.center),
          zoom: Math.min(view.current?.zoom ?? regions.León.zoom, maxZoom),
          minZoom: 3,
          maxZoom,
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
        if (captureRef.current) {
          const marker = new M.Marker({ color: "#c5f53a", draggable: true });
          captureMarker.current = marker;
          if (validPoint(captureRef.current.point))
            marker
              .setLngLat([
                captureRef.current.point.lng,
                captureRef.current.point.lat,
              ])
              .addTo(activeMap);
          marker.on("dragend", () => {
            const point = marker.getLngLat();
            if (validPoint(point))
              captureRef.current?.onChange({
                lat: Number(point.lat.toFixed(6)),
                lng: Number(point.lng.toFixed(6)),
              });
            else if (captureRef.current && validPoint(captureRef.current.point))
              marker.setLngLat(captureRef.current.point);
          });
          activeMap.on("click", (event) => {
            if (validPoint(event.lngLat))
              captureRef.current?.onChange({
                lat: Number(event.lngLat.lat.toFixed(6)),
                lng: Number(event.lngLat.lng.toFixed(6)),
              });
          });
        }
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
        if (!streets)
          for (const [name, position] of [
            ["León", [-101.686, 21.122]],
            ["Guanajuato", [-101.257, 21.019]],
            ["Ciudad de México", [-99.133, 19.433]],
          ] as const) {
            const label = document.createElement("span");
            label.className = "geo-city-label";
            label.textContent = t(name);
            cityLabels.current.push({ element: label, name });
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
        setRegion(view.current?.region ?? "León");
        setZoom(activeMap.getZoom());
        setInitialized(true);
        setMapVersion((version) => version + 1);
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
      if (instance) {
        const center = instance.getCenter();
        view.current = {
          center: [center.lng, center.lat],
          zoom: instance.getZoom(),
          region: view.current?.region ?? "León",
        };
      }
      clearTimeout(timeout);
      observer?.disconnect();
      for (const marker of propertyMarkers.current) marker.remove();
      propertyMarkers.current = [];
      for (const marker of cityMarkers) marker.remove();
      cityLabels.current = [];
      captureMarker.current?.remove();
      captureMarker.current = null;
      referenceMarker.current?.remove();
      referenceMarker.current = null;
      instance?.remove();
      map.current = null;
      library.current = null;
    };
  }, [generation, streets]);

  useEffect(() => {
    if (!capture || !initialized) return;
    if (validPoint(capture.point)) {
      captureMarker.current?.setLngLat(capture.point).addTo(map.current!);
      const element = captureMarker.current?.getElement();
      element?.setAttribute(
        "aria-label",
        t(capture.label ?? "Punto privado del inmueble"),
      );
      element?.setAttribute(
        "title",
        t(capture.label ?? "Punto privado del inmueble"),
      );
      const key = `${capture.point.lat}:${capture.point.lng}`;
      if (lastCapturePoint.current !== key)
        map.current?.jumpTo({ center: [capture.point.lng, capture.point.lat] });
      lastCapturePoint.current = key;
    } else {
      captureMarker.current?.remove();
      lastCapturePoint.current = "";
    }
  }, [
    capture?.point.lat,
    capture?.point.lng,
    initialized,
    streets,
    mapVersion,
    capture?.label,
    locale,
  ]);
  useEffect(() => {
    referenceMarker.current?.remove();
    referenceMarker.current = null;
    const reference = capture?.reference;
    if (
      !reference ||
      !validPoint(reference.point) ||
      !initialized ||
      !library.current ||
      !map.current
    )
      return;
    const marker = new library.current.Marker({ color: "#edda62" })
      .setLngLat(reference.point)
      .addTo(map.current);
    marker.getElement().setAttribute("aria-label", t(reference.label));
    marker.getElement().setAttribute("title", t(reference.label));
    referenceMarker.current = marker;
    return () => {
      marker.remove();
      if (referenceMarker.current === marker) referenceMarker.current = null;
    };
  }, [
    capture?.reference?.point.lat,
    capture?.reference?.point.lng,
    capture?.reference?.label,
    initialized,
    mapVersion,
    locale,
  ]);

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
        t("Seleccionar {name} en el mapa, {price} MXN{period}", {
          name: property.title,
          price: property.price,
          period: property.operation === "Renta" ? ` ${t("por mes")}` : "",
        }),
      );
      button.textContent = markerPrice(property, locale);
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
  }, [properties, selected, initialized, generation, locale, mapVersion]);

  const selectedPoint = properties.find(
    (item) => item.slug === selected,
  )?.coordinates;
  useEffect(() => {
    const property = properties.find((item) => item.slug === selected);
    if (!initialized || !map.current || !property) return;
    const key = `${property.slug}:${property.coordinates.lat}:${property.coordinates.lng}`;
    if (view.current && lastSelection.current === key) return;
    lastSelection.current = key;
    const nextZoom = Math.max(12, map.current.getZoom());
    map.current.jumpTo({
      center: [property.coordinates.lng, property.coordinates.lat],
      zoom: nextZoom,
    });
    view.current = {
      center: [property.coordinates.lng, property.coordinates.lat],
      zoom: nextZoom,
      region: "León",
    };
    setRegion("León");
  }, [
    selected,
    selectedPoint?.lat,
    selectedPoint?.lng,
    mapVersion,
    initialized,
    generation,
  ]);

  useEffect(() => {
    if (streets && map.current?.isStyleLoaded()) {
      const style = streetMapStyle(locale);
      for (const layer of style.layers)
        if (
          layer.type === "symbol" &&
          layer.layout?.["text-field"] &&
          map.current.getLayer(layer.id)
        )
          map.current.setLayoutProperty(
            layer.id,
            "text-field",
            layer.layout["text-field"],
          );
    }
    for (const label of cityLabels.current)
      label.element.textContent = t(label.name);
    host.current
      ?.querySelector("canvas")
      ?.setAttribute(
        "aria-label",
        t("Mapa vectorial de {region}", { region: t(region) }),
      );
  }, [locale, region, initialized, mapVersion, streets, tileState]);

  function chooseRegion(next: Region) {
    setRegion(next);
    if (view.current) view.current.region = next;
    else
      view.current = {
        center: regions[next].center,
        zoom: regions[next].zoom,
        region: next,
      };
    map.current?.jumpTo(regions[next]);
  }
  function retry() {
    setGeneration((value) => value + 1);
  }

  return (
    <div className={`map-view${expanded ? " map-view-expanded" : ""}`}>
      <p className="geo-provider-notice">
        {t(
          "Al activar calles detalladas, OpenFreeMap recibe tu IP y el área consultada. Requiere internet; no garantiza cobertura completa ni precisión catastral.",
        )}
      </p>
      <div className="geo-layer-buttons">
        {capture && (
          <>
            {capture.reference && (
              <button
                type="button"
                disabled={
                  !initialized ||
                  !validPoint(capture.point) ||
                  !validPoint(capture.reference.point)
                }
                onClick={() => {
                  const other = capture.reference?.point;
                  if (other && validPoint(other) && validPoint(capture.point))
                    map.current?.fitBounds(
                      [
                        [
                          Math.min(other.lng, capture.point.lng),
                          Math.min(other.lat, capture.point.lat),
                        ],
                        [
                          Math.max(other.lng, capture.point.lng),
                          Math.max(other.lat, capture.point.lat),
                        ],
                      ],
                      { padding: 64, maxZoom: streets ? 17 : 14, duration: 0 },
                    );
                }}
              >
                {t("Ver inmueble y acceso")}
              </button>
            )}
            <button
              type="button"
              aria-pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {t(
                expanded
                  ? "Reducir mapa de captura"
                  : "Ampliar mapa de captura",
              )}
            </button>
            <button
              type="button"
              disabled={
                !initialized ||
                (!validPoint(capture.point) && !capture.reference)
              }
              onClick={() => {
                const point = validPoint(capture.point)
                  ? capture.point
                  : capture.reference?.point;
                if (point && validPoint(point))
                  map.current?.jumpTo({
                    center: [point.lng, point.lat],
                    zoom: streets ? 17 : 14,
                  });
              }}
            >
              {t("Centrar referencia de captura")}
            </button>
          </>
        )}
        <button
          type="button"
          aria-pressed={streets}
          onClick={() => setStreets(!streets)}
        >
          {t(
            streets
              ? "Usar mapa de respaldo"
              : "Calles detalladas · OpenFreeMap",
          )}
        </button>
      </div>
      <div
        className="property-map geo-map"
        data-zoom={zoom}
        data-region={region}
        data-tile-state={tileState}
        data-map-engine={streets ? "maplibre-openfreemap" : "maplibre-pmtiles"}
      >
        <div
          ref={host}
          className="geo-map-canvas"
          role="region"
          aria-label={t("Mapa vectorial de {region}", { region: t(region) })}
        />

        <div
          className="geo-region-buttons"
          role="group"
          aria-label={t("Alcance del mapa")}
        >
          {(Object.keys(regions) as Region[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => chooseRegion(name)}
              aria-pressed={region === name}
              disabled={!initialized}
            >
              {t(name)}
            </button>
          ))}
        </div>
        <div
          className="geo-map-controls"
          role="group"
          aria-label={t("Controles del mapa")}
        >
          <button
            type="button"
            aria-label={t("Acercar mapa")}
            disabled={!initialized || zoom >= maxZoom}
            onClick={() => map.current?.zoomIn({ duration: 0 })}
          >
            +
          </button>
          <button
            type="button"
            aria-label={t("Alejar mapa")}
            disabled={!initialized || zoom <= 3}
            onClick={() => map.current?.zoomOut({ duration: 0 })}
          >
            −
          </button>
          <button
            type="button"
            aria-label={t("Actualizar cartografía")}
            title={t("Actualizar cartografía")}
            disabled={!initialized}
            onClick={retry}
          >
            ↻
          </button>
          <button
            type="button"
            aria-label={t("Restablecer mapa")}
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
              {t(
                tileState === "error"
                  ? initializationError
                    ? "No se pudo iniciar el visor vectorial. Comprueba que WebGL esté disponible."
                    : streets
                      ? "No se pudo conectar con OpenFreeMap. Puede haber un bloqueo de red o del proveedor. Usa el mapa de respaldo o las coordenadas; tu punto se conserva."
                      : "No se pudo cargar el mapa local. La lista de propiedades sigue disponible."
                  : "Preparando el mapa de Home View…",
              )}
            </p>
            {tileState === "error" && (
              <div className="geo-map-recovery">
                <button type="button" onClick={retry}>
                  {t("Volver a cargar mapa")}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="geo-map-footer">
          <span>
            {t(
              streets
                ? "Estilo Home View · Calles y edificios"
                : "Mapa de respaldo · Sin callejero completo",
            )}
          </span>
          <span className="geo-map-attribution">
            {streets && (
              <>
                <a
                  href="https://openfreemap.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OpenFreeMap
                </a>
                {" · "}
                <a
                  href="https://openmaptiles.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  © OpenMapTiles
                </a>
                {" · "}
              </>
            )}
            {t("Datos:")}{" "}
            <a
              href={
                streets
                  ? "https://www.openstreetmap.org/copyright"
                  : "https://www.naturalearthdata.com/about/terms-of-use/"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {streets ? "© OpenStreetMap contributors" : "Natural Earth"}
            </a>{" "}
            {!streets && t("· Dominio público")}
          </span>
        </div>
      </div>
    </div>
  );
}
