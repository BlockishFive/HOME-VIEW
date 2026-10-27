import { resolve, join, dirname } from "node:path";
import { mkdirSync, chmodSync } from "node:fs";
import { db, configured } from "../lib/server/private-store";
try {
  if (!configured()) throw new Error("Configura primero el acceso privado.");
  const directory = resolve(
    process.env.HOME_VIEW_DATA_DIR || join(process.cwd(), ".home-view"),
  );
  const destination = resolve(
    process.argv[2] ||
      join(
        directory,
        "backups",
        `private-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
      ),
  );
  if (
    destination === resolve("public") ||
    destination.startsWith(resolve("public") + "/")
  )
    throw new Error("El respaldo no puede guardarse en public.");
  mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
  db().prepare("VACUUM INTO ?").run(destination);
  chmodSync(destination, 0o600);
  console.log(`Respaldo privado creado: ${destination}`);
  console.log(
    "Incluye fotos, panoramas y configuración de acceso. Conserva una copia fuera del Codespace, en un lugar privado.",
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "No se pudo crear el respaldo.",
  );
  process.exitCode = 1;
}
