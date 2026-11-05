"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { PropertyMap } from "./PropertyMap";
import { MapReferenceLinks } from "./VisitAccessDetails";
import {
  emptyVisitAccess,
  visitAccessPoint,
  type VisitAccess,
} from "@/lib/visit-access";
import { privateRequest } from "@/lib/shared-drafts";
import {
  publicPoint,
  validPoint,
  type Point,
  type PublicLocation,
  type PlaceResult,
} from "@/lib/location";
export function LocationPicker({
  point,
  onChange,
  precision,
  onPrecision,
  reviewed,
  onReviewed,
  visitAccess,
  onVisitAccess,
  accessError,
  accessFieldId,
}: {
  visitAccess: VisitAccess;
  onVisitAccess: (value: VisitAccess) => void;
  accessError?: string;
  accessFieldId: string;
  point: Point;
  onChange: (point: Point) => void;
  precision: PublicLocation;
  onPrecision: (value: PublicLocation) => void;
  reviewed: boolean;
  onReviewed: (value: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const [target, setTarget] = useState<"property" | "access">("property");
  const targetRef = useRef(target);
  targetRef.current = target;
  const accessRef = useRef(visitAccess);
  accessRef.current = visitAccess;
  const accessPoint = visitAccessPoint(visitAccess);
  const activePoint =
    target === "property" ? point : (accessPoint ?? { lat: NaN, lng: NaN });
  const changeActive = (value: Point) =>
    targetRef.current === "property"
      ? onChange(value)
      : onVisitAccess({
          ...accessRef.current,
          latitude: String(value.lat),
          longitude: String(value.lng),
        });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const alive = useRef(true);
  const latestPoint = useRef(activePoint);
  latestPoint.current = activePoint;
  const gpsPoint = useRef<Point | null>(null);
  const pending = useRef<AbortController | null>(null);
  const change = useRef(changeActive);
  change.current = changeActive;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      pending.current?.abort();
    };
  }, []);
  const preview = validPoint(point) ? publicPoint(point, precision) : null;
  async function search() {
    if (query.trim().length < 3 || searching) return;
    const abort = new AbortController();
    pending.current?.abort();
    pending.current = abort;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const response = await privateRequest("geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, locale }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (alive.current && !abort.signal.aborted) {
        setResults(data.results);
        if (!data.results.length)
          setError(
            "No se encontraron coincidencias. Prueba con calle, colonia y ciudad o ajusta el punto manualmente.",
          );
      }
    } catch (e) {
      if (alive.current && !abort.signal.aborted)
        setError(
          e instanceof Error ? e.message : "No se pudo buscar la dirección.",
        );
    } finally {
      if (alive.current && pending.current === abort) {
        pending.current = null;
        setSearching(false);
      }
    }
  }
  function switchTarget(next: "property" | "access") {
    targetRef.current = next;
    pending.current?.abort();
    pending.current = null;
    setSearching(false);
    setResults([]);
    setError("");
    setAccuracy(null);
    setTarget(next);
  }
  function gps() {
    if (locating) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setError(
        "El GPS necesita HTTPS y un navegador compatible. Puedes elegir el punto manualmente.",
      );
      return;
    }
    setError("");
    setLocating(true);
    const startedAtPoint = { ...latestPoint.current };
    const startedTarget = targetRef.current;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!alive.current) return;
        setLocating(false);
        if (
          targetRef.current !== startedTarget ||
          !Object.is(latestPoint.current.lat, startedAtPoint.lat) ||
          !Object.is(latestPoint.current.lng, startedAtPoint.lng)
        ) {
          setError(
            "El punto cambió mientras se obtenía el GPS. Se conservó tu ajuste manual.",
          );
          return;
        }
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (!validPoint(next)) {
          setError(
            "Tu ubicación está fuera de la cobertura de México. Elige el inmueble manualmente.",
          );
          return;
        }
        gpsPoint.current = {
          lat: Number(next.lat.toFixed(6)),
          lng: Number(next.lng.toFixed(6)),
        };
        change.current(gpsPoint.current);
        setAccuracy(Math.round(position.coords.accuracy));
      },
      () => {
        if (alive.current) {
          setLocating(false);
          setError(
            "No se pudo obtener tu ubicación. Revisa el permiso del navegador o coloca el punto manualmente.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  return (
    <div className="location-picker">
      <div
        className="location-target"
        role="group"
        aria-label={t("Punto que estás ubicando")}
      >
        <button
          type="button"
          aria-pressed={target === "property"}
          onClick={() => switchTarget("property")}
        >
          {t("Ubicar inmueble")}
        </button>
        <button
          type="button"
          aria-pressed={target === "access"}
          onClick={() => switchTarget("access")}
        >
          {t("Ubicar acceso para visitas")}
        </button>
      </div>
      <p className="location-target-notice">
        {t(
          target === "property"
            ? "Editas el punto privado del inmueble. La referencia amarilla indica el acceso, si lo guardaste."
            : "Editas el acceso privado para visitas. La referencia amarilla indica el inmueble; este cambio no mueve su punto ni la ubicación pública.",
        )}
      </p>
      <div className="location-search">
        <label className="listing-field">
          <span>{t("Buscar calle, colonia o lugar")}</span>
          <input
            value={query}
            maxLength={160}
            autoComplete="off"
            placeholder={t("Ejemplo: Marroka Residencial, León, Guanajuato")}
            onChange={(e) => {
              pending.current?.abort();
              pending.current = null;
              setSearching(false);
              setQuery(e.target.value);
              setResults([]);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="button button-dark"
          disabled={searching || query.trim().length < 3}
          onClick={() => void search()}
        >
          {t(searching ? "Buscando…" : "Buscar dirección")}
        </button>
        <button
          type="button"
          className="button button-dark"
          disabled={locating}
          onClick={gps}
        >
          {t(locating ? "Obteniendo ubicación…" : "Usar mi ubicación actual")}
        </button>
      </div>
      <p className="listing-help">
        {t(
          "Buscar envía solo el texto a Photon/Komoot, basado en OpenStreetMap. Requiere sesión privada. No incluyas nombres, teléfonos ni datos confidenciales. No se busca mientras escribes.",
        )}
      </p>
      {error && (
        <p className="listing-error" role="alert">
          {t(error)}
        </p>
      )}
      {results.length > 0 && (
        <ul
          className="location-results"
          aria-label={t("Resultados de ubicación")}
        >
          {results.map((result, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  change.current({ lat: result.lat, lng: result.lng });
                  setAccuracy(null);
                  setResults([]);
                  setQuery(result.label);
                }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {accuracy !== null &&
        activePoint.lat === gpsPoint.current?.lat &&
        activePoint.lng === gpsPoint.current?.lng && (
          <p role="status">
            {t(
              "Precisión estimada del GPS: ±{meters} m. Comprueba el inmueble antes de guardar.",
              { meters: accuracy },
            )}
          </p>
        )}
      <p className="listing-help">
        {t(
          "Toca el mapa o arrastra el marcador verde para ajustar el punto privado. También puedes editar las coordenadas. Los resultados y el GPS son referencias; confirma la ubicación en campo.",
        )}
      </p>
      <PropertyMap
        properties={[]}
        selected=""
        onSelect={() => {}}
        capture={{
          point: activePoint,
          label:
            target === "property"
              ? "Punto privado del inmueble"
              : "Punto privado del acceso",
          reference:
            target === "property"
              ? accessPoint
                ? { point: accessPoint, label: "Referencia privada del acceso" }
                : undefined
              : { point, label: "Referencia privada del inmueble" },
          onChange: (p) => {
            change.current(p);
            setAccuracy(null);
          },
        }}
      />
      {validPoint(activePoint) && <MapReferenceLinks point={activePoint} />}
      <div
        className="visit-access-fields"
        id={accessFieldId}
        tabIndex={-1}
        aria-invalid={!!accessError}
        aria-describedby={accessError ? "error-visitAccess" : undefined}
      >
        <h3>{t("Acceso para visitas · Solo privado")}</h3>
        <p>
          {t(
            "Opcional. Marca la entrada del fraccionamiento o una referencia para llegar. Se conserva aparte del inmueble y no se publica. No incluyas códigos de acceso, contraseñas ni datos personales.",
          )}
        </p>
        <div className="listing-field-grid">
          <label className="listing-field">
            <span id={`${accessFieldId}-lat-label`}>
              {t("Latitud del acceso privado")}
            </span>
            <input
              aria-labelledby={`${accessFieldId}-lat-label`}
              type="number"
              step="any"
              min={14}
              max={33}
              value={visitAccess.latitude}
              onChange={(e) =>
                onVisitAccess({ ...visitAccess, latitude: e.target.value })
              }
            />
          </label>
          <label className="listing-field">
            <span id={`${accessFieldId}-lng-label`}>
              {t("Longitud del acceso privado")}
            </span>
            <input
              aria-labelledby={`${accessFieldId}-lng-label`}
              type="number"
              step="any"
              min={-119}
              max={-86}
              value={visitAccess.longitude}
              onChange={(e) =>
                onVisitAccess({ ...visitAccess, longitude: e.target.value })
              }
            />
          </label>
        </div>
        <label className="listing-field">
          <span id={`${accessFieldId}-notes-label`}>
            {t("Referencia de llegada privada")}
          </span>
          <textarea
            aria-labelledby={`${accessFieldId}-notes-label`}
            maxLength={600}
            value={visitAccess.notes}
            onChange={(e) =>
              onVisitAccess({ ...visitAccess, notes: e.target.value })
            }
          />
        </label>
        {accessError && (
          <p className="listing-field-error" id="error-visitAccess">
            {t(accessError)}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            onVisitAccess(emptyVisitAccess());
            switchTarget("property");
          }}
        >
          {t("Quitar referencia de acceso")}
        </button>
      </div>
      <label className="listing-field">
        <span>{t("Ubicación que se mostrará al publicar")}</span>
        <select
          value={precision}
          onChange={(e) => onPrecision(e.target.value as PublicLocation)}
        >
          <option value="approximate">
            {t("Zona aproximada · Recomendada")}
          </option>
          <option value="exact">
            {t("Punto exacto · Tengo autorización para mostrarlo")}
          </option>
        </select>
      </label>
      <p className="location-public-preview" role="status">
        {t(
          precision === "approximate"
            ? "Se publicará una zona en una cuadrícula de aproximadamente 1 km; el punto privado se conserva."
            : "Se publicarán las coordenadas exactas que guardes. Revisa que tienes autorización.",
        )}
        {preview && (
          <span>
            {t("Punto público:")}{" "}
            {preview.lat.toFixed(precision === "exact" ? 6 : 3)},{" "}
            {preview.lng.toFixed(precision === "exact" ? 6 : 3)}
          </span>
        )}
      </p>
      <label className="listing-checkbox">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => onReviewed(e.target.checked)}
        />
        <span>
          {t(
            "Revisé la ubicación y autorizo la precisión pública seleccionada.",
          )}
        </span>
      </label>
      <p className="listing-help">
        {t(
          "Puedes guardar un borrador sin revisar el punto. Para publicarlo tendrás que revisarlo y guardar de nuevo. La ubicación exacta permanece en el navegador si el borrador es local, o en el servidor privado si es compartido.",
        )}
      </p>
      <p className="listing-help">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap contributors
        </a>{" "}
        ·{" "}
        <a
          href="https://photon.komoot.io/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Photon / Komoot
        </a>
      </p>
    </div>
  );
}
