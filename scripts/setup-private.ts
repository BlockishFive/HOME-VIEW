import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { configureOwner, configured } from "../lib/server/private-store";
async function main() {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({
    input: process.stdin,
    output,
    terminal: !!process.stdin.isTTY,
  });
  try {
    if (configured() && !process.argv.includes("--reset"))
      throw new Error(
        "El acceso ya está configurado. Usa --reset para cambiar la contraseña conservando los borradores.",
      );
    const username = await rl.question(
      "Usuario privado (3–80 caracteres, sin espacios): ",
    );
    process.stdout.write(
      "Contraseña nueva (mínimo 14 caracteres; no se muestra): ",
    );
    muted = true;
    const password = await rl.question("");
    muted = false;
    process.stdout.write("\n");
    process.stdout.write("Repite la contraseña: ");
    muted = true;
    const confirmation = await rl.question("");
    muted = false;
    process.stdout.write("\n");
    if (password !== confirmation)
      throw new Error("Las contraseñas no coinciden.");
    configureOwner(username, password, process.argv.includes("--reset"));
    console.log(
      "Acceso privado configurado. Abre /privado en la misma dirección del sitio desde iPad y PC.",
    );
  } catch (error) {
    muted = false;
    console.error(
      error instanceof Error
        ? error.message
        : "No se pudo configurar el acceso.",
    );
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}
void main();
