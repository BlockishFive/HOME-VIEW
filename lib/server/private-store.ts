/** Node-only private pilot storage. Never import this module into a client component. */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const COOKIE_NAME = "hv_private_session";
import { PrivateError } from "./private-error";
export { PrivateError } from "./private-error";
import {
  initializeHistory,
  archiveVersion,
  auditEvent,
  historicalVersion,
  historyGarbageCollect,
} from "./history-store";
import { validateDraftInput, type DraftInput } from "../listing-drafts";
let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  const directory = resolve(
    process.env.HOME_VIEW_DATA_DIR || join(process.cwd(), ".home-view"),
  );
  const location = relative(process.cwd(), directory);
  if (
    !location.startsWith(`..${sep}`) &&
    location !== ".." &&
    !isAbsolute(location) &&
    location !== ".home-view" &&
    !location.startsWith(`.home-view${sep}`)
  )
    throw new Error(
      "HOME_VIEW_DATA_DIR debe apuntar fuera del repositorio o dentro de .home-view, nunca a public.",
    );
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const file = join(directory, "private.sqlite");
  database = new DatabaseSync(file);
  chmodSync(file, 0o600);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY CHECK(id=1), failures INTEGER NOT NULL, until_time INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, metadata TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS publications (id TEXT PRIMARY KEY REFERENCES drafts(id) ON DELETE CASCADE, revision INTEGER NOT NULL, metadata TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS publication_assets (id TEXT NOT NULL, draft_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE, content BLOB NOT NULL, PRIMARY KEY(draft_id,id));
    CREATE TABLE IF NOT EXISTS assets (id TEXT NOT NULL, draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE CASCADE, content BLOB NOT NULL, PRIMARY KEY(draft_id,id));`);
  try {
    initializeHistory(database);
  } catch (error) {
    database.close();
    database = undefined;
    throw error;
  }
  return database;
}
export function configured() {
  return !!db().prepare("SELECT id FROM owner WHERE id=1").get();
}
export function configureOwner(
  username: string,
  password: string,
  reset = false,
) {
  username = username.trim().toLowerCase();
  if (
    !/^[a-z0-9_.@+-]{3,80}$/.test(username) ||
    password.length < 14 ||
    password.length > 256
  )
    throw new PrivateError("setup_invalid");
  if (configured() && !reset) throw new PrivateError("already_configured");
  const salt = randomBytes(24).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  db().exec("BEGIN IMMEDIATE");
  try {
    db()
      .prepare("INSERT OR REPLACE INTO owner VALUES (1,?,?,?)")
      .run(username, salt, hash);
    db().exec("DELETE FROM sessions; DELETE FROM login_attempts;");
    auditEvent(db(), reset ? "owner.reset" : "owner.configured");
    db().exec("COMMIT");
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function login(username: string, password: string) {
  if (!configured()) throw new PrivateError("not_configured", 503);
  const now = Date.now();
  const attempts = db()
    .prepare("SELECT failures,until_time FROM login_attempts WHERE id=1")
    .get() as { failures: number; until_time: number } | undefined;
  if (attempts && attempts.failures >= 10 && attempts.until_time > now)
    throw new PrivateError("rate_limited", 429);
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > 80 ||
    password.length > 256
  )
    throw new PrivateError("invalid_credentials", 401);
  const owner = db().prepare("SELECT * FROM owner WHERE id=1").get() as {
    username: string;
    salt: string;
    password_hash: string;
  };
  const valid =
    timingSafeEqual(
      scryptSync(password, owner.salt, 64),
      Buffer.from(owner.password_hash, "hex"),
    ) && username.trim().toLowerCase() === owner.username;
  if (!valid) {
    const failures =
      attempts && attempts.until_time > now ? attempts.failures + 1 : 1;
    db()
      .prepare("INSERT OR REPLACE INTO login_attempts VALUES (1,?,?)")
      .run(
        failures,
        attempts && attempts.until_time > now
          ? attempts.until_time
          : now + 15 * 60 * 1000,
      );
    throw new PrivateError("invalid_credentials", 401);
  }
  db().exec("DELETE FROM login_attempts");
  db().prepare("DELETE FROM sessions WHERE expires < ?").run(now);
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES (?,?)")
    .run(tokenHash(token), now + SESSION_SECONDS * 1000);
  return token;
}
export function authenticated(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!db()
    .prepare("SELECT token_hash FROM sessions WHERE token_hash=? AND expires>?")
    .get(tokenHash(token), Date.now());
}
export function logout(token: string | undefined) {
  if (token)
    db()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(tokenHash(token));
}
export type PrivateMetadata = {
  id: string;
  sharedRevision: number;
  [key: string]: unknown;
};
export function listDrafts(): PrivateMetadata[] {
  return (
    db()
      .prepare(
        "SELECT metadata,revision FROM drafts ORDER BY json_extract(metadata,'$.updatedAt') DESC",
      )
      .all() as { metadata: string; revision: number }[]
  ).map((row) => ({
    ...JSON.parse(row.metadata),
    sharedRevision: row.revision,
    publishedRevision:
      (
        db()
          .prepare("SELECT revision FROM publications WHERE id=?")
          .get(JSON.parse(row.metadata).id) as { revision: number } | undefined
      )?.revision ?? null,
  }));
}
type WriteOptions = {
  restored?: boolean;
  restoreDeleted?: boolean;
  sourceRevision?: number;
};
function writeDraft(
  store: DatabaseSync,
  metadata: PrivateMetadata,
  assets: { id: string; content: Buffer }[],
  expectedRevision: number,
  options: WriteOptions = {},
) {
  const existing = store
    .prepare("SELECT revision FROM drafts WHERE id=?")
    .get(metadata.id) as { revision: number } | undefined;
  const head = store
    .prepare("SELECT last_revision,deleted_at FROM history_heads WHERE id=?")
    .get(metadata.id) as
    | { last_revision: number; deleted_at: string | null }
    | undefined;
  if (
    existing
      ? existing.revision !== expectedRevision
      : options.restoreDeleted
        ? !head ||
          head.last_revision !== expectedRevision ||
          head.deleted_at === null
        : expectedRevision !== 0 || !!head
  )
    throw new PrivateError("conflict", 409);
  if (
    !existing &&
    Number(
      (
        store.prepare("SELECT count(*) AS count FROM drafts").get() as {
          count: number;
        }
      ).count,
    ) >= 50
  )
    throw new PrivateError("quota", 413);
  const used = Number(
    (
      store
        .prepare(
          "SELECT coalesce(sum(length(content)),0) AS size FROM assets WHERE draft_id!=?",
        )
        .get(metadata.id) as { size: number }
    ).size,
  );
  if (
    used + assets.reduce((sum, asset) => sum + asset.content.length, 0) >
    300 * 1024 * 1024
  )
    throw new PrivateError("quota", 413);
  const publicBytes = Number(
    (
      store
        .prepare(
          "SELECT coalesce(sum(length(content)),0) AS size FROM publication_assets",
        )
        .get() as { size: number }
    ).size,
  );
  if (
    used +
      publicBytes +
      assets.reduce((sum, asset) => sum + asset.content.length, 0) >
    600 * 1024 * 1024
  )
    throw new PrivateError("quota", 413);
  const revision =
    Math.max(existing?.revision ?? 0, head?.last_revision ?? 0) + 1;
  metadata = { ...metadata, sharedRevision: revision };
  store
    .prepare(
      "INSERT INTO drafts VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, metadata=excluded.metadata",
    )
    .run(metadata.id, revision, JSON.stringify(metadata));
  store.prepare("DELETE FROM assets WHERE draft_id=?").run(metadata.id);
  const insert = store.prepare("INSERT INTO assets VALUES (?,?,?)");
  for (const asset of assets) insert.run(asset.id, metadata.id, asset.content);
  archiveVersion(
    store,
    metadata,
    assets,
    options.restored ? "restored" : "saved",
    options.sourceRevision ?? null,
  );
  auditEvent(
    store,
    options.restored
      ? "draft.restored"
      : existing
        ? "draft.saved"
        : "draft.created",
    metadata.id,
    revision,
    options.sourceRevision ?? null,
  );
  return metadata;
}
export function putDraft(
  metadata: PrivateMetadata,
  assets: { id: string; content: Buffer }[],
  expectedRevision: number,
) {
  const store = db();
  store.exec("BEGIN IMMEDIATE");
  try {
    const result = writeDraft(store, metadata, assets, expectedRevision);
    store.exec("COMMIT");
    return result;
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
export function restoreHistoricalDraft(
  id: string,
  sourceRevision: number,
  expectedRevision: number,
  deleted: boolean,
) {
  const store = db();
  store.exec("BEGIN IMMEDIATE");
  try {
    const head = store
      .prepare("SELECT last_revision,deleted_at FROM history_heads WHERE id=?")
      .get(id) as
      | { last_revision: number; deleted_at: string | null }
      | undefined;
    if (
      !head ||
      head.last_revision !== expectedRevision ||
      (head.deleted_at !== null) !== deleted
    )
      throw new PrivateError("conflict", 409);
    const metadata = historicalVersion(store, id, sourceRevision);
    try {
      if (
        Object.keys(
          validateDraftInput({
            ...metadata,
            imageRights: true,
          } as unknown as DraftInput),
        ).length
      )
        throw new Error();
    } catch {
      throw new PrivateError("invalid");
    }
    const assets = (
      store
        .prepare(
          "SELECT a.id,b.content FROM version_assets a JOIN version_blobs b ON b.hash=a.hash WHERE a.draft_id=? AND a.revision=?",
        )
        .all(id, sourceRevision) as { id: string; content: Uint8Array }[]
    ).map((asset) => ({ id: asset.id, content: Buffer.from(asset.content) }));
    const result = writeDraft(
      store,
      {
        ...metadata,
        id,
        updatedAt: new Date().toISOString(),
        imageRights: false,
        locationReviewed: false,
      },
      assets,
      expectedRevision,
      { restored: true, restoreDeleted: deleted, sourceRevision },
    );
    store.exec("COMMIT");
    return result;
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
export function clearHistory(
  id: string,
  expectedRevision: number,
  deleted: boolean,
) {
  const store = db();
  store.exec("BEGIN IMMEDIATE");
  try {
    const head = store
      .prepare("SELECT last_revision,deleted_at FROM history_heads WHERE id=?")
      .get(id) as
      | { last_revision: number; deleted_at: string | null }
      | undefined;
    if (
      !head ||
      head.last_revision !== expectedRevision ||
      (head.deleted_at !== null) !== deleted
    )
      throw new PrivateError("conflict", 409);
    store
      .prepare(
        "DELETE FROM draft_versions WHERE draft_id=? AND (? OR revision!=?)",
      )
      .run(id, deleted ? 1 : 0, expectedRevision);
    historyGarbageCollect(store);
    auditEvent(store, "history.cleared", id, expectedRevision);
    store.exec("COMMIT");
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
export function getAsset(draftId: string, id: string) {
  return (
    db()
      .prepare("SELECT content FROM assets WHERE draft_id=? AND id=?")
      .get(draftId, id) as { content: Uint8Array } | undefined
  )?.content;
}
export function removeDraft(id: string, revision: number) {
  const store = db();
  store.exec("BEGIN IMMEDIATE");
  try {
    const row = store
      .prepare("SELECT metadata,revision FROM drafts WHERE id=?")
      .get(id) as { metadata: string; revision: number } | undefined;
    if (!row || row.revision !== revision)
      throw new PrivateError("conflict", 409);
    const assets = (
      store
        .prepare("SELECT id,content FROM assets WHERE draft_id=?")
        .all(id) as { id: string; content: Uint8Array }[]
    ).map((asset) => ({ id: asset.id, content: Buffer.from(asset.content) }));
    archiveVersion(
      store,
      { ...JSON.parse(row.metadata), id, sharedRevision: revision },
      assets,
      "saved",
    );
    const published = store
      .prepare("SELECT 1 FROM publications WHERE id=?")
      .get(id);
    store.prepare("DELETE FROM drafts WHERE id=?").run(id);
    store
      .prepare("UPDATE history_heads SET deleted_at=? WHERE id=?")
      .run(new Date().toISOString(), id);
    if (published)
      auditEvent(store, "publication.removed_on_delete", id, revision);
    auditEvent(store, "draft.deleted", id, revision);
    store.exec("COMMIT");
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
