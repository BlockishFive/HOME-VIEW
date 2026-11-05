import { validPoint, type Point } from "./location";
/** Optional visit reference. Private metadata; never part of the public property DTO. */
export type VisitAccess = {
  latitude: string;
  longitude: string;
  notes: string;
};
export const emptyVisitAccess = (): VisitAccess => ({
  latitude: "",
  longitude: "",
  notes: "",
});
export function readVisitAccess(value: unknown): VisitAccess {
  if (value === undefined) return emptyVisitAccess();
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Revisa la referencia privada de acceso.");
  const item = value as Record<string, unknown>;
  for (const key of ["latitude", "longitude", "notes"] as const)
    if (
      typeof item[key] !== "string" ||
      item[key].length > (key === "notes" ? 600 : 64)
    )
      throw new Error("Revisa la referencia privada de acceso.");
  return {
    latitude: item.latitude as string,
    longitude: item.longitude as string,
    notes: item.notes as string,
  };
}
export function hasVisitAccess(value?: VisitAccess) {
  return (
    !!value &&
    (value.latitude !== "" || value.longitude !== "" || value.notes !== "")
  );
}
export function visitAccessPoint(value?: VisitAccess): Point | null {
  if (!value?.latitude.trim() || !value.longitude.trim()) return null;
  const point = { lat: Number(value.latitude), lng: Number(value.longitude) };
  return validPoint(point) ? point : null;
}
export function visitAccessError(value: unknown): string | null {
  try {
    const access = readVisitAccess(value);
    return (access.latitude.trim() || access.longitude.trim()) &&
      !visitAccessPoint(access)
      ? "Completa las dos coordenadas del acceso dentro de la cobertura de México, o deja ambas vacías."
      : null;
  } catch {
    return "Revisa la referencia privada de acceso.";
  }
}
/** Fixed hosts and numeric coordinates only. These links are never fetched automatically. */
export function externalMapLinks(point: Point) {
  if (!validPoint(point)) throw new Error("invalid_location");
  const lat = point.lat.toFixed(6),
    lng = point.lng.toFixed(6),
    pair = `${lat},${lng}`;
  return {
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pair)}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pair)}`,
  };
}
