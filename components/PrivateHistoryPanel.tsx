"use client";
import { useId, useState } from "react";
import { privateRequest, type RemoteDraft } from "@/lib/shared-drafts";
import { useI18n } from "./I18nProvider";
import { ListingReviewDialog } from "./ListingReviewDialog";
type Head = {
  id: string;
  title: string;
  lastRevision: number;
  deleted: boolean;
  updatedAt: string;
  versions: number;
};
type Version = {
  revision: number;
  createdAt: string;
  reason: string;
  sourceRevision: number | null;
};
type Activity = {
  id: number;
  createdAt: string;
  actor: string;
  action: string;
  draftId: string | null;
  revision: number | null;
  sourceRevision: number | null;
};
const actions: Record<string, string> = {
  "history.initialized": "Historial habilitado",
  "owner.configured": "Acceso privado configurado",
  "owner.reset": "Credenciales privadas restablecidas",
  "draft.created": "Borrador creado",
  "draft.saved": "Borrador guardado",
  "draft.restored": "Versión restaurada",
  "draft.deleted": "Borrador eliminado",
  "history.cleared": "Historial eliminado",
  "publication.published": "Propiedad publicada",
  "publication.updated": "Publicación actualizada",
  "publication.withdrawn": "Publicación retirada",
  "publication.removed_on_delete": "Publicación retirada al eliminar",
  "backup.created": "Respaldo del servidor creado",
  "server.restored": "Servidor restaurado desde respaldo",
};
export function PrivateHistoryPanel({
  disabled,
  preserve,
  onBusyChange,
  onChanged,
}: {
  disabled: boolean;
  preserve: () => Promise<boolean>;
  onBusyChange: (value: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const { t, locale } = useI18n(),
    id = useId();
  const [heads, setHeads] = useState<Head[]>([]),
    [selected, setSelected] = useState<Head | null>(null),
    [versions, setVersions] = useState<Version[]>([]),
    [events, setEvents] = useState<Activity[]>([]),
    [cursor, setCursor] = useState<number | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState<{
      draft: RemoteDraft;
      revision: number;
    } | null>(null);
  const date = (value: string) =>
    new Date(value).toLocaleString(locale === "en" ? "en-US" : "es-MX");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [history, activity] = await Promise.all([
        privateRequest("history").then((r) => r.json()),
        privateRequest("activity").then((r) => r.json()),
      ]);
      setHeads(history.drafts);
      setEvents(activity.events);
      setCursor(activity.nextCursor);
      setSelected(null);
      setVersions([]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function choose(head: Head) {
    setLoading(true);
    setError("");
    setSelected(null);
    setVersions([]);
    try {
      const data = await (await privateRequest(`history/${head.id}`)).json();
      setSelected(data.head);
      setVersions(data.versions);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function review(revision: number) {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const data = await (
        await privateRequest(`history/${selected.id}/${revision}`)
      ).json();
      setPreview({ draft: data.draft, revision });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function mutate(revision?: number) {
    if (!selected) return;
    const question =
      revision === undefined
        ? selected.deleted
          ? "¿Eliminar definitivamente todas las versiones retenidas de este borrador? Los respaldos externos no se modifican."
          : "¿Eliminar las versiones anteriores y conservar únicamente la revisión actual? Los respaldos externos no se modifican."
        : "¿Restaurar esta versión como un nuevo borrador privado? La publicación actual y la captura del formulario se conservan.";
    if (!window.confirm(t(question))) return;
    onBusyChange(true);
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!(await preserve()))
        throw new Error(
          "No se pudo conservar la captura actual. Resuelve el aviso del formulario antes de restaurar.",
        );
      await privateRequest(
        `history/${selected.id}${revision === undefined ? "" : "/restore"}`,
        {
          method: revision === undefined ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: selected.lastRevision,
            deleted: selected.deleted,
            ...(revision === undefined ? {} : { sourceRevision: revision }),
          }),
        },
      );
      setMessage(
        revision === undefined
          ? "Historial eliminado. Las copias de respaldo permanecen independientes."
          : "Versión restaurada como borrador privado. Actualiza o abre ese borrador para revisarlo; tu captura del formulario se conserva.",
      );
      await onChanged();
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  }
  async function older() {
    if (!cursor) return;
    setLoading(true);
    setError("");
    try {
      const data = await (
        await privateRequest(`activity?before=${cursor}`)
      ).json();
      setEvents((rows) => [...rows, ...data.events]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <details
      className="private-history"
      onToggle={(event) => {
        if (event.currentTarget.open && heads.length === 0 && !loading)
          void load();
      }}
    >
      <summary>{t("Historial y actividad")}</summary>
      <p>
        {t(
          "Se conservan hasta 10 revisiones por propiedad y 300 MB de medios del historial, para un máximo de 200 propiedades con versiones retenidas. El registro guarda hasta 5,000 eventos.",
        )}
      </p>
      <p>
        {t(
          "Eliminar un borrador retira su publicación, pero conserva sus versiones privadas. Puedes borrarlas aquí. Los respaldos descargados conservan sus propias copias. El historial comienza con la versión disponible al habilitar esta función.",
        )}
      </p>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void load()}
      >
        {t("Actualizar historial y actividad")}
      </button>
      {loading && <p role="status">{t("Cargando historial…")}</p>}
      {error && (
        <p role="alert" className="listing-error">
          {t(error)}
        </p>
      )}
      {message && (
        <p role="status" className="listing-success">
          {t(message)}
        </p>
      )}
      <div className="history-layout">
        <section aria-labelledby={`${id}-properties`}>
          <h3 id={`${id}-properties`}>{t("Propiedades con historial")}</h3>
          {!heads.length && !loading && (
            <p>{t("Aún no hay versiones retenidas.")}</p>
          )}
          <ul className="history-properties">
            {heads.map((head) => (
              <li key={head.id}>
                <button
                  type="button"
                  aria-pressed={selected?.id === head.id}
                  disabled={disabled || loading}
                  onClick={() => void choose(head)}
                >
                  {head.title || t("Captura sin título")} ·{" "}
                  {t(head.deleted ? "Eliminado" : "Activo")} · {head.versions}{" "}
                  {t("versiones")}
                </button>
              </li>
            ))}
          </ul>
        </section>
        {selected && (
          <section aria-labelledby={`${id}-versions`}>
            <h3 id={`${id}-versions`}>
              {selected.title || t("Captura sin título")}
            </h3>
            <p className="history-id">{selected.id}</p>
            <ul className="history-versions">
              {versions.map((version) => (
                <li key={version.revision}>
                  <strong>
                    {t("Versión {number}", { number: version.revision })}
                  </strong>
                  <span>
                    {date(version.createdAt)} ·{" "}
                    {t(
                      version.reason === "restored"
                        ? "Restaurada"
                        : version.reason === "baseline"
                          ? "Versión inicial disponible"
                          : "Guardada",
                    )}
                  </span>
                  {version.sourceRevision !== null && (
                    <span>
                      {t("Origen: versión {number}", {
                        number: version.sourceRevision,
                      })}
                    </span>
                  )}
                  <div>
                    <button
                      type="button"
                      disabled={disabled || loading}
                      onClick={() => void review(version.revision)}
                    >
                      {t("Revisar versión")}
                    </button>
                    <button
                      type="button"
                      disabled={disabled || loading}
                      onClick={() => void mutate(version.revision)}
                    >
                      {t("Restaurar como borrador")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              className="history-delete"
              type="button"
              disabled={disabled || loading}
              onClick={() => void mutate()}
            >
              {t(
                selected.deleted
                  ? "Eliminar historial definitivamente"
                  : "Eliminar versiones anteriores",
              )}
            </button>
          </section>
        )}
      </div>
      <h3>{t("Actividad privada del servidor")}</h3>
      <p>
        {t(
          "Registra acciones, fechas y revisiones. No guarda contraseñas, nombres de archivos, notas, direcciones IP ni el contenido de los anuncios. No es una bitácora externa ni un registro a prueba de modificaciones del administrador.",
        )}
      </p>
      <ol className="history-activity">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{t(actions[event.action] ?? "Acción del servidor")}</strong>
            <time dateTime={event.createdAt}>{date(event.createdAt)}</time>
            {event.draftId && (
              <span className="history-id">{event.draftId}</span>
            )}
            {event.revision !== null && (
              <span>{t("Versión {number}", { number: event.revision })}</span>
            )}
            {event.sourceRevision !== null && (
              <span>
                {t("Origen: versión {number}", {
                  number: event.sourceRevision,
                })}
              </span>
            )}
          </li>
        ))}
      </ol>
      {cursor && (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => void older()}
        >
          {t("Ver eventos anteriores")}
        </button>
      )}
      {preview && (
        <ListingReviewDialog
          draft={preview.draft}
          saved
          server
          revision={preview.revision}
          busy={false}
          error=""
          historical
          mediaBase={`/api/private/history/${preview.draft.id}/${preview.revision}/media/`}
          onClose={() => setPreview(null)}
        />
      )}
    </details>
  );
}
