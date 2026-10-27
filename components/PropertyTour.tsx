"use client";
import { useI18n } from "./I18nProvider";
import { localizeProperty } from "@/lib/localized-properties";
import { ArrowIcon } from "@/components/ArrowIcon";
import { useState } from "react";
import type { Property, RoomId } from "@/lib/properties";
import { PanoramaViewer } from "./PanoramaViewer";
import { FloorPlan } from "./FloorPlan";
import { VisitRequest } from "./VisitRequest";
export function PropertyTour({
  property: sourceProperty,
}: {
  property: Property;
}) {
  const { locale, t } = useI18n();
  const property = localizeProperty(sourceProperty, locale);
  const [current, setCurrent] = useState<RoomId>("sala");
  return (
    <>
      <section
        id="recorrido"
        className="tour-section"
        aria-labelledby="tour-title"
        tabIndex={-1}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("RECORRE CADA ESPACIO")}</p>
            <h2 id="tour-title">{t("Entra. Mira. Imagina.")}</h2>
          </div>
          <p>
            {t("Muévete por el interior con los puntos")}
            <br /> {t("del recorrido o el plano de habitaciones.")}
          </p>
        </div>
        <div className="tour-layout">
          <div>
            <PanoramaViewer
              rooms={property.rooms}
              current={current}
              onSelect={setCurrent}
              translateRoomNames
            />
            <div
              className="room-tabs"
              role="group"
              aria-label={t("Habitaciones del recorrido")}
            >
              {property.rooms.map((room, i) => (
                <button
                  key={room.id}
                  aria-pressed={current === room.id}
                  onClick={() => setCurrent(room.id)}
                >
                  <span>0{i + 1}</span>
                  {room.name}
                  <span aria-hidden="true">
                    {current === room.id ? "●" : <ArrowIcon />}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <aside className="tour-sidebar">
            <p className="eyebrow">{t("EXPLORA CADA RINCÓN")}</p>
            <h2>{t("Siéntete en casa.")}</h2>
            <p className="muted">
              {t(
                "Elige un espacio en el plano o sigue los puntos del recorrido.",
              )}
            </p>
            <FloorPlan
              rooms={property.rooms}
              current={current}
              onSelect={setCurrent}
            />
            <div className="sidebar-price">
              <small>{t("PRECIO ILUSTRATIVO")}</small>
              <strong>
                {property.price} <span>MXN</span>
              </strong>
            </div>
            <VisitRequest />
          </aside>
        </div>
      </section>
    </>
  );
}
