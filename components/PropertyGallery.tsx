"use client";
import { useI18n } from "./I18nProvider";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

export type GalleryImage = { src: string; alt: string; label: string };

export function PropertyGallery({
  title,
  images,
}: {
  title: string;
  images: GalleryImage[];
}) {
  const { locale, t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const noteId = useId();
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const current = images[index];

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function openImage(nextIndex: number, source: HTMLElement) {
    if (!images.length || !dialog.current) return;
    trigger.current = source;
    setIndex(nextIndex);
    setIsOpen(true);
    dialog.current.showModal();
  }

  function move(direction: number) {
    setIndex(
      (previous) => (previous + direction + images.length) % images.length,
    );
  }

  function recordFailure(src: string) {
    setFailed((previous) => new Set(previous).add(src));
  }

  if (!images.length) {
    return (
      <section
        className="property-gallery"
        aria-label={t("Galería de {title}", { title })}
      >
        <p className="gallery-note">
          {t("No hay imágenes de demostración disponibles.")}
        </p>
      </section>
    );
  }

  return (
    <section
      className="property-gallery"
      aria-label={t("Galería de {title}", { title })}
    >
      <div
        className={`gallery-mosaic ${images.length === 1 ? "gallery-mosaic-single" : ""}`}
      >
        {images.slice(0, 3).map((image, imageIndex) => (
          <button
            key={image.src}
            type="button"
            className={`gallery-tile${imageIndex === 0 ? " gallery-tile-main" : ""}`}
            onClick={(event) => openImage(imageIndex, event.currentTarget)}
            aria-label={t("Abrir imagen {number}: {label}", {
              number: imageIndex + 1,
              label: t(image.label),
            })}
            aria-haspopup="dialog"
          >
            {failed.has(image.src) ? (
              <span className="gallery-image-error">
                {t("Imagen no disponible")}
              </span>
            ) : (
              <Image
                src={image.src}
                alt={t(image.alt)}
                fill
                preload={imageIndex === 0}
                sizes={
                  imageIndex === 0
                    ? "(max-width: 700px) 90vw, 60vw"
                    : "(max-width: 700px) 45vw, 30vw"
                }
                onError={() => recordFailure(image.src)}
              />
            )}
            <span className="gallery-tile-label">{t(image.label)}</span>
          </button>
        ))}
      </div>
      <div className="gallery-toolbar">
        <p className="gallery-note">
          {t(
            "Ilustraciones sintéticas · Demo · No representan un inmueble real.",
          )}
        </p>
        <button
          type="button"
          className="gallery-open-button"
          aria-haspopup="dialog"
          onClick={(event) => openImage(0, event.currentTarget)}
        >
          {t("Ver todas las imágenes ({count})", { count: images.length })}
        </button>
      </div>
      <dialog
        ref={dialog}
        className="gallery-dialog"
        aria-labelledby={headingId}
        aria-describedby={noteId}
        onClose={() => {
          setIsOpen(false);
          trigger.current?.focus();
        }}
        onKeyDown={(event) => {
          if (!dialog.current?.open) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
        }}
      >
        <div className="gallery-dialog-header">
          <div>
            <h2 id={headingId}>{t("Galería de {title}", { title })}</h2>
            <p id={noteId} className="gallery-note">
              {t("Ilustraciones sintéticas · Demo")}
            </p>
          </div>
          <button
            type="button"
            className="gallery-close"
            aria-label={t("Cerrar galería")}
            autoFocus
            onClick={() => dialog.current?.close()}
          >
            {t("Cerrar")}
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="gallery-stage">
          {isOpen &&
            current &&
            (failed.has(current.src) ? (
              <p className="gallery-image-error" role="status">
                {t(
                  "No se pudo cargar esta imagen. Puedes ver las otras imágenes con los botones de navegación.",
                )}
              </p>
            ) : (
              <Image
                key={current.src}
                src={current.src}
                alt={t(current.alt)}
                fill
                sizes="(max-width: 1000px) 90vw, 1000px"
                onError={() => recordFailure(current.src)}
              />
            ))}
        </div>
        <div className="gallery-dialog-footer">
          <p className="gallery-counter" aria-live="polite" aria-atomic="true">
            {index + 1} / {images.length} · {t(current?.label ?? "")}
          </p>
          <div
            className="gallery-controls"
            role="group"
            aria-label={t("Navegación de la galería")}
          >
            <button
              type="button"
              aria-label={t("Imagen anterior")}
              onClick={() => move(-1)}
              disabled={images.length < 2}
            >
              <span aria-hidden="true">←</span> {t("Anterior")}
            </button>
            <button
              type="button"
              aria-label={t("Imagen siguiente")}
              onClick={() => move(1)}
              disabled={images.length < 2}
            >
              {t("Siguiente")}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
