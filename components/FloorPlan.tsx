"use client";
import { useI18n } from "./I18nProvider";
import type { Room, RoomId } from "@/lib/properties";
export function FloorPlan({
  rooms,
  current,
  onSelect,
}: {
  rooms: Room[];
  current: RoomId;
  onSelect: (id: RoomId) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="floorplan">
      <div className="floorplan-heading">
        <strong>{t("Tu ubicación")}</strong>
        <span>{t("Plano esquemático")}</span>
      </div>
      <div className="plan-canvas">
        <svg
          viewBox="0 0 200 130"
          role="img"
          aria-label={t(
            "Distribución ilustrativa: sala a la izquierda, cocina arriba y recámara abajo a la derecha",
          )}
        >
          <path
            d="M8 8H192V122H8Z M111 8V46 M111 70V122 M111 61H192"
            fill="#f2f1e9"
            stroke="#929989"
            strokeWidth="3"
          />
          <path
            d="M111 46Q126 46 126 61 M111 70Q96 70 96 85"
            fill="none"
            stroke="#b2b6a8"
            strokeWidth="1"
          />
        </svg>
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            aria-pressed={current === room.id}
            aria-label={t("Ir a {name}", { name: t(room.name) })}
            className={`plan-room ${current === room.id ? "active" : ""}`}
            style={{ left: `${room.x}%`, top: `${room.y}%` }}
          >
            <span aria-hidden="true">{current === room.id ? "●" : "○"}</span>
            {t(
              room.name === "Sala de estar" || room.name === "Living room"
                ? "Sala"
                : room.name,
            )}
          </button>
        ))}
      </div>
      <small>{t("Distribución orientativa, sin escala.")}</small>
    </div>
  );
}
