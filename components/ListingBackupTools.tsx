"use client";
import { useEffect, useId, useState } from "react";
import { useI18n } from "./I18nProvider";
import {
  downloadCaptureBackup,
  readBackup,
  type ParsedBackup,
} from "@/lib/listing-backup";
import {
  writeCapture,
  type CaptureContent,
  type CaptureScope,
} from "@/lib/capture-store";

function BackupImages({ content }: { content: CaptureContent }) {
  const { t } = useI18n();
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = content.photos.map((photo) => URL.createObjectURL(photo.blob));
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [content]);
  return (
    <div className="backup-photos">
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={t("Fotografía del respaldo {number}", { number: i + 1 })}
        />
      ))}
    </div>
  );
}
export function ListingBackupTools({
  scope,
  current,
  disabled,
  onBusyChange,
  onRestored,
}: {
  scope: CaptureScope;
  current?: CaptureContent;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onRestored: () => Promise<void>;
}) {
  const { t } = useI18n(),
    id = useId();
  const [candidate, setCandidate] = useState<
    (ParsedBackup & { captureId: string; destinationId: string }) | null
  >(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    onBusyChange(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "QuotaExceededError"
          ? "No hay espacio para restaurar. Conserva el archivo y libera almacenamiento del navegador."
          : e instanceof Error
            ? e.message
            : "No se pudo completar el respaldo.",
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  async function select(file?: File) {
    if (!file) return;
    setCandidate(null);
    setConfirmed(false);
    await run(async () => {
      const parsed = await readBackup(file);
      setCandidate({
        ...parsed,
        captureId: crypto.randomUUID(),
        destinationId: crypto.randomUUID(),
      });
    });
  }
  async function restore() {
    if (!candidate || !confirmed) return;
    await run(async () => {
      await writeCapture(
        {
          id: candidate.captureId,
          schemaVersion: 1,
          scope,
          updatedAt: new Date().toISOString(),
          sharedRevision: 0,
          identity: {
            id: candidate.destinationId,
            createdAt: new Date().toISOString(),
          },
          content: {
            ...candidate.content,
            values: { ...candidate.content.values, imageRights: false },
            locationReviewed: false,
          },
        },
        0,
      );
      setCandidate(null);
      setConfirmed(false);
      setMessage(
        "Copia restaurada en este dispositivo. Pulsa Continuar captura para revisarla y guardarla. No se envió al servidor ni se publicó.",
      );
      await onRestored();
    });
  }
  return (
    <section className="backup-tools" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{t("Respaldar y restaurar")}</h2>
      <p>
        {t(
          "Los archivos incluyen información privada, fotos y panoramas. Consérvalos en un lugar seguro. Restaurar crea una captura nueva en este navegador; después puedes revisarla y guardarla.",
        )}
      </p>
      <fieldset disabled={disabled || busy}>
        <legend className="sr-only">{t("Archivos de respaldo")}</legend>
        {current && (
          <button
            type="button"
            onClick={() => void run(() => downloadCaptureBackup(current))}
          >
            {t("Descargar captura actual")}
          </button>
        )}
        <label className="listing-field">
          <span>{t("Seleccionar respaldo de Home View")}</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              void select(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p className="listing-help">
          {t(
            "Hasta 70 MB de archivo y 48 MB de imágenes. Se admiten respaldos de borradores anteriores y capturas incompletas.",
          )}
        </p>
        {busy && <p role="status">{t("Procesando respaldo…")}</p>}
        {candidate && (
          <div className="backup-review">
            <h3>{t("Revisar antes de restaurar")}</h3>
            <dl>
              <div>
                <dt>{t("Título")}</dt>
                <dd>
                  {candidate.content.values.title || t("Captura sin título")}
                </dd>
              </div>
              <div>
                <dt>{t("Operación")}</dt>
                <dd>{t(candidate.content.values.operation)}</dd>
              </div>
              <div>
                <dt>{t("Zona")}</dt>
                <dd>
                  {[
                    candidate.content.values.neighborhood,
                    candidate.content.values.city,
                  ]
                    .filter(Boolean)
                    .join(", ") || t("Por confirmar")}
                </dd>
              </div>
              <div>
                <dt>{t("Medios incluidos")}</dt>
                <dd>
                  {t("{photos} fotos · {scenes} escenas 360", {
                    photos: candidate.content.photos.length,
                    scenes: candidate.content.scenes.length,
                  })}
                </dd>
              </div>
            </dl>
            {candidate.legacy && (
              <p>
                {t(
                  "Borrador antiguo: mantenimiento y condiciones se conservarán por confirmar cuando el respaldo no los especifique.",
                )}
              </p>
            )}
            <BackupImages content={candidate.content} />
            {candidate.content.scenes.length > 0 && (
              <p>
                {t("Escenas del respaldo: {names}", {
                  names: candidate.content.scenes
                    .map((s) => s.name || t("Escena sin nombre"))
                    .join(", "),
                })}
              </p>
            )}
            <p>
              {t(
                "Se conservarán campos vacíos y condiciones por confirmar. Deberás revisar de nuevo los permisos de imágenes y la ubicación antes de guardar o publicar.",
              )}
            </p>
            <label className="listing-rights">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                {t(
                  "Revisé el respaldo y quiero restaurarlo como una copia nueva.",
                )}
              </span>
            </label>
            <div className="backup-actions">
              <button
                type="button"
                disabled={!confirmed}
                onClick={() => void restore()}
              >
                {t("Restaurar como captura nueva")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCandidate(null);
                  setConfirmed(false);
                }}
              >
                {t("Cancelar restauración")}
              </button>
            </div>
          </div>
        )}
      </fieldset>
      {error && (
        <p className="listing-error" role="alert">
          {t(error)}
        </p>
      )}
      {message && (
        <p className="listing-success" role="status">
          {t(message)}
        </p>
      )}
    </section>
  );
}
