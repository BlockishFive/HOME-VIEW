"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "./I18nProvider";
import { PropertyPageContent } from "./PropertyPageView";
import { VisitAccessDetails } from "./VisitAccessDetails";
import {
  listingPresentation,
  type ListingMetadata,
} from "@/lib/listing-presentation";
import { listingReview } from "@/lib/listing-review";
import type { ListingDraft } from "@/lib/listing-drafts";
import type { RemoteDraft } from "@/lib/shared-drafts";
export function ListingReviewDialog({
  draft,
  saved,
  server,
  revision,
  busy,
  error,
  onClose,
  onPublish,
  onReload,
  onEdit,
}: {
  draft: ListingDraft | RemoteDraft;
  saved: boolean;
  server: boolean;
  revision: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onPublish?: () => Promise<void>;
  onReload?: () => Promise<void>;
  onEdit: () => void;
}) {
  const { t } = useI18n(),
    id = useId(),
    dialog = useRef<HTMLDialogElement>(null);
  const [acknowledged, setAcknowledged] = useState(false),
    [preview, setPreview] = useState(false),
    [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    const owned: string[] = [],
      next: Record<string, string> = {};
    for (const media of [...draft.photos, ...draft.scenes]) {
      if ("blob" in media) {
        const url = URL.createObjectURL(media.blob);
        owned.push(url);
        next[media.id] = url;
      } else next[media.id] = `/api/private/media/${draft.id}/${media.id}`;
    }
    setUrls(next);
    return () => owned.forEach((url) => URL.revokeObjectURL(url));
  }, [draft]);
  const metadata: ListingMetadata = {
    ...draft,
    scenes: draft.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      hotspots: scene.hotspots ?? [],
      initialView: scene.initialView,
    })),
  };
  const review = listingReview(metadata);
  const property = useMemo(() => {
    if (!review.canPreview || draft.photos.some((photo) => !urls[photo.id]))
      return null;
    try {
      return listingPresentation(metadata, (id) => urls[id]);
    } catch {
      return null;
    }
  }, [draft, urls, review.canPreview]);
  return (
    <dialog
      ref={dialog}
      className="listing-review-dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="listing-review-heading">
        <div>
          <p className="eyebrow">
            {t(
              saved
                ? "VERSIÓN GUARDADA · REVISIÓN PRIVADA"
                : "CAPTURA ACTUAL · SIN CONFIRMAR",
            )}
          </p>
          <h2 id={`${id}-title`}>{t("Revisar antes de publicar")}</h2>
          <p>
            {draft.title || t("Captura sin título")}
            {saved && server && (
              <> · {t("Versión {number}", { number: revision })}</>
            )}
          </p>
        </div>
        <button type="button" disabled={busy} onClick={onClose} autoFocus>
          {t("Cerrar revisión")}
        </button>
      </div>
      <p className="listing-local-notice">
        {t(
          saved
            ? server
              ? "Revisas la versión confirmada en el servidor. Los cambios que tengas en el formulario todavía no forman parte de ella."
              : "Revisas el borrador guardado en este navegador. Los cambios del formulario todavía no forman parte de él."
            : "Esta revisión usa la captura del formulario. Guarda el borrador privado para poder publicarla; abrir la revisión no guarda ni envía datos.",
        )}
      </p>
      <section
        className="publication-checklist"
        aria-label={t("Lista de revisión del anuncio")}
      >
        <p className="review-counts">
          {t("{photos} fotos · {scenes} escenas 360", {
            photos: draft.photos.length,
            scenes: draft.scenes.length,
          })}
        </p>
        <h3>{t("Antes de poder publicar")}</h3>
        {review.blockers.length ? (
          <ul className="review-blockers">
            {review.blockers.map((item) => (
              <li key={item.key}>{t(item.message)}</li>
            ))}
          </ul>
        ) : (
          <p className="review-ready">
            {t(
              "Los datos obligatorios están completos. Revisa también la ficha y los campos pendientes.",
            )}
          </p>
        )}
        <h3>{t("Información por confirmar")}</h3>
        {review.pending.length ? (
          <>
            <p>
              {t(
                "Puedes publicar estos campos como Por confirmar. No se convertirán en cero ni en requisitos asumidos.",
              )}
            </p>
            <ul className="review-pending">
              {review.pending.map((item) => (
                <li key={item.key}>{t(item.message, item.params)}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t("No hay condiciones pendientes en los campos capturados.")}</p>
        )}
        {review.notes.length > 0 && (
          <ul className="review-notes">
            {review.notes.map((item) => (
              <li key={item.key}>{t(item.message, item.params)}</li>
            ))}
          </ul>
        )}
        <p>
          {t(
            draft.publicLocation === "exact"
              ? "La ficha mostrará el punto exacto autorizado. Comprueba que quieres divulgarlo."
              : "La ficha mostrará una zona aproximada; el punto exacto y la referencia de acceso siguen privados.",
          )}
        </p>
      </section>
      <VisitAccessDetails access={draft.visitAccess} />
      <div className="review-actions">
        <button
          type="button"
          aria-expanded={preview}
          disabled={!property}
          onClick={() => setPreview(!preview)}
        >
          {t(preview ? "Ocultar ficha previa" : "Ver ficha previa")}
        </button>
        <button type="button" disabled={busy} onClick={onEdit}>
          {t("Volver a editar")}
        </button>
        {saved && onReload && (
          <button type="button" disabled={busy} onClick={() => void onReload()}>
            {t("Actualizar versión para revisar")}
          </button>
        )}
      </div>
      {!property && (
        <p>
          {t(
            "Completa los datos obligatorios y añade fotografías para ver la ficha previa.",
          )}
        </p>
      )}
      {preview && property && (
        <section
          className="public-listing-preview"
          aria-label={t("Ficha pública de vista previa")}
        >
          <p className="review-preview-notice">
            {t(
              "Vista previa privada. Usa solo los datos que verá el público; todavía no publica esta versión.",
            )}
          </p>
          <PropertyPageContent property={property} preview />
        </section>
      )}
      {error && (
        <p className="listing-error" role="alert">
          {t(error)}
        </p>
      )}
      {onPublish && (
        <div className="review-confirmation">
          <label className="listing-rights">
            <input
              type="checkbox"
              disabled={busy || !review.canPublish}
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              {t(
                "Revisé la ficha, sus medios y los campos por confirmar; autorizo publicar esta versión guardada.",
              )}
            </span>
          </label>
          <button
            type="button"
            className="button button-dark"
            disabled={busy || !review.canPublish || !acknowledged}
            onClick={() => void onPublish()}
          >
            {t(busy ? "Publicando…" : "Confirmar publicación")}
          </button>
        </div>
      )}
    </dialog>
  );
}
