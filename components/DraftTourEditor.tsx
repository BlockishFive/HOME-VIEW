"use client";
import { useI18n } from "@/components/I18nProvider";
import { useId, useState } from "react";
import { useDraftTourRooms } from "./useDraftTourRooms";
import { TourVisualEditor } from "./TourVisualEditor";
import { PanoramaViewer } from "./PanoramaViewer";
import {
  MAX_SCENES,
  analyzeTour,
  removeDraftScene,
  validatePanoramaDimensions,
  validatePanoramaFile,
  type DraftScene,
} from "@/lib/draft-tour";
import "./draft-tour.css";

async function preparePanorama(file: File): Promise<Blob> {
  const invalid = validatePanoramaFile(file);
  if (invalid) throw new Error(invalid);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const dimensionsError = validatePanoramaDimensions(
      image.naturalWidth,
      image.naturalHeight,
    );
    if (dimensionsError) throw new Error(dimensionsError);
    // Re-encode the complete sphere without cropping; remove source metadata.
    const width = Math.min(4096, image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width / 2;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("No se pudo preparar el panorama en este navegador.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, width / 2);
    context.drawImage(image, 0, 0, width, width / 2);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("No se pudo procesar el panorama.")),
        "image/jpeg",
        0.88,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function DraftTourPreview({
  scenes,
  shared = false,
}: {
  scenes: DraftScene[];
  shared?: boolean;
}) {
  const { t } = useI18n();
  const rooms = useDraftTourRooms(scenes);
  const [current, setCurrent] = useState("");
  const selected = rooms.some((room) => room.id === current)
    ? current
    : rooms[0]?.id;
  if (!selected) return null;
  return (
    <div className="draft-tour-preview">
      <h3>
        {t(shared ? "Vista previa 360 privada" : "Vista previa 360 local")}
      </h3>
      <p>
        {t(
          shared
            ? "Vista previa privada. Las conexiones son manuales y no se crean automáticamente."
            : "Solo en este dispositivo. Las conexiones son manuales y no se crean automáticamente.",
        )}
      </p>
      <PanoramaViewer
        rooms={rooms}
        current={selected}
        onSelect={setCurrent}
        label={t(
          shared
            ? "VISTA PREVIA PRIVADA · NO PUBLICADA"
            : "VISTA PREVIA LOCAL · NO PUBLICADA",
        )}
      />
      <div
        className="draft-scene-tabs"
        role="group"
        aria-label={t("Escenas del borrador")}
      >
        {rooms.map((room) => (
          <button
            type="button"
            key={room.id}
            aria-pressed={room.id === selected}
            onClick={() => setCurrent(room.id)}
          >
            {room.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Saved drafts do not allocate WebGL viewers until explicitly opened. */
export function DraftTourSavedPreview({
  scenes,
  shared = false,
}: {
  scenes: DraftScene[];
  shared?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!scenes.length) return null;
  return (
    <div className="draft-tour-saved-preview">
      <button
        type="button"
        className="button button-dark"
        onClick={() => setOpen((previous) => !previous)}
      >
        {t(
          open
            ? "Cerrar recorrido 360 del borrador"
            : "Ver recorrido 360 del borrador",
        )}
      </button>
      {open && <DraftTourPreview scenes={scenes} shared={shared} />}
    </div>
  );
}

export function DraftTourEditor({
  scenes,
  onChange,
  disabled = false,
  shared = false,
  onBusyChange,
}: {
  scenes: DraftScene[];
  onChange: (scenes: DraftScene[]) => void;
  disabled?: boolean;
  shared?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [visual, setVisual] = useState<string | null>(null);
  const analysis = analyzeTour(scenes);
  const sceneNames = (ids: string[]) =>
    ids
      .map(
        (id) => scenes.find((s) => s.id === id)?.name || t("Escena sin nombre"),
      )
      .join(", ");
  function update(id: string, values: Partial<DraftScene>) {
    onChange(
      scenes.map((scene) =>
        scene.id === id ? { ...scene, ...values } : scene,
      ),
    );
  }
  async function choose(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    if (files.length + scenes.length > MAX_SCENES) {
      setError(`Puedes preparar hasta ${MAX_SCENES} escenas.`);
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    try {
      const added: DraftScene[] = [];
      for (const file of Array.from(files)) {
        added.push({
          id: crypto.randomUUID(),
          name: t("Escena {number}", {
            number: scenes.length + added.length + 1,
          }),
          blob: await preparePanorama(file),
          hotspots: [],
        });
      }
      onChange([...scenes, ...added]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo leer el panorama.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <section className="draft-tour-editor" aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`}>{t("Panoramas 360 y escenas")}</h2>
      <p className="listing-help">
        {t(
          "Opcional. Separados de las fotografías normales. Añade hasta {count} capturas equirectangulares 360 de proporción exacta 2:1 (mínimo 1024 × 512 px), de hasta 12 MB cada una. Se reducen a 4096 px y se retiran metadatos. La proporción por sí sola no acredita que la captura cubra toda la esfera.",
          { count: MAX_SCENES },
        )}
      </p>
      <fieldset disabled={disabled || busy}>
        <legend className="draft-tour-legend">
          {t("Preparación local del recorrido")}
        </legend>
        <label className="listing-rights">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            {t(
              "Confirmo que son capturas 360 equirectangulares completas y que tengo autorización para usarlas.",
            )}
          </span>
        </label>
        <label className="listing-field" htmlFor={inputId}>
          <span>{t("Añadir panoramas 360")}</span>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!confirmed}
            onChange={(event) => {
              void choose(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {busy && <p role="status">{t("Preparando panoramas…")}</p>}
        {error && (
          <p className="listing-error" role="alert">
            {t(error)}
          </p>
        )}
        {visual && scenes.length > 0 && (
          <>
            <button type="button" onClick={() => setVisual(null)}>
              {t("Cerrar editor visual")}
            </button>
            <TourVisualEditor
              scenes={scenes}
              current={visual}
              onSelect={setVisual}
              onChange={onChange}
              disabled={disabled || busy}
            />
          </>
        )}
        {scenes.map((scene, sceneIndex) => (
          <div key={scene.id} className="draft-scene-card">
            {sceneIndex === 0 && (
              <p className="tour-entry-badge">
                {t("Escena inicial del recorrido")}
              </p>
            )}
            <label className="listing-field">
              <span>
                {t("Nombre de escena {number}", { number: sceneIndex + 1 })}
              </span>
              <input
                value={scene.name}
                maxLength={80}
                onChange={(event) =>
                  update(scene.id, { name: event.target.value })
                }
              />
            </label>
            <div className="tour-scene-actions">
              <button
                type="button"
                onClick={() => {
                  setVisual(scene.id);
                  setPreview(false);
                }}
              >
                {t("Editar visualmente escena {number}", {
                  number: sceneIndex + 1,
                })}
              </button>
              {sceneIndex > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange([
                      scene,
                      ...scenes.filter((s) => s.id !== scene.id),
                    ])
                  }
                >
                  {t("Empezar recorrido en escena {number}", {
                    number: sceneIndex + 1,
                  })}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(removeDraftScene(scenes, scene.id))}
            >
              {t("Eliminar escena {number}", { number: sceneIndex + 1 })}
            </button>
            <p>
              {t(
                "Conexiones desde {name} · un solo sentido. Añade el regreso en la otra escena si lo necesitas.",
                {
                  name:
                    scene.name ||
                    t("Escena {number}", { number: sceneIndex + 1 }),
                },
              )}
            </p>
            {scene.hotspots.map((hotspot, index) => {
              function setConnection(
                values: Partial<DraftScene["hotspots"][number]>,
              ) {
                update(scene.id, {
                  hotspots: scene.hotspots.map((h, i) =>
                    index === i ? { ...h, ...values } : h,
                  ),
                });
              }
              return (
                <div key={index} className="draft-connection">
                  <label className="listing-field">
                    <span>
                      {t("Destino {number}", {
                        number: `${sceneIndex + 1}.${index + 1}`,
                      })}
                    </span>
                    <select
                      value={hotspot.target}
                      onChange={(event) =>
                        setConnection({ target: event.target.value })
                      }
                    >
                      {scenes
                        .filter((s) => s.id !== scene.id)
                        .map((target) => (
                          <option
                            key={target.id}
                            value={target.id}
                            disabled={scene.hotspots.some(
                              (h, i) => i !== index && h.target === target.id,
                            )}
                          >
                            {target.name || t("Sin nombre")}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="listing-field">
                    <span>
                      {t("Ángulo horizontal {number} (°)", {
                        number: `${sceneIndex + 1}.${index + 1}`,
                      })}
                    </span>
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={Math.round((hotspot.yaw * 180) / Math.PI)}
                      onChange={(event) =>
                        setConnection({
                          yaw: (Number(event.target.value) * Math.PI) / 180,
                        })
                      }
                    />
                  </label>
                  <label className="listing-field">
                    <span>
                      {t("Ángulo vertical {number} (°)", {
                        number: `${sceneIndex + 1}.${index + 1}`,
                      })}
                    </span>
                    <input
                      type="number"
                      min={-90}
                      max={90}
                      step={1}
                      value={Math.round((hotspot.pitch * 180) / Math.PI)}
                      onChange={(event) =>
                        setConnection({
                          pitch: (Number(event.target.value) * Math.PI) / 180,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      update(scene.id, {
                        hotspots: scene.hotspots.filter((_, i) => i !== index),
                      })
                    }
                  >
                    {t("Quitar conexión {number}", {
                      number: `${sceneIndex + 1}.${index + 1}`,
                    })}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              disabled={
                !scenes.some(
                  (target) =>
                    target.id !== scene.id &&
                    !scene.hotspots.some((h) => h.target === target.id),
                )
              }
              onClick={() => {
                const target = scenes.find(
                  (candidate) =>
                    candidate.id !== scene.id &&
                    !scene.hotspots.some((h) => h.target === candidate.id),
                );
                if (target)
                  update(scene.id, {
                    hotspots: [
                      ...scene.hotspots,
                      { target: target.id, yaw: 0, pitch: 0 },
                    ],
                  });
              }}
            >
              {t("Añadir conexión desde escena {number}", {
                number: sceneIndex + 1,
              })}
            </button>
          </div>
        ))}
        {(analysis.unreachable.length > 0 || analysis.noReturn.length > 0) && (
          <aside className="tour-connectivity">
            <h3>{t("Revisar conexiones del recorrido")}</h3>
            {analysis.unreachable.length > 0 && (
              <p>
                {t("Sin camino desde la escena inicial: {names}.", {
                  names: sceneNames(analysis.unreachable),
                })}
              </p>
            )}
            {analysis.noReturn.length > 0 && (
              <p>
                {t("Sin camino de regreso al inicio: {names}.", {
                  names: sceneNames(analysis.noReturn),
                })}
              </p>
            )}
            <p>
              {t(
                "Puedes seguir usando la lista de escenas. Las conexiones de regreso se colocan manualmente; revisa los ángulos en cada panorama.",
              )}
            </p>
          </aside>
        )}
        {!!scenes.length && (
          <button
            type="button"
            onClick={() => {
              setPreview((previous) => !previous);
              setVisual(null);
            }}
          >
            {t(preview ? "Cerrar vista previa 360" : "Abrir vista previa 360")}
          </button>
        )}
      </fieldset>
      {preview && <DraftTourPreview scenes={scenes} shared={shared} />}
    </section>
  );
}
