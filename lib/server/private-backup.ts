/** Operator-only full-server backup tools. No HTTP upload/restore endpoint. */
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import {
  openSync,
  readSync,
  closeSync,
  lstatSync,
  existsSync,
  realpathSync,
  mkdirSync,
  chmodSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  mkdtempSync,
  constants,
} from "node:fs";
import {
  resolve,
  relative,
  isAbsolute,
  sep,
  dirname,
  basename,
  join,
} from "node:path";
import sharp from "sharp";
import { validateDraftInput, type DraftInput } from "../listing-drafts";
import {
  validateDraftScenes,
  validatePanoramaDimensions,
  type DraftScene,
} from "../draft-tour";
import {
  initializeHistory,
  auditEvent,
  HISTORY_LIMIT,
  HISTORY_BYTES,
  HISTORY_PROPERTIES,
  ACTIVITY_LIMIT,
} from "./history-store";
const MB = 1024 * 1024,
  MAX_FILE = 1536 * MB;
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const tables: Record<string, string[]> = {
  owner: ["id", "username", "salt", "password_hash"],
  sessions: ["token_hash", "expires"],
  login_attempts: ["id", "failures", "until_time"],
  drafts: ["id", "revision", "metadata"],
  publications: ["id", "revision", "metadata"],
  assets: ["id", "draft_id", "content"],
  publication_assets: ["id", "draft_id", "content"],
  history_heads: ["id", "last_revision", "deleted_at"],
  draft_versions: [
    "draft_id",
    "revision",
    "created_at",
    "reason",
    "source_revision",
    "metadata",
  ],
  version_blobs: ["hash", "content"],
  version_assets: ["draft_id", "revision", "id", "hash"],
  activity_log: [
    "id",
    "created_at",
    "actor",
    "action",
    "draft_id",
    "revision",
    "source_revision",
  ],
  geocoder_cache: ["key", "payload", "expires"],
  geocoder_gate: ["id", "until_time"],
  sqlite_sequence: ["name", "seq"],
};
const base = [
  "owner",
  "sessions",
  "login_attempts",
  "drafts",
  "publications",
  "assets",
  "publication_assets",
];
const history = [
  "history_heads",
  "draft_versions",
  "version_blobs",
  "version_assets",
  "activity_log",
];
function requireValid(value: unknown): asserts value {
  if (!value)
    throw new Error(
      "El respaldo no supera la validación de estructura, datos o medios.",
    );
}
function integer(value: unknown, min = 1) {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= min
  );
}
function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
function object(value: unknown): asserts value is Record<string, any> {
  requireValid(value && typeof value === "object" && !Array.isArray(value));
}
function json(text: unknown): Record<string, any> {
  requireValid(typeof text === "string" && text.length <= 128 * 1024);
  const data: unknown = JSON.parse(text);
  object(data);
  return data;
}
function canonical(path: string): string {
  let current = resolve(path);
  const missing: string[] = [];
  while (!existsSync(current)) {
    missing.unshift(basename(current));
    const parent = dirname(current);
    if (parent === current) throw new Error("Ruta inválida.");
    current = parent;
  }
  return resolve(realpathSync(current), ...missing);
}
/** Reject repository-served/committable locations, including symlinks. */
export function privatePath(path: string) {
  const result = resolve(path),
    actual = canonical(result),
    root = realpathSync(process.cwd());
  const loc = relative(root, actual);
  if (
    !isAbsolute(loc) &&
    loc !== ".." &&
    !loc.startsWith(`..${sep}`) &&
    loc !== ".home-view" &&
    !loc.startsWith(`.home-view${sep}`)
  )
    throw new Error(
      "Usa una ruta privada fuera del repositorio o dentro de .home-view; nunca public ni una carpeta versionada.",
    );
  if (existsSync(result) && lstatSync(result).isSymbolicLink())
    throw new Error("No se permiten enlaces simbólicos como origen o destino.");
  return result;
}
function digest(path: string) {
  const file = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW),
    hash = createHash("sha256"),
    buffer = Buffer.alloc(1024 * 1024);
  try {
    let count;
    while ((count = readSync(file, buffer, 0, buffer.length, null)) > 0)
      hash.update(buffer.subarray(0, count));
    return hash.digest("hex");
  } finally {
    closeSync(file);
  }
}
function standalone(file: string) {
  const stat = lstatSync(file);
  requireValid(
    stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.size > 0 &&
      stat.size <= MAX_FILE,
  );
  for (const suffix of ["-wal", "-shm", "-journal"])
    if (existsSync(file + suffix))
      throw new Error(
        "El archivo tiene archivos auxiliares de una base activa. Crea primero un respaldo con backup:private.",
      );
  return stat;
}
function metadata(text: unknown, id: string, revision: number) {
  const value = json(text);
  requireValid(
    value.id === id &&
      value.sharedRevision === revision &&
      value.schemaVersion === 2 &&
      typeof value.imageRights === "boolean",
  );
  requireValid(
    ["createdAt", "updatedAt"].every(
      (key) =>
        typeof value[key] === "string" &&
        value[key].length <= 64 &&
        Number.isFinite(Date.parse(value[key])),
    ),
  );
  try {
    requireValid(
      Object.keys(
        validateDraftInput({ ...value, imageRights: true } as DraftInput),
      ).length === 0,
    );
  } catch {
    requireValid(false);
  }
  requireValid(
    Array.isArray(value.photos) &&
      value.photos.length >= 1 &&
      value.photos.length <= 8 &&
      Array.isArray(value.scenes) &&
      value.scenes.length <= 8,
  );
  requireValid(value.propertyType !== "Terreno" || !value.scenes.length);
  const seen = new Set<string>();
  for (const asset of [...value.photos, ...value.scenes]) {
    object(asset);
    requireValid(
      uuid(asset.id) &&
        !seen.has(asset.id) &&
        typeof asset.name === "string" &&
        asset.name.length <= 120 &&
        asset.url === `/api/private/media/${id}/${asset.id}`,
    );
    seen.add(asset.id);
  }
  const scenes = value.scenes.map((scene: any) => ({
    ...scene,
    blob: new Blob(["fixture"]),
  })) as DraftScene[];
  requireValid(
    scenes.every(
      (scene) => Array.isArray(scene.hotspots) && scene.hotspots.length <= 8,
    ) && !validateDraftScenes(scenes),
  );
  return value;
}
async function image(content: unknown, panorama: boolean) {
  requireValid(
    content instanceof Uint8Array &&
      content.length > 0 &&
      content.length <= 12 * MB &&
      content[0] === 255 &&
      content[1] === 216 &&
      content[2] === 255,
  );
  const info = await sharp(content, {
    limitInputPixels: 60000000,
    animated: false,
  }).metadata();
  requireValid(
    info.format === "jpeg" &&
      info.width &&
      info.height &&
      !info.exif &&
      !info.xmp,
  );
  requireValid(
    panorama
      ? !validatePanoramaDimensions(info.width, info.height) &&
          info.width <= 4096
      : info.width <= 1920 && info.height <= 1920,
  );
  // Decode each image serially at thumbnail size to detect corrupt compressed data.
  await sharp(content, { limitInputPixels: 60000000, failOn: "warning" })
    .resize(32, 32, { fit: "inside" })
    .raw()
    .toBuffer();
}
export type BackupVerification = {
  schemaVersion: number;
  drafts: number;
  publications: number;
  versions: number;
  assets: number;
  activity: number;
  sha256: string;
  bytes: number;
  checksumVerified: boolean;
};
export async function verifyPrivateBackup(
  input: string,
): Promise<BackupVerification> {
  const file = privatePath(input),
    stat = standalone(file),
    hash = digest(file);
  const manifestPath = file + ".manifest.json";
  let checksumVerified = false;
  if (existsSync(manifestPath)) {
    const mstat = lstatSync(manifestPath);
    requireValid(
      mstat.isFile() && !mstat.isSymbolicLink() && mstat.size < 16384,
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    requireValid(
      manifest?.format === "home-view-private-backup" &&
        manifest.version === 1 &&
        manifest.sha256 === hash &&
        manifest.bytes === stat.size,
    );
    checksumVerified = true;
  }
  const store = new DatabaseSync(file, { readOnly: true });
  try {
    store.exec(
      "PRAGMA trusted_schema=OFF; PRAGMA query_only=ON; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    const schemaVersion = Number(
      (store.prepare("PRAGMA user_version").get() as any).user_version,
    );
    requireValid(schemaVersion === 0 || schemaVersion === 1);
    const schema = store
      .prepare(
        "SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_autoindex_%'",
      )
      .all() as { type: string; name: string; sql: string | null }[];
    for (const entry of schema) {
      requireValid(entry.type === "table" || entry.type === "index");
      if (entry.type === "table") {
        requireValid(
          Object.hasOwn(tables, entry.name) &&
            !entry.sql?.toUpperCase().includes("VIRTUAL"),
        );
        const columns = store
          .prepare(`PRAGMA table_info("${entry.name}")`)
          .all() as { name: string }[];
        requireValid(
          JSON.stringify(columns.map((c) => c.name)) ===
            JSON.stringify(tables[entry.name]),
        );
      }
    }
    const names = new Set(
      schema.filter((s) => s.type === "table").map((s) => s.name),
    );
    requireValid(
      base.every((name) => names.has(name)) &&
        (schemaVersion !== 1 || history.every((name) => names.has(name))),
    );
    requireValid(
      (store.prepare("PRAGMA integrity_check").all() as any[]).every(
        (row) => row.integrity_check === "ok",
      ),
    );
    requireValid(store.prepare("PRAGMA foreign_key_check").all().length === 0);
    for (const [table, required] of Object.entries({
      publications: ["drafts:id:id"],
      assets: ["drafts:draft_id:id"],
      publication_assets: ["publications:draft_id:id"],
      ...(schemaVersion === 1
        ? {
            version_assets: [
              "version_blobs:hash:hash",
              "draft_versions:draft_id:draft_id",
              "draft_versions:revision:revision",
            ],
          }
        : {}),
    })) {
      const keys = store
        .prepare(`PRAGMA foreign_key_list("${table}")`)
        .all() as any[];
      requireValid(
        required.every((key) =>
          keys.some((row) => `${row.table}:${row.from}:${row.to}` === key),
        ),
      );
    }
    for (const [child, parent] of [
      ["assets", "drafts"],
      ["publication_assets", "publications"],
    ])
      requireValid(
        !store
          .prepare(
            `SELECT 1 FROM ${child} a WHERE NOT EXISTS(SELECT 1 FROM ${parent} d WHERE d.id=a.draft_id) LIMIT 1`,
          )
          .get(),
      );
    const count = (name: string) =>
      names.has(name)
        ? Number(
            (store.prepare(`SELECT count(*) AS n FROM "${name}"`).get() as any)
              .n,
          )
        : 0;
    const bounds: Record<string, number> = {
      owner: 1,
      drafts: 50,
      publications: 50,
      assets: 800,
      publication_assets: 800,
      history_heads: 10000,
      draft_versions: HISTORY_PROPERTIES * HISTORY_LIMIT,
      version_blobs: HISTORY_PROPERTIES * HISTORY_LIMIT * 16,
      version_assets: HISTORY_PROPERTIES * HISTORY_LIMIT * 16,
      activity_log: ACTIVITY_LIMIT,
      sessions: 10000,
      geocoder_cache: 1000,
      geocoder_gate: 1,
      login_attempts: 1,
    };
    for (const [name, max] of Object.entries(bounds))
      requireValid(count(name) <= max);
    const owners = store.prepare("SELECT * FROM owner").all() as any[];
    requireValid(
      owners.length === 1 &&
        owners[0].id === 1 &&
        /^[a-z0-9_.@+-]{3,80}$/.test(owners[0].username) &&
        /^[a-f0-9]{48}$/.test(owners[0].salt) &&
        /^[a-f0-9]{128}$/.test(owners[0].password_hash),
    );
    const bytes = (name: string) =>
      names.has(name)
        ? Number(
            (
              store
                .prepare(
                  `SELECT coalesce(sum(length(content)),0) AS n FROM "${name}"`,
                )
                .get() as any
            ).n,
          )
        : 0;
    requireValid(
      bytes("assets") <= 300 * MB &&
        bytes("assets") + bytes("publication_assets") <= 600 * MB &&
        bytes("version_blobs") <= HISTORY_BYTES,
    );
    const checked = new Set<string>();
    async function checkAsset(content: unknown, panorama: boolean) {
      requireValid(content instanceof Uint8Array);
      const key =
        createHash("sha256").update(content).digest("hex") + ":" + panorama;
      if (!checked.has(key)) {
        await image(content, panorama);
        checked.add(key);
      }
    }
    async function checkRefs(
      m: Record<string, any>,
      rows: { id: string; content: Uint8Array }[],
    ) {
      requireValid(rows.length === m.photos.length + m.scenes.length);
      for (const asset of [...m.photos, ...m.scenes]) {
        const row = rows.find((r) => r.id === asset.id);
        requireValid(row);
        await checkAsset(
          row.content,
          m.scenes.some((s: any) => s.id === asset.id),
        );
      }
    }
    for (const row of store.prepare("SELECT * FROM drafts").all() as any[]) {
      requireValid(uuid(row.id) && integer(row.revision));
      const m = metadata(row.metadata, row.id, row.revision);
      await checkRefs(
        m,
        store
          .prepare("SELECT id,content FROM assets WHERE draft_id=?")
          .all(row.id) as any[],
      );
      if (schemaVersion === 1) {
        const head = store
          .prepare("SELECT * FROM history_heads WHERE id=?")
          .get(row.id) as any;
        requireValid(
          head &&
            head.deleted_at === null &&
            head.last_revision === row.revision,
        );
        requireValid(
          store
            .prepare(
              "SELECT 1 FROM draft_versions WHERE draft_id=? AND revision=?",
            )
            .get(row.id, row.revision),
        );
      }
    }
    for (const row of store
      .prepare("SELECT * FROM publications")
      .all() as any[]) {
      requireValid(uuid(row.id) && integer(row.revision));
      const draft = store
        .prepare("SELECT revision FROM drafts WHERE id=?")
        .get(row.id) as any;
      requireValid(draft && row.revision <= draft.revision);
      const p = json(row.metadata);
      requireValid(
        p.slug === `anuncio-${row.id}` &&
          p.published === true &&
          Array.isArray(p.gallery) &&
          p.gallery.length >= 1 &&
          p.gallery.length <= 8 &&
          Array.isArray(p.rooms) &&
          p.rooms.length <= 8,
      );
      // Validate the public operation data without reconstructing private coordinates or terms.
      requireValid(
        Object.keys(
          validateDraftInput({
            ...p,
            state: "Valid",
            city: "Valid",
            neighborhood: p.neighborhood,
            latitude: p.coordinates?.lat,
            longitude: p.coordinates?.lng,
            imageRights: true,
          } as DraftInput),
        ).length === 0,
      );
      requireValid(
        ![
          "visitAccess",
          "imageRights",
          "latitude",
          "longitude",
          "secret",
          "password",
        ].some((key) => Object.hasOwn(p, key)),
      );
      const prefix = `/api/public/media/${row.id}/`,
        ids = new Set<string>();
      const publicId = (url: unknown) => {
        requireValid(
          typeof url === "string" &&
            url.startsWith(prefix) &&
            uuid(url.slice(prefix.length)),
        );
        return url.slice(prefix.length);
      };
      for (const photo of p.gallery) {
        object(photo);
        const asset = publicId(photo.src);
        requireValid(!ids.has(asset));
        ids.add(asset);
      }
      requireValid(p.cover === p.gallery[0].src);
      for (const room of p.rooms) {
        object(room);
        requireValid(
          uuid(room.id) &&
            publicId(room.panorama) === room.id &&
            !ids.has(room.id),
        );
        ids.add(room.id);
      }
      requireValid(
        !validateDraftScenes(
          p.rooms.map((r: any) => ({ ...r, blob: new Blob(["fixture"]) })),
        ),
      );
      const rows = store
        .prepare("SELECT id,content FROM publication_assets WHERE draft_id=?")
        .all(row.id) as any[];
      requireValid(rows.length === ids.size);
      for (const asset of rows) {
        requireValid(ids.has(asset.id));
        await checkAsset(
          asset.content,
          p.rooms.some((r: any) => r.id === asset.id),
        );
      }
    }
    if (schemaVersion === 1) {
      requireValid(
        Number(
          (
            store
              .prepare(
                "SELECT count(DISTINCT draft_id) AS n FROM draft_versions",
              )
              .get() as any
          ).n,
        ) <= HISTORY_PROPERTIES,
      );
      for (const row of store
        .prepare(
          "SELECT draft_id,revision,metadata,reason,source_revision FROM draft_versions",
        )
        .all() as any[]) {
        requireValid(
          uuid(row.draft_id) &&
            integer(row.revision) &&
            ["baseline", "saved", "restored"].includes(row.reason) &&
            (row.source_revision === null ||
              (integer(row.source_revision) &&
                row.source_revision < row.revision)),
        );
        const m = metadata(row.metadata, row.draft_id, row.revision),
          head = store
            .prepare("SELECT * FROM history_heads WHERE id=?")
            .get(row.draft_id) as any;
        requireValid(head && head.last_revision >= row.revision);
        await checkRefs(
          m,
          store
            .prepare(
              "SELECT a.id,b.content FROM version_assets a JOIN version_blobs b ON b.hash=a.hash WHERE a.draft_id=? AND a.revision=?",
            )
            .all(row.draft_id, row.revision) as any[],
        );
      }
      for (const row of store
        .prepare("SELECT hash,content FROM version_blobs")
        .iterate() as Iterable<any>) {
        requireValid(
          /^[a-f0-9]{64}$/.test(row.hash) &&
            row.content instanceof Uint8Array &&
            createHash("sha256").update(row.content).digest("hex") === row.hash,
        );
      }
      requireValid(
        !store
          .prepare(
            "SELECT 1 FROM version_blobs b WHERE NOT EXISTS(SELECT 1 FROM version_assets a WHERE a.hash=b.hash) LIMIT 1",
          )
          .get(),
      );
      for (const event of store
        .prepare("SELECT * FROM activity_log")
        .iterate() as Iterable<any>) {
        requireValid(
          integer(event.id) &&
            typeof event.created_at === "string" &&
            Number.isFinite(Date.parse(event.created_at)) &&
            ["owner", "system"].includes(event.actor) &&
            typeof event.action === "string" &&
            /^[a-z_.]{1,80}$/.test(event.action) &&
            (event.draft_id === null || uuid(event.draft_id)) &&
            (event.revision === null || integer(event.revision)) &&
            (event.source_revision === null || integer(event.source_revision)),
        );
      }
      for (const row of store
        .prepare("SELECT * FROM history_heads")
        .all() as any[]) {
        requireValid(
          uuid(row.id) &&
            integer(row.last_revision) &&
            (row.deleted_at === null ||
              (typeof row.deleted_at === "string" &&
                Number.isFinite(Date.parse(row.deleted_at)))),
        );
        const n = Number(
          (
            store
              .prepare(
                "SELECT count(*) AS n FROM draft_versions WHERE draft_id=?",
              )
              .get(row.id) as any
          ).n,
        );
        requireValid(n <= HISTORY_LIMIT);
        const live = store
          .prepare("SELECT revision FROM drafts WHERE id=?")
          .get(row.id) as any;
        requireValid(
          row.deleted_at === null
            ? live && live.revision === row.last_revision
            : !live,
        );
      }
    }
    return {
      schemaVersion,
      drafts: count("drafts"),
      publications: count("publications"),
      versions: count("draft_versions"),
      assets: count("assets") + count("publication_assets"),
      activity: count("activity_log"),
      sha256: hash,
      bytes: stat.size,
      checksumVerified,
    };
  } catch {
    throw new Error(
      "Respaldo rechazado: estructura, versión, datos o medios inválidos. El archivo original se conserva.",
    );
  } finally {
    store.close();
  }
}
export async function createPrivateBackup(
  store: DatabaseSync,
  destination: string,
) {
  const file = privatePath(destination);
  if (existsSync(file) || existsSync(file + ".manifest.json"))
    throw new Error("El destino ya existe. Usa un nombre nuevo.");
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  // Reserve the destination before VACUUM; SQLite requires a zero-byte file.
  closeSync(
    openSync(
      file,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    ),
  );
  try {
    store.prepare("VACUUM INTO ?").run(file);
    chmodSync(file, 0o600);
    const result = await verifyPrivateBackup(file);
    writeFileSync(
      file + ".manifest.json",
      JSON.stringify(
        {
          format: "home-view-private-backup",
          version: 1,
          createdAt: new Date().toISOString(),
          ...result,
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    auditEvent(store, "backup.created", null, null, null, "system");
    return { ...result, checksumVerified: true };
  } catch (error) {
    rmSync(file, { force: true });
    rmSync(file + ".manifest.json", { force: true });
    throw error;
  }
}
export async function restorePrivateBackup(
  source: string,
  destination: string,
) {
  const input = privatePath(source),
    target = privatePath(destination);
  if (
    existsSync(target) &&
    (!lstatSync(target).isDirectory() || readdirSync(target).length)
  )
    throw new Error(
      "La restauración requiere una carpeta nueva o vacía. No sobrescribe bases existentes.",
    );
  const original = await verifyPrivateBackup(input);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const stage = mkdtempSync(join(dirname(target), ".home-view-restore-"));
  chmodSync(stage, 0o700);
  try {
    const file = join(stage, "private.sqlite");
    copyFileSync(input, file, constants.COPYFILE_EXCL);
    chmodSync(file, 0o600);
    requireValid(digest(file) === original.sha256);
    const store = new DatabaseSync(file);
    try {
      store.exec("PRAGMA trusted_schema=OFF; PRAGMA foreign_keys=ON;");
      initializeHistory(store);
      store.exec("BEGIN IMMEDIATE");
      try {
        store.exec("DELETE FROM sessions; DELETE FROM login_attempts;");
        auditEvent(store, "server.restored", null, null, null, "system");
        store.exec("COMMIT");
      } catch (error) {
        store.exec("ROLLBACK");
        throw error;
      }
      store.exec(
        "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;",
      );
    } finally {
      store.close();
    }
    const verified = await verifyPrivateBackup(file);
    // Recheck immediately before rename; never replace a live/nonempty directory.
    if (existsSync(target)) {
      requireValid(
        lstatSync(target).isDirectory() &&
          !lstatSync(target).isSymbolicLink() &&
          readdirSync(target).length === 0,
      );
      rmdirSync(target);
    }
    renameSync(stage, target);
    chmodSync(target, 0o700);
    return { ...verified, sourceChecksumVerified: original.checksumVerified };
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  }
}
