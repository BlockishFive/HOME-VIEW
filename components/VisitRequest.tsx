"use client";
import { useI18n } from "./I18nProvider";
import { ArrowIcon } from "@/components/ArrowIcon";
import { useState } from "react";
export function VisitRequest() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="visit-request">
      <button
        className="button button-dark"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="visit-info"
      >
        {t("Solicitar visita")}{" "}
        <span aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>
      {open && (
        <div id="visit-info" role="status" className="visit-message">
          <strong>{t("Estás explorando una demostración.")}</strong>
          <p>
            {t(
              "La solicitud de visita aún no envía mensajes ni reserva citas. En la versión de producción podrás contactar al asesor desde aquí.",
            )}
          </p>
          <button onClick={() => setOpen(false)} className="text-button">
            {t("Entendido")}
          </button>
        </div>
      )}
      <small>{t("Demo sin envío de datos personales.")}</small>
    </div>
  );
}
