import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  configureOwner,
  authenticated,
  login,
  logout,
  db,
  putDraft,
  listDrafts,
  getAsset,
  removeDraft,
  PrivateError,
} from "../lib/server/private-store";
const directory = mkdtempSync(join(tmpdir(), "home-view-private-unit-"));
process.env.HOME_VIEW_DATA_DIR = directory;
test("private owner has no public registration, uses hashed credentials and revocable expiring sessions", () => {
  assert.throws(() => configureOwner("pilot", "short"), PrivateError);
  configureOwner("pilot", "Fictitious-pilot-test-only-2026");
  const owner = db().prepare("SELECT password_hash,salt FROM owner").get()!;
  assert.notEqual(owner.password_hash, "Fictitious-pilot-test-only-2026");
  assert.throws(
    () => configureOwner("other", "Fictitious-pilot-test-only-2026"),
    PrivateError,
  );
  assert.equal(authenticated(undefined), false);
  assert.throws(() => login("pilot", "wrong"), PrivateError);
  const token = login("pilot", "Fictitious-pilot-test-only-2026");
  assert.equal(authenticated(token), true);
  assert.equal(
    db()
      .prepare("SELECT token_hash FROM sessions WHERE token_hash=?")
      .get(token),
    undefined,
  );
  logout(token);
  assert.equal(authenticated(token), false);
  const expired = login("pilot", "Fictitious-pilot-test-only-2026");
  db().exec("UPDATE sessions SET expires=0");
  assert.equal(authenticated(expired), false);
});
test("private writes detect stale versions, keep media atomic, and prevent stale deletion", () => {
  const id = randomUUID(),
    asset = randomUUID();
  const first = putDraft(
    {
      id,
      sharedRevision: 0,
      title: "Fictional private draft",
      updatedAt: "2026-01-01",
    },
    [{ id: asset, content: Buffer.from("first") }],
    0,
  );
  assert.equal(first.sharedRevision, 1);
  assert.equal(Buffer.from(getAsset(id, asset)!).toString(), "first");
  assert.throws(
    () =>
      putDraft(
        { id, sharedRevision: 0, title: "stale" },
        [{ id: asset, content: Buffer.from("bad") }],
        0,
      ),
    (e) => e instanceof PrivateError && e.status === 409,
  );
  assert.equal(Buffer.from(getAsset(id, asset)!).toString(), "first");
  const second = putDraft(
    { id, sharedRevision: 1, title: "updated" },
    [{ id: asset, content: Buffer.from("second") }],
    1,
  );
  assert.equal(second.sharedRevision, 2);
  assert.equal(listDrafts()[0].title, "updated");
  assert.throws(() => removeDraft(id, 1), PrivateError);
  removeDraft(id, 2);
  assert.equal(getAsset(id, asset), undefined);
  assert.equal(listDrafts().length, 0);
});
test("private login throttles repeated failures and password reset revokes sessions without removing drafts", () => {
  const token = login("pilot", "Fictitious-pilot-test-only-2026");
  for (let i = 0; i < 10; i++)
    assert.throws(() => login("pilot", "incorrect"), PrivateError);
  assert.throws(
    () => login("pilot", "Fictitious-pilot-test-only-2026"),
    (e) => e instanceof PrivateError && e.status === 429,
  );
  const id = randomUUID();
  putDraft({ id, sharedRevision: 0, title: "retained" }, [], 0);
  configureOwner("pilot", "Replacement-fictitious-password-2026", true);
  assert.equal(authenticated(token), false);
  assert.equal(listDrafts().length, 1);
  assert.equal(
    authenticated(login("pilot", "Replacement-fictitious-password-2026")),
    true,
  );
});
test("consistent backup retains private records and images in a separate database connection", () => {
  const id = randomUUID(),
    asset = randomUUID();
  putDraft(
    { id, sharedRevision: 0, title: "backup fixture" },
    [{ id: asset, content: Buffer.from("image fixture") }],
    0,
  );
  const backup = join(directory, "backup.sqlite");
  db().prepare("VACUUM INTO ?").run(backup);
  const snapshot = new DatabaseSync(backup, { readOnly: true });
  assert.equal(
    (
      snapshot.prepare("SELECT revision FROM drafts WHERE id=?").get(id) as {
        revision: number;
      }
    ).revision,
    1,
  );
  assert.equal(
    Buffer.from(
      (
        snapshot
          .prepare("SELECT content FROM assets WHERE draft_id=?")
          .get(id) as { content: Uint8Array }
      ).content,
    ).toString(),
    "image fixture",
  );
  snapshot.close();
});
test.after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
