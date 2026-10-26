"use client";
import { useRef, useState } from "react";
import type { Property } from "@/lib/properties";

type Point = { x: number; y: number };
export function PropertyMap({
  properties,
  selected,
  onSelect,
}: {
  properties: Property[];
  selected: string;
  onSelect: (slug: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    start: Point;
  } | null>(null);
  function clamp(n: number) {
    return Math.max(-250, Math.min(250, n));
  }
  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  return (
    <div className="property-map">
      <div className="map-heading">
        <span>
          <span className="live-dot" /> Ciudad demo
        </span>
        <span>Mapa ilustrativo</span>
      </div>
      <div
        className="map-viewport"
        onPointerDown={(event) => {
          if ((event.target as Element).closest("button")) return;
          gesture.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            start: pan,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g || g.id !== event.pointerId) return;
          const dx = event.clientX - g.x,
            dy = event.clientY - g.y;
          setPan({ x: clamp(g.start.x + dx), y: clamp(g.start.y + dy) });
        }}
        onPointerUp={() => {
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <div
          className="map-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            viewBox="0 0 900 600"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="map-art"
          >
            <defs>
              <pattern
                id="city-grid"
                width="90"
                height="75"
                patternUnits="userSpaceOnUse"
              >
                <rect width="90" height="75" fill="#202522" />
                <rect
                  x="7"
                  y="7"
                  width="32"
                  height="24"
                  rx="3"
                  fill="#282e29"
                />
                <rect
                  x="46"
                  y="7"
                  width="37"
                  height="24"
                  rx="3"
                  fill="#252c27"
                />
                <rect
                  x="7"
                  y="38"
                  width="76"
                  height="30"
                  rx="3"
                  fill="#262d28"
                />
                <path d="M0 0H90 M0 0V75" stroke="#3b453b" strokeWidth="3" />
              </pattern>
            </defs>
            <rect width="900" height="600" fill="url(#city-grid)" />
            <path
              d="M0 500 Q120 310 200 480 T420 430 T650 520 T950 400"
              fill="none"
              stroke="#283d3b"
              strokeWidth="70"
            />
            <path
              d="M0 500 Q120 310 200 480 T420 430 T650 520 T950 400"
              fill="none"
              stroke="#395450"
              strokeWidth="2"
            />
            <path
              d="M0 200 L900 340 M250 0L470 600 M0 80L900 80 M730 0L730 600"
              fill="none"
              stroke="#4c5545"
              strokeWidth="13"
            />
            <path
              d="M0 200 L900 340 M250 0L470 600 M0 80L900 80 M730 0L730 600"
              fill="none"
              stroke="#c8cb9f"
              strokeWidth="1"
              strokeDasharray="8 9"
              opacity=".45"
            />
            <path
              d="M85 95H220L255 190L80 165Z M480 330L570 348L610 450L490 435Z M490 100H660V210L545 190Z"
              fill="#34432b"
              stroke="#4c5d37"
              strokeWidth="2"
            />
            <g fill="#4d6439" opacity=".7">
              {Array.from({ length: 12 }, (_, i) => (
                <circle
                  key={i}
                  cx={100 + (i % 4) * 32}
                  cy={115 + Math.floor(i / 4) * 16}
                  r="8"
                />
              ))}
            </g>
            <g fontFamily="Arial, sans-serif" textAnchor="middle">
              <text x="165" y="145" fill="#b0be8c" fontSize="12">
                PARQUE OLIVO
              </text>
              <text
                x="335"
                y="355"
                fill="#9aa88c"
                fontSize="15"
                letterSpacing="2"
              >
                DISTRITO JARDÍN
              </text>
              <text
                x="595"
                y="235"
                fill="#9aa88c"
                fontSize="15"
                letterSpacing="2"
              >
                COLINAS DEL NORTE
              </text>
              <text
                x="640"
                y="445"
                fill="#9aa88c"
                fontSize="15"
                letterSpacing="2"
              >
                BARRIO DEL SOL
              </text>
              <text x="785" y="102" fill="#8e9985" fontSize="11">
                AV. HORIZONTE
              </text>
              <text
                x="170"
                y="506"
                fill="#8ca6a1"
                fontSize="11"
                letterSpacing="3"
              >
                RÍO DEMO
              </text>
            </g>
          </svg>
          {properties.map((property) => (
            <button
              key={property.slug}
              className={`map-pin ${selected === property.slug ? "selected" : ""}`}
              style={{
                left: `${property.mapPosition.x / 9}%`,
                top: `${property.mapPosition.y / 6}%`,
              }}
              aria-pressed={selected === property.slug}
              aria-label={`Seleccionar ${property.title} en el mapa, ${property.price} MXN`}
              onClick={() => {
                onSelect(property.slug);
              }}
            >
              {(property.priceValue / 1000000).toFixed(2)} M
              <span className="sr-only"> · {property.title}</span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="map-controls"
        role="group"
        aria-label="Controles del mapa"
      >
        <button
          aria-label="Acercar mapa"
          disabled={zoom >= 1.8}
          onClick={() => setZoom((v) => Math.min(1.8, v + 0.2))}
        >
          +
        </button>
        <button
          aria-label="Alejar mapa"
          disabled={zoom <= 0.8}
          onClick={() => setZoom((v) => Math.max(0.8, v - 0.2))}
        >
          −
        </button>
        <button aria-label="Restablecer mapa" onClick={reset}>
          ⌖
        </button>
      </div>
      <span className="map-compass" aria-hidden="true">
        ↑<small>N</small>
      </span>
      <div className="map-disclaimer">
        Ubicaciones ficticias · Arrastra para explorar · Sin escala real
      </div>
    </div>
  );
}
