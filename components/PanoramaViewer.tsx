"use client";
import { useEffect, useRef, useState } from "react";
type PanoramaRoom<Id extends string> = {
  id: Id;
  name: string;
  panorama: string;
  hotspots: { target: Id; yaw: number; pitch: number }[];
};

type Controls = {
  move: (axis: "yaw" | "pitch" | "fov", delta: number) => void;
};
export function PanoramaViewer<Id extends string>({
  rooms,
  current,
  onSelect,
  label = "INTERIOR SINTÉTICO · DEMO",
}: {
  rooms: PanoramaRoom<Id>[];
  current: Id;
  onSelect: (id: Id) => void;
  label?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const select = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [fullscreen, setFullscreen] = useState(false);
  select.current = onSelect;
  const room = rooms.find((r) => r.id === current) ?? rooms[0];
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    let image: HTMLImageElement | undefined;
    setStatus("loading");
    if (!room) return;
    async function initialize() {
      try {
        const { default: M } = await import("marzipano");
        if (cancelled || !host.current) return;
        // Verify the asset first so a failed image request never leaves an empty viewer.
        image = new Image();
        await new Promise<void>((resolve, reject) => {
          image!.onload = () => resolve();
          image!.onerror = () => reject(new Error("Panorama unavailable"));
          image!.src = room.panorama;
        });
        if (cancelled || !host.current) return;
        const viewer = new M.Viewer(host.current, {
          controls: { mouseViewMode: "drag" },
        });
        destroy = () => viewer.destroy();
        const view = new M.RectilinearView(
          { yaw: 0, pitch: 0, fov: Math.PI / 2.6 },
          M.RectilinearView.limit.traditional(2048, Math.PI / 2, Math.PI),
        );
        const scene = viewer.createScene({
          source: M.ImageUrlSource.fromString(room.panorama),
          geometry: new M.EquirectGeometry([{ width: image.naturalWidth }]),
          view,
          pinFirstLevel: true,
        });
        room.hotspots.forEach((h) => {
          const target = rooms.find((r) => r.id === h.target);
          if (!target) return;
          const button = document.createElement("button");
          button.className = "hotspot";
          button.type = "button";
          button.setAttribute("aria-label", `Ir a ${target.name}`);
          const arrow = document.createElement("span");
          arrow.textContent = "↑";
          arrow.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.textContent = target.name;
          button.append(arrow, label);
          button.onclick = () => select.current(h.target);
          scene
            .hotspotContainer()
            .createHotspot(button, { yaw: h.yaw, pitch: h.pitch });
        });
        scene.switchTo({ transitionDuration: 0 });
        controls.current = {
          move(axis, delta) {
            const v = scene.view();
            if (axis === "yaw") v.setYaw(v.yaw() + delta);
            if (axis === "pitch")
              v.setPitch(Math.max(-1.1, Math.min(1.1, v.pitch() + delta)));
            if (axis === "fov")
              v.setFov(Math.max(0.45, Math.min(1.7, v.fov() + delta)));
          },
        };
        setStatus("ready");
      } catch (error) {
        if (process.env.NODE_ENV === "development")
          console.error("Home View panorama initialization failed", error);
        if (!cancelled) {
          destroy?.();
          destroy = undefined;
          setStatus("error");
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
      controls.current = null;
      destroy?.();
    };
  }, [room, rooms]);
  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      /* Browser may disallow fullscreen. The regular viewer remains available. */
    }
  }
  if (!room) return <p>No hay escenas disponibles.</p>;
  return (
    <div className="viewer-shell" ref={shell}>
      <div
        ref={host}
        className="panorama"
        aria-label={`Panorama 360 de ${room.name}`}
      />
      <div className="viewer-top">
        <span className="viewer-badge">
          <span className="live-dot" />
          {room.name}
        </span>
        <span className="viewer-demo">{label}</span>
      </div>
      {status === "loading" && (
        <div className="viewer-status" role="status">
          Preparando tu recorrido…
        </div>
      )}
      {status === "error" && (
        <div className="viewer-status" role="alert">
          <strong>No se pudo iniciar el visor 360.</strong>
          <p>
            Comprueba tu conexión y que WebGL esté habilitado. Puedes cambiar de
            habitación desde el plano o la lista.
          </p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Volver a intentar
          </button>
        </div>
      )}
      <div className="viewer-bottom">
        <span className="drag-hint">↔ Arrastra para mirar alrededor</span>
        <div
          className="viewer-controls"
          role="group"
          aria-label="Controles del panorama"
        >
          {[
            ["Mirar a la izquierda", "←", "yaw", -0.3],
            ["Mirar a la derecha", "→", "yaw", 0.3],
            ["Mirar arriba", "↑", "pitch", -0.2],
            ["Mirar abajo", "↓", "pitch", 0.2],
            ["Acercar", "+", "fov", -0.15],
            ["Alejar", "−", "fov", 0.15],
          ].map(([label, symbol, axis, delta]) => (
            <button
              type="button"
              key={label}
              aria-label={String(label)}
              disabled={status !== "ready"}
              onClick={() =>
                controls.current?.move(
                  axis as "yaw" | "pitch" | "fov",
                  Number(delta),
                )
              }
            >
              {symbol}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
