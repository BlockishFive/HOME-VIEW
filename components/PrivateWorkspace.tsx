"use client";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { ListingForm } from "./ListingForm";
import { useI18n, usePageTitle } from "./I18nProvider";
import { privateRequest } from "@/lib/shared-drafts";
export function PrivateWorkspace() {
  const { t } = useI18n();
  usePageTitle("Área privada · Home View");
  const [state, setState] = useState<"loading" | "setup" | "login" | "ready">(
    "loading",
  );
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    privateRequest("session")
      .then((r) => r.json())
      .then((s) => {
        if (active)
          setState(
            !s.configured ? "setup" : s.authenticated ? "ready" : "login",
          );
      })
      .catch(() => {
        if (active) {
          setError(
            "No se pudo conectar con el área privada. Recarga cuando tengas conexión.",
          );
          setState("login");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const loggedOut = (event: StorageEvent) => {
      if (event.key === "home-view-private-logout") {
        setPassword("");
        setState("login");
      }
    };
    window.addEventListener("storage", loggedOut);
    return () => window.removeEventListener("storage", loggedOut);
  }, []);
  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await privateRequest("login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      setPassword("");
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }
  async function exit() {
    setBusy(true);
    setError("");
    try {
      await privateRequest("logout", { method: "POST" });
      setState("login");
      try {
        localStorage.setItem("home-view-private-logout", String(Date.now()));
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar sesión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="section-wrap listing-page">
        <div className="listing-heading">
          <p className="eyebrow">{t("CAPTURA COMPARTIDA · ACCESO PRIVADO")}</p>
          <h1>{t("Tus propiedades, en tus dispositivos.")}</h1>
          <p>
            {t(
              "Inicia sesión desde la misma dirección del sitio en el iPad y la PC. Los borradores privados y sus imágenes se guardan en el servidor y no se publican en el catálogo.",
            )}
          </p>
        </div>
        {error && (
          <p className="listing-error" role="alert">
            {t(error)}
          </p>
        )}
        {state === "loading" ? (
          <p role="status">{t("Comprobando acceso privado…")}</p>
        ) : state === "setup" ? (
          <p className="listing-local-notice">
            {t(
              "El área privada aún no está configurada. La persona administradora debe activar el acceso antes de iniciar sesión.",
            )}
          </p>
        ) : state === "login" ? (
          <form className="listing-form private-login" onSubmit={enter}>
            <fieldset disabled={busy}>
              <legend>{t("Entrar al área privada")}</legend>
              <p className="listing-help">
                {t(
                  "Acceso reservado al piloto. No hay registro público ni recuperación de contraseña por correo.",
                )}
              </p>
              <label className="listing-field">
                <span>{t("Usuario privado")}</span>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </label>
              <label className="listing-field">
                <span>{t("Contraseña")}</span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  maxLength={256}
                />
              </label>
              <button className="button button-dark" type="submit">
                {t(busy ? "Entrando…" : "Iniciar sesión")}
              </button>
            </fieldset>
          </form>
        ) : (
          <>
            <div className="private-toolbar">
              <p>
                {t(
                  "Sesión privada activa. Cada guardado se comparte con tus otros dispositivos al actualizar la lista.",
                )}
              </p>
              <button
                className="button button-dark"
                disabled={busy}
                onClick={() => void exit()}
              >
                {t("Cerrar sesión")}
              </button>
            </div>
            <ListingForm storage="shared" />
          </>
        )}
      </main>
    </>
  );
}
