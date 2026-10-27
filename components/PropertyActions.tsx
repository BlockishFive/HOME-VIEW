"use client";
import { useI18n } from "./I18nProvider";

import { useId, useState } from "react";

export function PropertyActions({ title }: { title: string }) {
  const { locale, t } = useI18n();
  const inputId = useId();
  const [feedback, setFeedback] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [sharing, setSharing] = useState(false);

  async function share() {
    const url = new URL(window.location.href);
    url.hash = "";
    setFeedback("");
    setManualUrl("");
    setSharing(true);
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: `${title} · Home View`,
            url: url.href,
          });
          return;
        } catch (error) {
          // A canceled native share sheet should not trigger another action.
          if (
            error &&
            typeof error === "object" &&
            "name" in error &&
            error.name === "AbortError"
          )
            return;
        }
      }
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url.href);
          setFeedback("Enlace copiado.");
          return;
        } catch {
          // Browser permissions can deny clipboard access even when it exists.
        }
      }
      setManualUrl(url.href);
      setFeedback(
        "No se pudo copiar automáticamente. Puedes copiar el enlace de abajo.",
      );
    } finally {
      setSharing(false);
    }
  }

  function print() {
    setFeedback("");
    try {
      window.print();
    } catch {
      setFeedback(
        "No se pudo abrir la impresión. Usa la opción Imprimir de tu navegador.",
      );
    }
  }

  return (
    <div className="property-actions">
      <div
        className="action-buttons"
        role="group"
        aria-label={t("Acciones de la propiedad")}
      >
        <button
          type="button"
          className="action-button"
          onClick={() => void share()}
          disabled={sharing}
        >
          <svg
            className="action-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
          </svg>
          {t("Compartir")}
        </button>
        <button type="button" className="action-button" onClick={print}>
          <svg
            className="action-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7Z" />
            <path d="M16 11h1" />
          </svg>
          {t("Imprimir")}
        </button>
      </div>
      {feedback && (
        <p className="action-feedback" role="status">
          {t(feedback)}
        </p>
      )}
      {manualUrl && (
        <div className="action-manual-link">
          <label htmlFor={inputId}>{t("Enlace de esta propiedad")}</label>
          <input
            id={inputId}
            type="url"
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
