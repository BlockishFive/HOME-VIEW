export type DevelopmentOriginEnvironment = {
  CODESPACE_NAME?: string;
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?: string;
  PORT?: string;
};

function validLabel(label: string) {
  return (
    label.length > 0 &&
    label.length <= 63 &&
    !/[^a-z0-9-]/i.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}

function validDomain(domain: string) {
  return (
    domain.length <= 253 &&
    domain.split(".").length >= 2 &&
    domain.split(".").every(validLabel)
  );
}

/** Allow only this Codespace's forwarded port, never arbitrary preview hosts. */
export function getAllowedDevOrigins(
  environment: DevelopmentOriginEnvironment,
): string[] {
  const origins = ["127.0.0.1"];
  const name = environment.CODESPACE_NAME;
  if (!name || !validLabel(name)) return origins;

  const domain =
    environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";
  const rawPort = environment.PORT ?? "3000";
  if (
    !validDomain(domain) ||
    !rawPort.length ||
    rawPort.length > 5 ||
    /[^0-9]/.test(rawPort)
  )
    return origins;
  const port = Number(rawPort);
  if (port < 1 || port > 65535) return origins;

  const forwardedLabel = `${name}-${port}`;
  const hostname = `${forwardedLabel}.${domain}`.toLowerCase();
  if (validLabel(forwardedLabel) && hostname.length <= 253)
    origins.push(hostname);
  return origins;
}
