/** Private points and public precision are separate; never spread a draft into public data. */
export type Point = { lat: number; lng: number };
export type PublicLocation = "approximate" | "exact";
export function validPoint(point: Point) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= 14 &&
    point.lat <= 33 &&
    point.lng >= -119 &&
    point.lng <= -86
  );
}
export function publicPoint(
  point: Point,
  precision: PublicLocation = "approximate",
): Point {
  if (!validPoint(point)) throw new Error("invalid_location");
  // A reproducible ~1 km cell; no random jitter and no private coordinate fields.
  return precision === "exact"
    ? { ...point }
    : {
        lat: Number((Math.floor(point.lat * 100) / 100 + 0.005).toFixed(3)),
        lng: Number((Math.floor(point.lng * 100) / 100 + 0.005).toFixed(3)),
      };
}
export type PlaceResult = Point & { label: string };
export function photonResults(data: unknown): PlaceResult[] {
  const features = (data as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) throw new Error("invalid_geocoder");
  return features
    .slice(0, 10)
    .flatMap((raw: any) => {
      const coordinates = raw?.geometry?.coordinates;
      if (raw?.geometry?.type !== "Point" || !Array.isArray(coordinates))
        return [];
      const point = { lng: coordinates[0], lat: coordinates[1] };
      if (!validPoint(point)) return [];
      const p = raw.properties ?? {};
      if (
        typeof p.countrycode === "string" &&
        p.countrycode.toLowerCase() !== "mx"
      )
        return [];
      const label = [
        ...new Set(
          [p.name, p.street, p.housenumber, p.city, p.state, p.country].filter(
            (v) => typeof v === "string" && v.trim(),
          ),
        ),
      ]
        .join(", ")
        .slice(0, 350);
      return label ? [{ ...point, label }] : [];
    })
    .slice(0, 5);
}
