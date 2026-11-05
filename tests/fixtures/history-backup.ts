import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  existsSync,
  chmodSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  initializeHistory,
  listHistory,
  listVersions,
  listActivity,
  historicalAsset,
  HISTORY_LIMIT,
} from "../../lib/server/history-store";
import {
  createPrivateBackup,
  verifyPrivateBackup,
  restorePrivateBackup,
  privatePath,
} from "../../lib/server/private-backup";
async function main() {
  const directory = mkdtempSync(join(tmpdir(), "home-view-history-fixture-"));
  process.env.HOME_VIEW_DATA_DIR = join(directory, "active");
  const store = await import("../../lib/server/private-store");
  const { setPublication, publishedProperties, publishedAsset } = await import(
    "../../lib/server/publications"
  );
  const {
    configureOwner,
    db,
    putDraft,
    listDrafts,
    removeDraft,
    restoreHistoricalDraft,
    clearHistory,
    login,
    authenticated,
  } = store;
  const id = randomUUID(),
    photo = randomUUID(),
    scene = randomUUID();
  const photoBytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#446633" },
  })
    .jpeg()
    .toBuffer();
  const panorama = await sharp({
    create: { width: 2048, height: 1024, channels: 3, background: "#553366" },
  })
    .jpeg()
    .toBuffer();
  const assets = [
    { id: photo, content: photoBytes },
    { id: scene, content: panorama },
  ];
  const m = {
    id,
    sharedRevision: 0,
    schemaVersion: 2,
    title: "Fictional history house",
    description:
      "Synthetic authorized property for isolated restoration testing.",
    operation: "Venta",
    sale: { purchasePrice: 2000000, annualTax: null },
    propertyType: "Casa",
    area: 120,
    beds: null,
    baths: null,
    locationReviewed: true,
    publicLocation: "approximate",
    city: "León",
    state: "Guanajuato",
    neighborhood: "Fictional zone",
    latitude: 21.12,
    longitude: -101.68,
    maintenance: { status: "unknown", amount: null, included: "unknown" },
    community: "unknown",
    imageRights: true,
    photos: [
      {
        id: photo,
        name: "photo.jpg",
        url: `/api/private/media/${id}/${photo}`,
      },
    ],
    scenes: [
      {
        id: scene,
        name: "Room",
        hotspots: [],
        initialView: { yaw: 0, pitch: 0, fov: 1.2 },
        url: `/api/private/media/${id}/${scene}`,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  try {
    configureOwner("pilot", "Fictitious-isolated-pilot-2026");
    const token = login("pilot", "Fictitious-isolated-pilot-2026");
    putDraft(m, assets, 0);
    setPublication(id, 1, true);
    putDraft({ ...m, title: "New private revision" }, assets, 1);
    const eventsBefore = listActivity(db()).length;
    assert.throws(
      () => restoreHistoricalDraft(id, 1, 1, false),
      (e) => e instanceof store.PrivateError && e.code === "conflict",
    );
    assert.equal(listActivity(db()).length, eventsBefore);
    const restored = restoreHistoricalDraft(id, 1, 2, false);
    assert.equal(restored.sharedRevision, 3);
    assert.equal(restored.imageRights, false);
    assert.equal(restored.locationReviewed, false);
    assert.equal(publishedProperties()[0].title, m.title);
    assert.deepEqual(Buffer.from(publishedAsset(id, photo)!), photoBytes);
    assert.throws(() => setPublication(id, 3, true));
    assert.equal(publishedProperties()[0].title, m.title);
    assert.equal(listVersions(db(), id).length, 3);
    assert.equal(
      Number(db().prepare("SELECT count(*) n FROM version_blobs").get()!.n),
      2,
    );
    assert.deepEqual(
      Buffer.from(historicalAsset(db(), id, 1, scene)!),
      panorama,
    );
    if (process.argv[2] === "history") {
      for (let revision = 3; revision < 16; revision++)
        putDraft({ ...m, title: `Revision ${revision + 1}` }, assets, revision);
      assert.equal(listVersions(db(), id).length, HISTORY_LIMIT);
      assert.equal((listVersions(db(), id).at(-1) as any).revision, 7);
      assert.equal(
        Number(db().prepare("SELECT count(*) n FROM version_blobs").get()!.n),
        2,
      );
      assert.equal(listHistory(db())[0].lastRevision, 16);
      clearHistory(id, 16, false);
      assert.equal(listVersions(db(), id).length, 1);
      removeDraft(id, 16);
      assert.equal(listDrafts().length, 0);
      assert.equal(publishedProperties().length, 0);
      assert.equal(listHistory(db())[0].deleted, true);
      assert.throws(
        () => restoreHistoricalDraft(id, 16, 16, false),
        (e) => e instanceof store.PrivateError && e.code === "conflict",
      );
      assert.equal(restoreHistoricalDraft(id, 16, 16, true).sharedRevision, 17);
      removeDraft(id, 17);
      clearHistory(id, 17, true);
      assert.equal(listHistory(db()).length, 0);
      assert.equal(
        Number(db().prepare("SELECT count(*) n FROM version_blobs").get()!.n),
        0,
      );
      assert.throws(
        () => putDraft(m, assets, 0),
        (e) => e instanceof store.PrivateError && e.code === "conflict",
      );
      assert.throws(
        () => restoreHistoricalDraft(id, 17, 17, true),
        (e) => e instanceof store.PrivateError && e.code === "history_missing",
      );
      const log = JSON.stringify(listActivity(db()));
      assert.ok(log.includes("draft.restored"));
      for (const forbidden of [
        token,
        "Fictitious-isolated-pilot-2026",
        "photo.jpg",
        m.title,
      ])
        assert.ok(!log.includes(forbidden));
      const before = Number(
        db().prepare("SELECT count(*) n FROM activity_log").get()!.n,
      );
      db().exec("BEGIN IMMEDIATE");
      for (let n = 0; n < 200; n++)
        db()
          .prepare("INSERT INTO draft_versions VALUES (?,?,?,'saved',NULL,?)")
          .run(randomUUID(), 1, m.createdAt, JSON.stringify(m));
      db().exec("COMMIT");
      assert.throws(
        () => putDraft({ ...m, id: randomUUID() }, assets, 0),
        (e) => e instanceof store.PrivateError && e.code === "history_quota",
      );
      assert.equal(listDrafts().length, 0);
      assert.equal(
        Number(db().prepare("SELECT count(*) n FROM activity_log").get()!.n),
        before,
      );
      const memory = new DatabaseSync(":memory:");
      memory.exec(
        "PRAGMA foreign_keys=ON;CREATE TABLE drafts(id TEXT,revision INTEGER,metadata TEXT);CREATE TABLE assets(id TEXT,draft_id TEXT,content BLOB);",
      );
      memory
        .prepare("INSERT INTO drafts VALUES (?,?,?)")
        .run(id, 8, JSON.stringify({ ...m, sharedRevision: 8 }));
      memory
        .prepare("INSERT INTO assets VALUES (?,?,?)")
        .run(photo, id, photoBytes);
      initializeHistory(memory);
      assert.equal(listVersions(memory, id).length, 1);
      assert.equal((listVersions(memory, id)[0] as any).reason, "baseline");
      initializeHistory(memory);
      assert.equal(listVersions(memory, id).length, 1);
      memory.exec("PRAGMA user_version=2");
      assert.throws(
        () => initializeHistory(memory),
        (e) =>
          e instanceof store.PrivateError && e.code === "schema_unsupported",
      );
      memory.close();
    } else {
      const file = join(directory, "backups", "fixture.sqlite"),
        target = join(directory, "restored");
      const result = await createPrivateBackup(db(), file);
      assert.equal(statSync(file).mode & 0o777, 0o600);
      assert.equal(statSync(file + ".manifest.json").mode & 0o777, 0o600);
      const existingParent = join(directory, "existing-parent");
      mkdirSync(existingParent);
      chmodSync(existingParent, 0o755);
      await createPrivateBackup(db(), join(existingParent, "copy.sqlite"));
      assert.equal(statSync(existingParent).mode & 0o777, 0o755);
      assert.equal(result.drafts, 1);
      assert.equal(result.publications, 1);
      assert.equal(result.versions, 3);
      assert.equal((await verifyPrivateBackup(file)).checksumVerified, true);
      await assert.rejects(() => createPrivateBackup(db(), file));
      const manifest = readFileSync(file + ".manifest.json", "utf8");
      writeFileSync(
        file + ".manifest.json",
        manifest.replace(result.sha256, "0".repeat(64)),
      );
      await assert.rejects(() => verifyPrivateBackup(file));
      writeFileSync(file + ".manifest.json", manifest);
      const liveHash = db().prepare("SELECT password_hash FROM owner").get()!
        .password_hash;
      const restoredResult = await restorePrivateBackup(file, target);
      assert.equal(restoredResult.publications, 1);
      assert.equal(restoredResult.versions, 3);
      assert.equal(authenticated(token), true);
      const isolated = new DatabaseSync(join(target, "private.sqlite"), {
        readOnly: true,
      });
      assert.equal(
        Number(isolated.prepare("SELECT count(*) n FROM sessions").get()!.n),
        0,
      );
      assert.equal(
        Number(
          isolated.prepare("SELECT count(*) n FROM login_attempts").get()!.n,
        ),
        0,
      );
      assert.equal(
        isolated.prepare("SELECT password_hash FROM owner").get()!
          .password_hash,
        liveHash,
      );
      assert.equal(
        JSON.parse(
          isolated.prepare("SELECT metadata FROM drafts").get()!
            .metadata as string,
        ).imageRights,
        false,
      );
      assert.equal(
        JSON.parse(
          isolated.prepare("SELECT metadata FROM publications").get()!
            .metadata as string,
        ).title,
        m.title,
      );
      isolated.close();
      await assert.rejects(() => restorePrivateBackup(file, target));
      const empty = join(directory, "empty");
      mkdirSync(empty);
      await restorePrivateBackup(file, empty);
      const legacy = join(directory, "legacy.sqlite");
      db().prepare("VACUUM INTO ?").run(legacy);
      const old = new DatabaseSync(legacy);
      old.exec(
        "PRAGMA foreign_keys=OFF;DROP TABLE version_assets;DROP TABLE version_blobs;DROP TABLE draft_versions;DROP TABLE history_heads;DROP TABLE activity_log;PRAGMA user_version=0;PRAGMA journal_mode=DELETE;",
      );
      old.close();
      assert.equal((await verifyPrivateBackup(legacy)).checksumVerified, false);
      const migration = await restorePrivateBackup(
        legacy,
        join(directory, "legacy-restored"),
      );
      assert.equal(migration.schemaVersion, 1);
      assert.equal(migration.versions, 1);
      const bad = join(directory, "bad.sqlite");
      db().prepare("VACUUM INTO ?").run(bad);
      const broken = new DatabaseSync(bad);
      broken
        .prepare("UPDATE assets SET content=? WHERE id=?")
        .run(Buffer.from("not a jpeg"), photo);
      broken.close();
      await assert.rejects(() => verifyPrivateBackup(bad));
      for (const [name, sql] of [
        ["future", "PRAGMA user_version=99"],
        [
          "trigger",
          "CREATE TRIGGER untrusted AFTER INSERT ON drafts BEGIN DELETE FROM sessions; END",
        ],
        ["unknown", "CREATE TABLE unknown_private_data(value TEXT)"],
      ]) {
        const path = join(directory, `${name}.sqlite`);
        db().prepare("VACUUM INTO ?").run(path);
        const altered = new DatabaseSync(path);
        altered.exec(sql);
        altered.close();
        await assert.rejects(() => verifyPrivateBackup(path));
      }
      const link = join(directory, "symlink.sqlite");
      symlinkSync(file, link);
      assert.throws(() => privatePath(link));
      assert.throws(() => privatePath("public/private.sqlite"));
      writeFileSync(file + "-wal", "fake");
      await assert.rejects(() => verifyPrivateBackup(file));
      rmSync(file + "-wal");
      for (const [script, args] of [
        ["verify", [file]],
        ["restore", [file, join(directory, "cli-restored")]],
      ] as const) {
        const child = spawnSync(
          process.execPath,
          ["--import", "tsx", `scripts/${script}-private.ts`, ...args],
          { encoding: "utf8" },
        );
        assert.equal(child.status, 0, child.stderr);
        assert.ok(!child.stdout.includes(token));
      }
      assert.ok(existsSync(join(directory, "cli-restored", "private.sqlite")));
    }
    console.log(JSON.stringify({ ok: true, scenario: process.argv[2] }));
  } finally {
    db().close();
    rmSync(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
