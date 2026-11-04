/** Local-only panoramas. A 2:1 image must already be an equirectangular 360 capture. */
export type DraftHotspot = { target: string; yaw: number; pitch: number };
export type SceneView = { yaw: number; pitch: number; fov: number };
export const defaultSceneView: SceneView = {
  yaw: 0,
  pitch: 0,
  fov: Math.PI / 2.6,
};
export function validSceneView(view: SceneView): boolean {
  return (
    !!view &&
    Number.isFinite(view.yaw) &&
    Math.abs(view.yaw) <= Math.PI &&
    Number.isFinite(view.pitch) &&
    Math.abs(view.pitch) <= Math.PI / 2 &&
    Number.isFinite(view.fov) &&
    view.fov >= 0.45 &&
    view.fov <= 1.7
  );
}
export type DraftScene = {
  id: string;
  name: string;
  blob: Blob;
  hotspots: DraftHotspot[];
  initialView?: SceneView;
};
export const MAX_SCENES = 8;
export const MAX_PANORAMA_BYTES = 12 * 1024 * 1024;
export function validatePanoramaFile(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Usa panoramas JPEG, PNG o WebP.";
  if (file.size <= 0 || file.size > MAX_PANORAMA_BYTES)
    return "Cada panorama debe pesar entre 1 byte y 12 MB.";
  return null;
}
export function validatePanoramaDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1024 ||
    height < 512 ||
    width !== height * 2
  )
    return "Usa una imagen equirectangular 360 de proporción exacta 2:1, de al menos 1024 × 512 px. Una foto normal no se convierte en panorama.";
  if (width * height > 60000000)
    return "El panorama supera los 60 millones de píxeles. Reduce su tamaño antes de añadirlo.";
  return null;
}
export function validateDraftScenes(scenes: DraftScene[]): string | null {
  if (scenes.length > MAX_SCENES)
    return `Puedes preparar hasta ${MAX_SCENES} escenas.`;
  const ids = new Set(scenes.map((scene) => scene.id));
  if (ids.size !== scenes.length || scenes.some((scene) => !scene.id))
    return "Las escenas necesitan identificadores únicos.";
  for (const scene of scenes) {
    if (scene.initialView !== undefined && !validSceneView(scene.initialView))
      return "Revisa la orientación de entrada de las escenas.";
    if (!scene.name.trim() || scene.name.length > 80)
      return "Nombra cada escena con entre 1 y 80 caracteres.";
    if (
      !(scene.blob instanceof Blob) ||
      !scene.blob.size ||
      scene.blob.size > MAX_PANORAMA_BYTES
    )
      return "Una escena no contiene un panorama válido.";
    const targets = new Set<string>();
    for (const hotspot of scene.hotspots) {
      if (
        !ids.has(hotspot.target) ||
        hotspot.target === scene.id ||
        targets.has(hotspot.target)
      )
        return "Cada conexión debe apuntar a otra escena existente sin repetir destinos.";
      if (
        !Number.isFinite(hotspot.yaw) ||
        Math.abs(hotspot.yaw) > Math.PI ||
        !Number.isFinite(hotspot.pitch) ||
        Math.abs(hotspot.pitch) > Math.PI / 2
      )
        return "Revisa los ángulos de las conexiones: horizontal de −180 a 180° y vertical de −90 a 90°.";
      targets.add(hotspot.target);
    }
  }
  return null;
}
/** Directed reachability: a connection does not imply a return connection. */
export function analyzeTour(scenes: Pick<DraftScene, "id" | "hotspots">[]) {
  const first = scenes[0]?.id;
  const walk = (start: string) => {
    const seen = new Set<string>();
    const pending = [start];
    while (pending.length) {
      const id = pending.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const link of scenes.find((scene) => scene.id === id)?.hotspots ??
        [])
        pending.push(link.target);
    }
    return seen;
  };
  const reached = first ? walk(first) : new Set<string>();
  return {
    unreachable: scenes
      .filter((scene) => !reached.has(scene.id))
      .map((scene) => scene.id),
    noReturn: scenes
      .filter((scene) => scene.id !== first && !walk(scene.id).has(first!))
      .map((scene) => scene.id),
  };
}
/** Deleting a scene also removes every incoming connection to it. */
export function removeDraftScene(
  scenes: DraftScene[],
  id: string,
): DraftScene[] {
  return scenes
    .filter((scene) => scene.id !== id)
    .map((scene) => ({
      ...scene,
      hotspots: scene.hotspots.filter((hotspot) => hotspot.target !== id),
    }));
}
