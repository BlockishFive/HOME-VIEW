"use client";
import { useEffect, useId, useState } from "react";
import { PanoramaViewer } from "./PanoramaViewer";
import {
  MAX_SCENES,
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

export function DraftTourPreview({ scenes }: { scenes: DraftScene[] }) {
  const [rooms, setRooms] = useState<
    {
      id: string;
      name: string;
      panorama: string;
      hotspots: DraftScene["hotspots"];
    }[]
  >([]);
  const [current, setCurrent] = useState("");
  useEffect(() => {
    const nextRooms = scenes.map((scene) => ({
      id: scene.id,
      name: scene.name || "Escena sin nombre",
      panorama: URL.createObjectURL(scene.blob),
      hotspots: scene.hotspots,
    }));
    setRooms(nextRooms);
    return () =>
      nextRooms.forEach((room) => URL.revokeObjectURL(room.panorama));
  }, [scenes]);
  const selected = rooms.some((room) => room.id === current)
    ? current
    : rooms[0]?.id;
  if (!selected) return null;
  return (
    <div className="draft-tour-preview">
      <h3>Vista previa 360 local</h3>
      <p>
        Solo en este dispositivo. Las conexiones son manuales y no se crean
        automáticamente.
      </p>
      <PanoramaViewer
        rooms={rooms}
        current={selected}
        onSelect={setCurrent}
        label="VISTA PREVIA LOCAL · NO PUBLICADA"
      />
      <div
        className="draft-scene-tabs"
        role="group"
        aria-label="Escenas del borrador"
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
export function DraftTourSavedPreview({ scenes }: { scenes: DraftScene[] }) {
  const [open, setOpen] = useState(false);
  if (!scenes.length) return null;
  return (
    <div className="draft-tour-saved-preview">
      <button
        type="button"
        className="button button-dark"
        onClick={() => setOpen((previous) => !previous)}
      >
        {open
          ? "Cerrar recorrido 360 del borrador"
          : "Ver recorrido 360 del borrador"}
      </button>
      {open && <DraftTourPreview scenes={scenes} />}
    </div>
  );
}

export function DraftTourEditor({
  scenes,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  scenes: DraftScene[];
  onChange: (scenes: DraftScene[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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
          name: `Escena ${scenes.length + added.length + 1}`,
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
      <h2 id={`${inputId}-title`}>Panoramas 360 y escenas</h2>
      <p className="listing-help">
        Opcional. Separados de las fotografías normales. Añade hasta{" "}
        {MAX_SCENES} capturas equirectangulares 360 de proporción exacta 2:1
        (mínimo 1024 × 512 px), de hasta 12 MB cada una. Se reducen a 4096 px y
        se retiran metadatos. La proporción por sí sola no acredita que la
        captura cubra toda la esfera.
      </p>
      <fieldset disabled={disabled || busy}>
        <legend className="draft-tour-legend">
          Preparación local del recorrido
        </legend>
        <label className="listing-rights">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            Confirmo que son capturas 360 equirectangulares completas y que
            tengo autorización para usarlas.
          </span>
        </label>
        <label className="listing-field" htmlFor={inputId}>
          <span>Añadir panoramas 360</span>
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
        {busy && <p role="status">Preparando panoramas…</p>}
        {error && (
          <p className="listing-error" role="alert">
            {error}
          </p>
        )}
        {scenes.map((scene, sceneIndex) => (
          <div key={scene.id} className="draft-scene-card">
            <label className="listing-field">
              <span>Nombre de escena {sceneIndex + 1}</span>
              <input
                value={scene.name}
                maxLength={80}
                onChange={(event) =>
                  update(scene.id, { name: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              onClick={() => onChange(removeDraftScene(scenes, scene.id))}
            >
              Eliminar escena {sceneIndex + 1}
            </button>
            <p>
              Conexiones desde {scene.name || `escena ${sceneIndex + 1}`} · un
              solo sentido. Añade el regreso en la otra escena si lo necesitas.
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
                      Destino {sceneIndex + 1}.{index + 1}
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
                            {target.name || "Sin nombre"}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="listing-field">
                    <span>
                      Ángulo horizontal {sceneIndex + 1}.{index + 1} (°)
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
                      Ángulo vertical {sceneIndex + 1}.{index + 1} (°)
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
                    Quitar conexión {sceneIndex + 1}.{index + 1}
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
              Añadir conexión desde escena {sceneIndex + 1}
            </button>
          </div>
        ))}
        {!!scenes.length && (
          <button
            type="button"
            onClick={() => setPreview((previous) => !previous)}
          >
            {preview ? "Cerrar vista previa 360" : "Abrir vista previa 360"}
          </button>
        )}
      </fieldset>
      {preview && <DraftTourPreview scenes={scenes} />}
    </section>
  );
}
