"use client";
import { ArrowIcon } from "@/components/ArrowIcon";
import { useState } from "react";
import type { Property, RoomId } from "@/lib/properties";
import { PanoramaViewer } from "./PanoramaViewer";
import { FloorPlan } from "./FloorPlan";
import { VisitRequest } from "./VisitRequest";
export function PropertyTour({ property }: { property: Property }) {
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
            <p className="eyebrow">RECORRE CADA ESPACIO</p>
            <h2 id="tour-title">Entra. Mira. Imagina.</h2>
          </div>
          <p>
            Muévete por el interior con los puntos
            <br /> del recorrido o el plano de habitaciones.
          </p>
        </div>
        <div className="tour-layout">
          <div>
            <PanoramaViewer
              rooms={property.rooms}
              current={current}
              onSelect={setCurrent}
            />
            <div
              className="room-tabs"
              role="group"
              aria-label="Habitaciones del recorrido"
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
            <p className="eyebrow">EXPLORA CADA RINCÓN</p>
            <h2>Siéntete en casa.</h2>
            <p className="muted">
              Elige un espacio en el plano o sigue los puntos del recorrido.
            </p>
            <FloorPlan
              rooms={property.rooms}
              current={current}
              onSelect={setCurrent}
            />
            <div className="sidebar-price">
              <small>PRECIO ILUSTRATIVO</small>
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
