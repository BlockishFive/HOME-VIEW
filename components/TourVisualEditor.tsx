"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { PanoramaViewer } from "./PanoramaViewer";
import { useDraftTourRooms } from "./useDraftTourRooms";
import {
  defaultSceneView,
  type DraftScene,
  type SceneView,
} from "@/lib/draft-tour";
export function TourVisualEditor({
  scenes,
  current,
  onSelect,
  onChange,
  disabled,
}: {
  scenes: DraftScene[];
  current: string;
  onSelect: (id: string) => void;
  onChange: (scenes: DraftScene[]) => void;
  disabled: boolean;
}) {
  const { t } = useI18n(),
    rooms = useDraftTourRooms(scenes);
  const [target, setTarget] = useState(""),
    [placing, setPlacing] = useState(false),
    [message, setMessage] = useState("");
  const scene = scenes.find((s) => s.id === current) ?? scenes[0];
  const destination =
    scenes.find((s) => s.id === target && s.id !== scene?.id)?.id ??
    scenes.find((s) => s.id !== scene?.id)?.id ??
    "";
  const live = useRef<SceneView>(defaultSceneView),
    [view, setView] = useState(defaultSceneView);
  useEffect(() => {
    setPlacing(false);
    setMessage("");
    live.current = scene?.initialView ?? defaultSceneView;
    setView(live.current);
  }, [scene?.id]);
  if (!scene) return null;
  function place(point: { yaw: number; pitch: number }) {
    if (disabled || !destination) return;
    const link = { target: destination, yaw: point.yaw, pitch: point.pitch };
    onChange(
      scenes.map((s) =>
        s.id !== scene.id
          ? s
          : {
              ...s,
              hotspots: [
                ...s.hotspots.filter((h) => h.target !== destination),
                link,
              ],
            },
      ),
    );
    setPlacing(false);
    setMessage("Conexión colocada. Puedes comprobarla en la vista previa.");
  }
  const degrees = (n: number) => Math.round((n * 180) / Math.PI);
  return (
    <section className="tour-visual-editor" aria-label={t("Editor visual 360")}>
      <h3>{t("Conectar escenas en el panorama")}</h3>
      <p>
        {t(
          "Arrastra para mirar alrededor. Activa la colocación y toca una puerta o un punto para situar la flecha. Arrastrar o pellizcar no crea conexiones.",
        )}
      </p>
      <div className="tour-visual-controls">
        <label className="listing-field">
          <span>{t("Escena que estás editando")}</span>
          <select
            value={scene.id}
            disabled={disabled}
            onChange={(e) => onSelect(e.target.value)}
          >
            {scenes.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.name || t("Escena {number}", { number: i + 1 })}
              </option>
            ))}
          </select>
        </label>
        <label className="listing-field">
          <span>{t("Destino de la flecha")}</span>
          <select
            value={destination}
            disabled={disabled || !destination}
            onChange={(e) => setTarget(e.target.value)}
          >
            {scenes
              .filter((s) => s.id !== scene.id)
              .map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name || t("Escena {number}", { number: i + 1 })}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="draft-tour-preview">
        <PanoramaViewer
          rooms={rooms}
          current={scene.id}
          onSelect={onSelect}
          label="EDITOR VISUAL · NO PUBLICADO"
          editing={{
            placing,
            disabled,
            onPlace: place,
            onView: (next) => {
              live.current = next;
              setView(next);
            },
          }}
        />
      </div>
      <p className="tour-view-position" aria-live="off">
        {t("Vista actual: horizontal {yaw}°, vertical {pitch}°.", {
          yaw: degrees(view.yaw),
          pitch: degrees(view.pitch),
        })}
      </p>
      <div className="tour-visual-actions">
        <button
          type="button"
          disabled={disabled || !destination}
          aria-pressed={placing}
          onClick={() => setPlacing(!placing)}
        >
          {t(
            placing
              ? "Cancelar colocación por toque"
              : "Activar colocación por toque",
          )}
        </button>
        <button
          type="button"
          disabled={disabled || !destination}
          onClick={() => place(live.current)}
        >
          {t("Colocar flecha en el centro de la vista")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(
              scenes.map((s) =>
                s.id === scene.id
                  ? {
                      ...s,
                      initialView: {
                        yaw: live.current.yaw,
                        pitch: live.current.pitch,
                        fov: Math.max(0.45, Math.min(1.7, live.current.fov)),
                      },
                    }
                  : s,
              ),
            );
            setMessage(
              "Orientación de entrada guardada en la captura. Guarda el borrador para confirmarla.",
            );
          }}
        >
          {t("Usar esta vista al entrar")}
        </button>
      </div>
      {placing && (
        <p className="tour-placement-notice" role="status">
          {t(
            "Colocación activa: toca el panorama para situar la flecha al destino elegido.",
          )}
        </p>
      )}
      {scene.hotspots.some((h) => h.target === destination) && (
        <p className="listing-help">
          {t(
            "Ese destino ya tiene una flecha; colocarla de nuevo actualizará su posición.",
          )}
        </p>
      )}
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
