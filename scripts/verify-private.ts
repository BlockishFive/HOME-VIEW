import { verifyPrivateBackup } from "../lib/server/private-backup";
async function main() {
  try {
    if (process.argv.length !== 3)
      throw new Error(
        "Uso: npm run verify:private -- /ruta/privada/respaldo.sqlite",
      );
    const result = await verifyPrivateBackup(process.argv[2]);
    console.log(JSON.stringify(result, null, 2));
    console.log(
      result.checksumVerified
        ? "Integridad, medios y checksum coinciden. El checksum detecta cambios accidentales; no autentica al autor del archivo."
        : "Estructura y medios verificados. No existe manifiesto previo para comparar checksum.",
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo verificar el respaldo.",
    );
    process.exitCode = 1;
  }
}
void main();
