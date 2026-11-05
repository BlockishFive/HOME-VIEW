import { restorePrivateBackup } from "../lib/server/private-backup";
async function main() {
  try {
    if (process.argv.length !== 4)
      throw new Error(
        "Uso: npm run restore:private -- /ruta/privada/respaldo.sqlite /ruta/privada/carpeta-nueva",
      );
    const result = await restorePrivateBackup(process.argv[2], process.argv[3]);
    console.log(JSON.stringify(result, null, 2));
    console.log(
      "Copia restaurada en una carpeta independiente. Conserva el usuario y contraseña originales; todas las sesiones fueron revocadas. No se cambió la base activa ni se inició un servidor.",
    );
    console.log(
      "Incluye las publicaciones que estaban vigentes en el respaldo: serán visibles si arrancas el sitio con esta copia. Úsala primero en una prueba privada.",
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo restaurar el respaldo.",
    );
    process.exitCode = 1;
  }
}
void main();
