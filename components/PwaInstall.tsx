"use client";
import { useI18n } from "./I18nProvider";
import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const { t } = useI18n();
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
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() =>
          setError(
            "No se pudo activar el aviso sin conexión. Puedes seguir usando el sitio con conexión.",
          ),
        );
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
    <aside className="pwa-install" aria-label={t("Instalar Home View")}>
      <div>
        <strong>{t("Home View en tu móvil")}</strong>
        <p>
          {t(
            "Instala el piloto desde el navegador. Usa el área privada para compartir capturas entre tus dispositivos.",
          )}
        </p>
        <details>
          <summary>{t("Cómo instalar y usar sin conexión")}</summary>
          <p>
            {t(
              "En Android o escritorio, abre el menú del navegador y elige Instalar aplicación. En Safari de iPhone o iPad, usa Compartir → Añadir a pantalla de inicio. La opción depende del navegador y requiere HTTPS (o localhost).",
            )}
          </p>
          <p>
            {t(
              "Este piloto necesita conexión para abrir sus pantallas. Sin conexión muestra un aviso. Los borradores locales permanecen en el navegador; los privados, en el servidor.",
            )}
          </p>
        </details>
        {error && <p role="status">{t(error)}</p>}
      </div>
      {prompt && (
        <button type="button" onClick={() => void install()}>
          {t("Instalar Home View")}
        </button>
      )}
    </aside>
  );
}
