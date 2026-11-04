"use client";
import { useI18n } from "./I18nProvider";
import { useEffect, useRef, useState } from "react";
import { defaultSceneView, type SceneView } from "@/lib/draft-tour";
type PanoramaRoom<Id extends string> = {
  id: Id;
  name: string;
  panorama: string;
  hotspots: { target: Id; yaw: number; pitch: number }[];
  initialView?: SceneView;
};

type Controls = {
  move: (axis: "yaw" | "pitch" | "fov", delta: number) => void;
  point: (x: number, y: number) => { yaw: number; pitch: number };
};
export function PanoramaViewer<Id extends string>({
  rooms,
  current,
  onSelect,
  label = "INTERIOR SINTÉTICO · DEMO",
  translateRoomNames = false,
  editing,
}: {
  rooms: PanoramaRoom<Id>[];
  current: Id;
  onSelect: (id: Id) => void;
  label?: string;
  translateRoomNames?: boolean;
  editing?: {
    placing: boolean;
    disabled: boolean;
    onPlace: (point: { yaw: number; pitch: number }) => void;
    onView: (view: SceneView) => void;
  };
}) {
  const { locale, t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const select = useRef(onSelect);
  const edit = useRef(editing);
  edit.current = editing;
  const lastView = useRef<{ key: string; view: SceneView } | null>(null);
  const tap = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const pointers = useRef(new Set<number>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [fullscreen, setFullscreen] = useState(false);
  select.current = onSelect;
  const roomName = (name: string) => (translateRoomNames ? t(name) : name);
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
        const key = `${room.id}|${room.panorama}`;
        const view = new M.RectilinearView(
          lastView.current?.key === key
            ? lastView.current.view
            : (room.initialView ?? defaultSceneView),
          M.RectilinearView.limit.traditional(2048, Math.PI / 2, Math.PI),
        );
        const report = () => {
          const params = view.parameters();
          if (shell.current) {
            shell.current.dataset.viewYaw = String(params.yaw);
            shell.current.dataset.viewPitch = String(params.pitch);
            shell.current.dataset.viewFov = String(params.fov);
          }
          edit.current?.onView({
            yaw: params.yaw,
            pitch: params.pitch,
            fov: params.fov,
          });
        };
        view.addEventListener("change", report);
        destroy = () => {
          lastView.current = { key, view: view.parameters() };
          view.removeEventListener("change", report);
          viewer.destroy();
        };
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
          button.setAttribute(
            "aria-label",
            t("Ir a {name}", { name: roomName(target.name) }),
          );
          const arrow = document.createElement("span");
          arrow.textContent = "↑";
          arrow.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.textContent = roomName(target.name);
          button.append(arrow, label);
          button.onclick = () => {
            if (!edit.current?.placing && !edit.current?.disabled)
              select.current(h.target);
          };
          scene
            .hotspotContainer()
            .createHotspot(button, { yaw: h.yaw, pitch: h.pitch });
        });
        scene.switchTo({ transitionDuration: 0 });
        controls.current = {
          point: (x, y) => view.screenToCoordinates({ x, y }),
          move(axis, delta) {
            const v = scene.view();
            if (axis === "yaw") v.setYaw(v.yaw() + delta);
            if (axis === "pitch")
              v.setPitch(Math.max(-1.1, Math.min(1.1, v.pitch() + delta)));
            if (axis === "fov")
              v.setFov(Math.max(0.45, Math.min(1.7, v.fov() + delta)));
          },
        };
        report();
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
      tap.current = null;
      pointers.current.clear();
      destroy?.();
    };
  }, [room, rooms, locale, translateRoomNames]);
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
  if (!room) return <p>{t("No hay escenas disponibles.")}</p>;
  return (
    <div className="viewer-shell" ref={shell}>
      <div
        ref={host}
        className="panorama"
        onPointerDownCapture={(event) => {
          pointers.current.add(event.pointerId);
          if (edit.current?.placing && !edit.current.disabled) {
            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {}
          }
          if (
            !edit.current?.placing ||
            edit.current.disabled ||
            pointers.current.size !== 1 ||
            (event.target as HTMLElement).closest("button") ||
            event.button !== 0
          ) {
            tap.current = null;
            return;
          }
          tap.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false,
          };
        }}
        onPointerMoveCapture={(event) => {
          const point = tap.current;
          if (
            point &&
            Math.hypot(event.clientX - point.x, event.clientY - point.y) > 8
          )
            point.moved = true;
        }}
        onPointerCancelCapture={(event) => {
          pointers.current.delete(event.pointerId);
          tap.current = null;
        }}
        onPointerUpCapture={(event) => {
          pointers.current.delete(event.pointerId);
          const point = tap.current;
          tap.current = null;
          if (
            !point ||
            point.id !== event.pointerId ||
            point.moved ||
            pointers.current.size ||
            !edit.current?.placing ||
            edit.current.disabled ||
            !controls.current ||
            !host.current
          )
            return;
          const rect = host.current.getBoundingClientRect();
          const result = controls.current.point(
            event.clientX - rect.left,
            event.clientY - rect.top,
          );
          if (Number.isFinite(result.yaw) && Number.isFinite(result.pitch))
            edit.current.onPlace(result);
        }}
        aria-label={t("Panorama 360 de {name}", { name: roomName(room.name) })}
      />
      {editing?.placing && (
        <span className="tour-crosshair" aria-hidden="true">
          ＋
        </span>
      )}
      <div className="viewer-top">
        <span className="viewer-badge">
          <span className="live-dot" />
          {roomName(room.name)}
        </span>
        <span className="viewer-demo">{t(label)}</span>
      </div>
      {status === "loading" && (
        <div className="viewer-status" role="status">
          {t("Preparando tu recorrido…")}
        </div>
      )}
      {status === "error" && (
        <div className="viewer-status" role="alert">
          <strong>{t("No se pudo iniciar el visor 360.")}</strong>
          <p>
            {t(
              "Comprueba tu conexión y que WebGL esté habilitado. Puedes cambiar de habitación desde el plano o la lista.",
            )}
          </p>
          <button
            type="button"
            className="button"
            onClick={() => window.location.reload()}
          >
            {t("Volver a intentar")}
          </button>
        </div>
      )}
      <div className="viewer-bottom">
        <span className="drag-hint">
          {t("↔ Arrastra para mirar alrededor")}
        </span>
        <div
          className="viewer-controls"
          role="group"
          aria-label={t("Controles del panorama")}
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
              aria-label={t(String(label))}
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
            aria-label={t(
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa",
            )}
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
