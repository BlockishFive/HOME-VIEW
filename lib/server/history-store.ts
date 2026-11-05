import type { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { PrivateError } from "./private-error";
export const HISTORY_LIMIT = 10;
export const HISTORY_BYTES = 300 * 1024 * 1024;
export const HISTORY_PROPERTIES = 200;
export const ACTIVITY_LIMIT = 5000;
export type HistoryMetadata = {
  id: string;
  sharedRevision: number;
  [key: string]: unknown;
};
export type HistoryAsset = { id: string; content: Buffer };
export type HistoryAction = "baseline" | "saved" | "restored";
export function auditEvent(
  store: DatabaseSync,
  action: string,
  id: string | null = null,
  revision: number | null = null,
  source: number | null = null,
  actor = "owner",
) {
  store
    .prepare(
      "INSERT INTO activity_log(created_at,actor,action,draft_id,revision,source_revision) VALUES (?,?,?,?,?,?)",
    )
    .run(new Date().toISOString(), actor, action, id, revision, source);
  store
    .prepare(
      "DELETE FROM activity_log WHERE id NOT IN (SELECT id FROM activity_log ORDER BY id DESC LIMIT ?)",
    )
    .run(ACTIVITY_LIMIT);
}
export function historyGarbageCollect(store: DatabaseSync) {
  store.exec(
    "DELETE FROM version_blobs WHERE NOT EXISTS (SELECT 1 FROM version_assets WHERE hash=version_blobs.hash)",
  );
}
/** Caller owns the transaction. Versions and their media are immutable. */
export function archiveVersion(
  store: DatabaseSync,
  metadata: HistoryMetadata,
  assets: HistoryAsset[],
  reason: HistoryAction,
  source: number | null = null,
) {
  const exists = store
    .prepare("SELECT 1 FROM draft_versions WHERE draft_id=? AND revision=?")
    .get(metadata.id, metadata.sharedRevision);
  if (!exists) {
    const roots = Number(
      (
        store
          .prepare("SELECT count(DISTINCT draft_id) AS n FROM draft_versions")
          .get() as { n: number }
      ).n,
    );
    if (
      !store
        .prepare("SELECT 1 FROM draft_versions WHERE draft_id=? LIMIT 1")
        .get(metadata.id) &&
      roots >= HISTORY_PROPERTIES
    )
      throw new PrivateError("history_quota", 413);
    store
      .prepare("INSERT INTO draft_versions VALUES (?,?,?,?,?,?)")
      .run(
        metadata.id,
        metadata.sharedRevision,
        new Date().toISOString(),
        reason,
        source,
        JSON.stringify(metadata),
      );
    for (const asset of assets) {
      const hash = createHash("sha256").update(asset.content).digest("hex");
      store
        .prepare("INSERT OR IGNORE INTO version_blobs VALUES (?,?)")
        .run(hash, asset.content);
      store
        .prepare("INSERT INTO version_assets VALUES (?,?,?,?)")
        .run(metadata.id, metadata.sharedRevision, asset.id, hash);
    }
  }
  store
    .prepare(
      "INSERT INTO history_heads VALUES (?,?,NULL) ON CONFLICT(id) DO UPDATE SET last_revision=excluded.last_revision,deleted_at=NULL",
    )
    .run(metadata.id, metadata.sharedRevision);
  store
    .prepare(
      "DELETE FROM draft_versions WHERE draft_id=? AND revision NOT IN (SELECT revision FROM draft_versions WHERE draft_id=? ORDER BY revision DESC LIMIT ?)",
    )
    .run(metadata.id, metadata.id, HISTORY_LIMIT);
  historyGarbageCollect(store);
  const bytes = Number(
    (
      store
        .prepare(
          "SELECT coalesce(sum(length(content)),0) AS bytes FROM version_blobs",
        )
        .get() as { bytes: number }
    ).bytes,
  );
  if (bytes > HISTORY_BYTES) throw new PrivateError("history_quota", 413);
}
export function initializeHistory(store: DatabaseSync) {
  const schema = Number(
    (store.prepare("PRAGMA user_version").get() as { user_version: number })
      .user_version,
  );
  if (schema > 1) throw new PrivateError("schema_unsupported", 503);
  store.exec(`CREATE TABLE IF NOT EXISTS history_heads(id TEXT PRIMARY KEY,last_revision INTEGER NOT NULL,deleted_at TEXT);
    CREATE TABLE IF NOT EXISTS draft_versions(draft_id TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,reason TEXT NOT NULL,source_revision INTEGER,metadata TEXT NOT NULL,PRIMARY KEY(draft_id,revision));
    CREATE TABLE IF NOT EXISTS version_blobs(hash TEXT PRIMARY KEY,content BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS version_assets(draft_id TEXT NOT NULL,revision INTEGER NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL REFERENCES version_blobs(hash),PRIMARY KEY(draft_id,revision,id),FOREIGN KEY(draft_id,revision) REFERENCES draft_versions(draft_id,revision) ON DELETE CASCADE);
    CREATE INDEX IF NOT EXISTS version_asset_hash ON version_assets(hash);
    CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,draft_id TEXT,revision INTEGER,source_revision INTEGER);`);
  store.exec("BEGIN IMMEDIATE");
  try {
    if (
      Number(
        (store.prepare("PRAGMA user_version").get() as { user_version: number })
          .user_version,
      ) === 0
    ) {
      for (const row of store
        .prepare("SELECT id,revision,metadata FROM drafts")
        .all() as { id: string; revision: number; metadata: string }[]) {
        const assets = (
          store
            .prepare("SELECT id,content FROM assets WHERE draft_id=?")
            .all(row.id) as { id: string; content: Uint8Array }[]
        ).map((asset) => ({
          id: asset.id,
          content: Buffer.from(asset.content),
        }));
        archiveVersion(
          store,
          {
            ...JSON.parse(row.metadata),
            id: row.id,
            sharedRevision: row.revision,
          },
          assets,
          "baseline",
        );
      }
      auditEvent(store, "history.initialized", null, null, null, "system");
      store.exec("PRAGMA user_version=1");
    }
    store.exec("COMMIT");
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
export function listHistory(store: DatabaseSync) {
  return (
    store
      .prepare(
        `SELECT h.id,h.last_revision,h.deleted_at,v.metadata,v.created_at,
    (SELECT count(*) FROM draft_versions WHERE draft_id=h.id) AS versions
    FROM history_heads h JOIN draft_versions v ON v.draft_id=h.id AND v.revision=h.last_revision ORDER BY v.created_at DESC,h.id`,
      )
      .all() as {
      id: string;
      last_revision: number;
      deleted_at: string | null;
      metadata: string;
      created_at: string;
      versions: number;
    }[]
  ).map((row) => {
    const m = JSON.parse(row.metadata);
    return {
      id: row.id,
      title: typeof m.title === "string" ? m.title : "",
      operation: m.operation,
      lastRevision: row.last_revision,
      deleted: row.deleted_at !== null,
      updatedAt: row.created_at,
      versions: row.versions,
    };
  });
}
export function listVersions(store: DatabaseSync, id: string) {
  return store
    .prepare(
      "SELECT revision,created_at AS createdAt,reason,source_revision AS sourceRevision FROM draft_versions WHERE draft_id=? ORDER BY revision DESC",
    )
    .all(id);
}
export function historicalVersion(
  store: DatabaseSync,
  id: string,
  revision: number,
) {
  const row = store
    .prepare(
      "SELECT metadata FROM draft_versions WHERE draft_id=? AND revision=?",
    )
    .get(id, revision) as { metadata: string } | undefined;
  if (!row) throw new PrivateError("history_missing", 404);
  return JSON.parse(row.metadata) as HistoryMetadata;
}
export function historicalAsset(
  store: DatabaseSync,
  id: string,
  revision: number,
  asset: string,
) {
  return (
    store
      .prepare(
        "SELECT b.content FROM version_assets a JOIN version_blobs b ON b.hash=a.hash WHERE a.draft_id=? AND a.revision=? AND a.id=?",
      )
      .get(id, revision, asset) as { content: Uint8Array } | undefined
  )?.content;
}
export function listActivity(
  store: DatabaseSync,
  before = Number.MAX_SAFE_INTEGER,
) {
  return store
    .prepare(
      "SELECT id,created_at AS createdAt,actor,action,draft_id AS draftId,revision,source_revision AS sourceRevision FROM activity_log WHERE id<? ORDER BY id DESC LIMIT 30",
    )
    .all(before);
}
