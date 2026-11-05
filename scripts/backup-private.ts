import { resolve, join } from "node:path";
import { db, configured } from "../lib/server/private-store";
import { createPrivateBackup } from "../lib/server/private-backup";
async function main() {
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
    const result = await createPrivateBackup(db(), destination);
    console.log(`Respaldo privado verificado: ${destination}`);
    console.log(JSON.stringify(result, null, 2));
    console.log(
      "Conserva el archivo .sqlite y su .manifest.json juntos en una ubicación privada fuera del Codespace. Contienen fotos, recorridos, versiones, publicaciones y verificadores de contraseñas mediante hash. El respaldo no está cifrado.",
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "No se pudo crear el respaldo.",
    );
    process.exitCode = 1;
  }
}
void main();
