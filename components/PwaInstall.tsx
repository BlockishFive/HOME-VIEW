"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const updateDisplay = () => setStandalone(display.matches);
    updateDisplay();
    display.addEventListener("change", updateDisplay);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const installed = () => {
      setPrompt(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => setError("No se pudo activar el aviso sin conexión. Puedes seguir usando el sitio con conexión."));
    }
    return () => {
      display.removeEventListener("change", updateDisplay);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setError("Usa el menú de tu navegador para instalar Home View.");
    } finally {
      setPrompt(null);
    }
  }

  if (standalone) return null;
  return (
    <aside className="pwa-install" aria-label="Instalar Home View">
      <div>
        <strong>Home View en tu móvil</strong>
        <p>Instala el piloto desde el navegador. Los borradores siguen solo en este dispositivo.</p>
        <details>
          <summary>Cómo instalar y usar sin conexión</summary>
          <p>En Android o escritorio, abre el menú del navegador y elige Instalar aplicación. En Safari de iPhone o iPad, usa Compartir → Añadir a pantalla de inicio. La opción depende del navegador y requiere HTTPS (o localhost).</p>
          <p>Este piloto necesita conexión para abrir sus pantallas. Sin conexión muestra un aviso; los borradores guardados no se borran. No hay sincronización ni acceso privado.</p>
        </details>
        {error && <p role="status">{error}</p>}
      </div>
      {prompt && <button type="button" onClick={() => void install()}>Instalar Home View</button>}
    </aside>
  );
}
