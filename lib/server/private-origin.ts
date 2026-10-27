import { getAllowedDevOrigins } from "../dev-origins";
import { PrivateError } from "./private-store";
/** Trust an exact configured public origin, never an arbitrary forwarded-host header. */
export function assertPrivateOrigin(
  request: Request,
  env: Record<string, string | undefined> = process.env,
) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    throw new PrivateError("origin", 403);
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new PrivateError("origin", 403);
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    (parsed.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
  )
    throw new PrivateError("origin", 403);
  if (env.HOME_VIEW_PUBLIC_ORIGIN) {
    let expected: URL;
    try {
      expected = new URL(env.HOME_VIEW_PUBLIC_ORIGIN);
    } catch {
      throw new PrivateError("origin", 403);
    }
    if (
      expected.origin !== parsed.origin ||
      expected.pathname !== "/" ||
      expected.search ||
      expected.hash ||
      expected.username ||
      expected.password
    )
      throw new PrivateError("origin", 403);
    return;
  }
  const codespaces = getAllowedDevOrigins(env).filter(
    (host) => host !== "127.0.0.1",
  );
  if (parsed.host === request.headers.get("host")) return;
  if (
    parsed.protocol === "https:" &&
    parsed.port === "" &&
    codespaces.includes(parsed.hostname)
  )
    return;
  throw new PrivateError("origin", 403);
}
