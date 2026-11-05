import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
for (const scenario of ["history", "backup"]) {
  test(
    `isolated ${scenario}: retention, recovery, privacy and atomic failure`,
    { timeout: 120000 },
    () => {
      const child = spawnSync(
        process.execPath,
        ["--import", "tsx", "tests/fixtures/history-backup.ts", scenario],
        {
          encoding: "utf8",
          timeout: 110000,
          env: { ...process.env, NODE_TEST_CONTEXT: undefined },
        },
      );
      assert.equal(child.error, undefined);
      assert.equal(child.status, 0, child.stderr);
      assert.ok(child.stdout.includes('"ok":true'));
    },
  );
}
