import test from "node:test";
import assert from "node:assert/strict";
import { assertPrivateOrigin } from "../lib/server/private-origin";
const request = (origin: string, host = "127.0.0.1:3000") =>
  new Request("http://127.0.0.1:3000/api/private/login", {
    headers: { Origin: origin, Host: host },
  });
test("private writes require exact origin and do not trust supplied forwarded host headers", () => {
  assert.doesNotThrow(() =>
    assertPrivateOrigin(request("http://127.0.0.1:3000"), {}),
  );
  assert.throws(() =>
    assertPrivateOrigin(request("http://127.0.0.1:9000"), {}),
  );
  assert.throws(() =>
    assertPrivateOrigin(request("https://attacker.example"), {}),
  );
  assert.throws(() =>
    assertPrivateOrigin(request("http://example.com", "example.com"), {}),
  );
  const supplied = request("https://attacker.example");
  supplied.headers.set("x-forwarded-host", "attacker.example");
  assert.throws(() => assertPrivateOrigin(supplied, {}));
});
test("Codespaces proxy accepts only its configured HTTPS host and production can pin a public origin", () => {
  const env = {
    CODESPACE_NAME: "example-pilot",
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
  };
  assert.doesNotThrow(() =>
    assertPrivateOrigin(
      request("https://example-pilot-3000.app.github.dev", "localhost:3000"),
      env,
    ),
  );
  assert.throws(() =>
    assertPrivateOrigin(
      request("https://another-3000.app.github.dev", "localhost:3000"),
      env,
    ),
  );
  assert.doesNotThrow(() =>
    assertPrivateOrigin(request("https://private.example"), {
      HOME_VIEW_PUBLIC_ORIGIN: "https://private.example",
    }),
  );
  assert.throws(() =>
    assertPrivateOrigin(request("https://other.example"), {
      HOME_VIEW_PUBLIC_ORIGIN: "https://private.example",
    }),
  );
});
