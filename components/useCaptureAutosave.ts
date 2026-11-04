"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaptureConflict,
  captureFingerprint,
  captureSummary,
  listCaptures,
  getCapture,
  writeCapture,
  deleteCapture,
  type CaptureContent,
  type CaptureContext,
  type CaptureScope,
  type CaptureSummary,
  type SavedCapture,
} from "@/lib/capture-store";
export function useCaptureAutosave(
  content: CaptureContent,
  scope: CaptureScope,
  enabled: boolean,
  context: () => CaptureContext,
) {
  const latest = useRef({ content, context });
  latest.current = { content, context };
  const initialFingerprint = useRef(captureFingerprint(content));
  const baseline = useRef(initialFingerprint.current),
    persisted = useRef(initialFingerprint.current);
  const active = useRef<{ id: string; version: number } | null>(null);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [captures, setCaptures] = useState<CaptureSummary[]>([]);
  const [status, setStatus] = useState<
    "idle" | "waiting" | "saving" | "device" | "confirmed" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const report = useCallback((e: unknown) => {
    if (!mounted.current) return;
    setConflict(e instanceof CaptureConflict);
    setError(
      e instanceof DOMException && e.name === "QuotaExceededError"
        ? "No hay espacio para el guardado automático. Conserva esta pestaña y guarda el borrador o libera espacio."
        : e instanceof DOMException
          ? "No se pudo guardar automáticamente en este dispositivo."
          : e instanceof Error
            ? e.message
            : "No se pudo guardar automáticamente en este dispositivo.",
    );
    setStatus("error");
  }, []);
  const reload = useCallback(async () => {
    try {
      const rows = await listCaptures(scope);
      if (mounted.current) setCaptures(rows);
    } catch (e) {
      report(e);
    } finally {
      if (mounted.current) setReady(true);
    }
  }, [scope, report]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    window.addEventListener("focus", reload);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", reload);
    };
  }, [reload]);
  const flush = useCallback(() => {
    queue.current = queue.current
      .catch(() => false)
      .then(async () => {
        const current = latest.current,
          signature = captureFingerprint(current.content);
        if (signature === baseline.current) {
          if (active.current && persisted.current !== signature) {
            try {
              const id = active.current.id;
              await deleteCapture(id, active.current.version);
              active.current = null;
              persisted.current = signature;
              if (mounted.current) {
                setCaptures((rows) => rows.filter((row) => row.id !== id));
                setActiveId(null);
                setStatus(
                  captureFingerprint(latest.current.content) === signature
                    ? "idle"
                    : "waiting",
                );
                setError("");
                setConflict(false);
              }
            } catch (e) {
              report(e);
              return false;
            }
          }
          return true;
        }
        if (signature === persisted.current && active.current) return true;
        if (mounted.current) {
          setStatus("saving");
          setError("");
          setConflict(false);
        }
        active.current ??= { id: crypto.randomUUID(), version: 0 };
        try {
          const saved = await writeCapture(
            {
              id: active.current.id,
              scope,
              schemaVersion: 1,
              updatedAt: new Date().toISOString(),
              content: current.content,
              ...current.context(),
            },
            active.current.version,
          );
          active.current = { id: saved.id, version: saved.version };
          persisted.current = signature;
          if (mounted.current) {
            setActiveId(saved.id);
            setCaptures((rows) => [
              captureSummary(saved),
              ...rows.filter((row) => row.id !== saved.id),
            ]);
            setStatus(
              captureFingerprint(latest.current.content) === signature
                ? "device"
                : "waiting",
            );
          }
          return true;
        } catch (e) {
          report(e);
          return false;
        }
      });
    return queue.current;
  }, [scope, report]);
  const signature = captureFingerprint(content);
  useEffect(() => {
    if (
      !enabled ||
      !ready ||
      signature === persisted.current ||
      (signature === baseline.current && !active.current)
    )
      return;
    setStatus("waiting");
    const timer = setTimeout(() => void flush(), 800);
    return () => clearTimeout(timer);
  }, [signature, enabled, ready, flush]);
  useEffect(() => {
    if (!enabled) return;
    const hide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const leave = () => {
      void flush();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      void flush();
    };
  }, [enabled, flush]);
  async function begin(next: CaptureContent) {
    if (!(await flush())) return false;
    baseline.current = captureFingerprint(next);
    persisted.current = baseline.current;
    active.current = null;
    setActiveId(null);
    setError("");
    setConflict(false);
    setStatus("idle");
    return true;
  }
  async function restore(id: string): Promise<SavedCapture | undefined> {
    if (!(await flush())) return;
    try {
      const row = await getCapture(id);
      if (!row || row.scope !== scope)
        throw new Error(
          "La captura ya no está disponible en este dispositivo.",
        );
      active.current = { id: row.id, version: row.version };
      baseline.current = "restored";
      persisted.current = captureFingerprint(row.content);
      setActiveId(id);
      setError("");
      setConflict(false);
      setStatus("device");
      return row;
    } catch (e) {
      report(e);
    }
  }
  async function confirmed(savedSignature: string) {
    await queue.current;
    baseline.current = savedSignature;
    if (captureFingerprint(latest.current.content) !== savedSignature) {
      setStatus("waiting");
      void flush();
      return;
    }
    try {
      if (active.current)
        await deleteCapture(active.current.id, active.current.version);
      const id = active.current?.id;
      if (id) setCaptures((rows) => rows.filter((row) => row.id !== id));
      active.current = null;
      persisted.current = savedSignature;
      setActiveId(null);
      setStatus("confirmed");
      setError("");
      setConflict(false);
    } catch (e) {
      report(e);
    }
  }
  async function discard(row: CaptureSummary) {
    await queue.current;
    try {
      await deleteCapture(
        row.id,
        row.id === active.current?.id ? active.current.version : row.version,
      );
      setCaptures((rows) => rows.filter((item) => item.id !== row.id));
      if (active.current?.id === row.id) {
        active.current = null;
        baseline.current = captureFingerprint(latest.current.content);
        persisted.current = baseline.current;
        setActiveId(null);
        setStatus("idle");
      }
      setError("");
      setConflict(false);
      return true;
    } catch (e) {
      report(e);
      return false;
    }
  }
  async function fork() {
    await queue.current;
    active.current = null;
    persisted.current = "copy";
    setActiveId(null);
    return flush();
  }
  return {
    ready,
    captures,
    status,
    error,
    conflict,
    activeId,
    flush,
    begin,
    restore,
    confirmed,
    discard,
    fork,
    reload,
  };
}
