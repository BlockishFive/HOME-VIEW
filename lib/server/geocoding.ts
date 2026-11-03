import { createHash } from "node:crypto";
import { db, PrivateError } from "./private-store";
import { photonResults } from "../location";
export async function searchPlaces(
  query: string,
  locale: string,
  request = fetch,
) {
  query = query.trim().replace(/\s+/g, " ");
  if (query.length < 3 || query.length > 160 || /[\x00-\x1f]/.test(query))
    throw new PrivateError("invalid", 400);
  const endpoint = new URL(
    process.env.HOME_VIEW_GEOCODER_URL || "https://photon.komoot.io/api/",
  );
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw new PrivateError("geocoder", 503);
  const key = createHash("sha256")
    .update(endpoint.href + locale + query.toLowerCase())
    .digest("hex");
  const store = db(),
    now = Date.now();
  store.exec(
    "CREATE TABLE IF NOT EXISTS geocoder_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS geocoder_gate (id INTEGER PRIMARY KEY CHECK(id=1), until_time INTEGER NOT NULL);",
  );
  const cached = store
    .prepare("SELECT payload FROM geocoder_cache WHERE key=? AND expires>?")
    .get(key, now) as { payload: string } | undefined;
  if (cached) return JSON.parse(cached.payload);
  // One persistent gate across Node workers; no bulk queries or per-user bypass.
  const reserved = store
    .prepare(
      "INSERT INTO geocoder_gate VALUES (1,?) ON CONFLICT(id) DO UPDATE SET until_time=excluded.until_time WHERE until_time<=?",
    )
    .run(now + 15000, now);
  if (!reserved.changes) throw new PrivateError("search_limited", 429);
  try {
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("limit", "5");
    endpoint.searchParams.set("bbox", "-119,14,-86,33");
    endpoint.searchParams.set("lat", "21.122");
    endpoint.searchParams.set("lon", "-101.686");
    if (locale === "en") endpoint.searchParams.set("lang", "en");
    const response = await request(endpoint, {
      headers: {
        "User-Agent":
          "HomeView-Pilot/1.0 (+https://github.com/BlockishFive/HOME-VIEW)",
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("upstream");
    if (!response.body) throw new Error("body");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 256000) {
          await reader.cancel();
          throw new Error("size");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const results = photonResults(JSON.parse(text));
    store.prepare("DELETE FROM geocoder_cache WHERE expires<=?").run(now);
    store
      .prepare("INSERT OR REPLACE INTO geocoder_cache VALUES (?,?,?)")
      .run(key, JSON.stringify(results), now + 86400000);
    store.exec(
      "DELETE FROM geocoder_cache WHERE key NOT IN (SELECT key FROM geocoder_cache ORDER BY expires DESC LIMIT 200)",
    );
    return results;
  } catch {
    throw new PrivateError("geocoder", 503);
  } finally {
    store
      .prepare("UPDATE geocoder_gate SET until_time=? WHERE id=1")
      .run(Date.now() + 1500);
  }
}
