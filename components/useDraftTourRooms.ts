"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import type { DraftScene } from "@/lib/draft-tour";
export function useDraftTourRooms(scenes: DraftScene[]) {
  const { t } = useI18n();
  const cache = useRef(new Map<string, { blob: Blob; url: string }>());
  const [rooms, setRooms] = useState<
    (Omit<DraftScene, "blob"> & { panorama: string })[]
  >([]);
  useEffect(() => {
    for (const [id, item] of cache.current)
      if (!scenes.some((s) => s.id === id && s.blob === item.blob)) {
        URL.revokeObjectURL(item.url);
        cache.current.delete(id);
      }
    setRooms(
      scenes.map((scene) => {
        let item = cache.current.get(scene.id);
        if (!item) {
          item = { blob: scene.blob, url: URL.createObjectURL(scene.blob) };
          cache.current.set(scene.id, item);
        }
        return {
          id: scene.id,
          name: scene.name || t("Escena sin nombre"),
          hotspots: scene.hotspots,
          initialView: scene.initialView,
          panorama: item.url,
        };
      }),
    );
  }, [scenes, t]);
  useEffect(() => {
    const urls = cache.current;
    return () => {
      for (const item of urls.values()) URL.revokeObjectURL(item.url);
      urls.clear();
    };
  }, []);
  return rooms;
}
