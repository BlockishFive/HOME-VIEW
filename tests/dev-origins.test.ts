import test from "node:test";
import assert from "node:assert/strict";
import { getAllowedDevOrigins } from "../lib/dev-origins";

test("local development does not authorize unrelated forwarded hosts", () => {
  assert.deepEqual(getAllowedDevOrigins({}), ["127.0.0.1"]);
  assert.deepEqual(getAllowedDevOrigins({ PORT: "3000" }), ["127.0.0.1"]);
});

test("Codespaces authorizes the exact current forwarded hostname", () => {
  assert.deepEqual(
    getAllowedDevOrigins({ CODESPACE_NAME: "home-view-demo-a1b2" }),
    ["127.0.0.1", "home-view-demo-a1b2-3000.app.github.dev"],
  );
});

test("an alternate forwarding domain and numeric port stay narrowly scoped", () => {
  assert.deepEqual(
    getAllowedDevOrigins({
      CODESPACE_NAME: "home-view-demo-a1b2",
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "preview.example.org",
      PORT: "4321",
    }),
    ["127.0.0.1", "home-view-demo-a1b2-4321.preview.example.org"],
  );
});

test("malformed environment values never broaden development access", () => {
  for (const name of [
    "",
    "*",
    "demo.evil",
    "https://demo",
    "-demo",
    "demo-",
    "demo/other",
    "demo user",
    "demo\n",
    "a".repeat(60),
  ]) {
    assert.deepEqual(getAllowedDevOrigins({ CODESPACE_NAME: name }), [
      "127.0.0.1",
    ]);
  }
  for (const domain of [
    "",
    "*.app.github.dev",
    "https://app.github.dev",
    "app.github.dev:443",
    "app.github.dev/path",
    "app..github.dev",
    ".app.github.dev",
    "app.github.dev.",
    "user@app.github.dev",
    "localhost",
    "app.github.dev\n",
  ]) {
    assert.deepEqual(
      getAllowedDevOrigins({
        CODESPACE_NAME: "demo",
        GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: domain,
      }),
      ["127.0.0.1"],
    );
  }
  for (const port of [
    "",
    "0",
    "65536",
    "-3000",
    "3000/other",
    "3000.example.org",
    "3e3",
    "NaN",
    " 3000",
    "3000\n",
  ]) {
    assert.deepEqual(
      getAllowedDevOrigins({ CODESPACE_NAME: "demo", PORT: port }),
      ["127.0.0.1"],
    );
  }
});
