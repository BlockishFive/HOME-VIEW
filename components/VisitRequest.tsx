"use client";
import { ArrowIcon } from "@/components/ArrowIcon";
import { useState } from "react";
export function VisitRequest() {
  const [open, setOpen] = useState(false);
  return (
    <div className="visit-request">
      <button
        className="button button-dark"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="visit-info"
      >
        Solicitar visita{" "}
        <span aria-hidden="true">
          <ArrowIcon />
        </span>
      </button>
      {open && (
        <div id="visit-info" role="status" className="visit-message">
          <strong>Estás explorando una demostración.</strong>
          <p>
            La solicitud de visita aún no envía mensajes ni reserva citas. En la
            versión de producción podrás contactar al asesor desde aquí.
          </p>
          <button onClick={() => setOpen(false)} className="text-button">
            Entendido
          </button>
        </div>
      )}
      <small>Demo sin envío de datos personales.</small>
    </div>
  );
}
