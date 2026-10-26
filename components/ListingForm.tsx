"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  deleteListingDraft,
  getListingDrafts,
  MAX_PHOTOS,
  normalizeDraftInput,
  saveListingDraft,
  validateDraftInput,
  validatePhotoFiles,
  type DraftInput,
  type DraftPhoto,
  type ListingDraft,
  type ListingKind,
  type ListingOperation,
} from "@/lib/listing-drafts";
const initial = {
  title: "",
  operation: "Renta" as ListingOperation,
  propertyType: "Casa" as ListingKind,
  price: "",
  description: "",
  state: "Guanajuato",
  city: "León",
  neighborhood: "",
  area: "",
  beds: "",
  baths: "",
  annualTax: "",
  monthlyMaintenance: "",
  latitude: "21.122",
  longitude: "-101.686",
  imageRights: false,
};
function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}
function storageMessage(error: unknown) {
  return error instanceof DOMException && error.name === "QuotaExceededError"
    ? "No hay espacio suficiente en el navegador. Elimina borradores antiguos o usa menos fotos."
    : error instanceof Error
      ? error.message
      : "No se pudo completar la operación local. Tus datos no se han publicado.";
}
async function preparePhoto(file: File): Promise<DraftPhoto> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 60000000
    )
      throw new Error(
        "Una foto tiene dimensiones demasiado grandes o no es una imagen válida.",
      );
    const scale = Math.min(
      1,
      1920 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no pudo preparar las fotos.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("No se pudo preparar una de las fotos.")),
        "image/jpeg",
        0.85,
      ),
    );
    return {
      id: crypto.randomUUID(),
      name: `foto-${crypto.randomUUID().slice(0, 8)}.jpg`,
      blob,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `No se pudo leer ${file.name}: ${error.message}`
        : "No se pudo leer una fotografía.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
function PhotoPreview({ photo, label }: { photo: DraftPhoto; label: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);
  return url ? <img className="draft-photo" src={url} alt={label} /> : null;
}
async function exportDraft(draft: ListingDraft) {
  const photos = await Promise.all(
    draft.photos.map(async (photo) => ({
      name: photo.name,
      dataUrl: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("No se pudo preparar el respaldo."));
        reader.readAsDataURL(photo.blob);
      }),
    })),
  );
  const blob = new Blob(
    [
      JSON.stringify(
        { format: "home-view-local-draft", version: 1, ...draft, photos },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `home-view-${draft.id}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ListingForm() {
  const formId = useId();
  const fieldId = (name: string) => `${formId}-${name}`;
  const [values, setValues] = useState(initial);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [drafts, setDrafts] = useState<ListingDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    getListingDrafts()
      .then((result) => {
        if (active) setDrafts(result);
      })
      .catch((error) => {
        if (active) setStorageError(storageMessage(error));
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function change(name: keyof typeof initial, value: string | boolean) {
    setValues((previous) => ({ ...previous, [name]: value }));
    if (name === "propertyType" && value === "Terreno")
      setErrors((previous) => {
        const next = { ...previous };
        delete next.beds;
        delete next.baths;
        return next;
      });
    setMessage("");
  }
  async function choosePhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    const error = validatePhotoFiles(selected);
    if (error) {
      setPhotos([]);
      setErrors((previous) => ({ ...previous, photos: error }));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const prepared: DraftPhoto[] = [];
      for (const file of selected) prepared.push(await preparePhoto(file));
      setPhotos(prepared);
      setErrors((previous) => ({ ...previous, photos: "" }));
    } catch (error) {
      setPhotos([]);
      setErrors((previous) => ({ ...previous, photos: storageMessage(error) }));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    const input: DraftInput = {
      ...values,
      price: Number(values.price),
      area: Number(values.area),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      beds: numberOrNull(values.beds),
      baths: numberOrNull(values.baths),
      annualTax: numberOrNull(values.annualTax),
      monthlyMaintenance: numberOrNull(values.monthlyMaintenance),
    };
    const nextErrors = validateDraftInput(input);
    if (!photos.length)
      nextErrors.photos = "Añade al menos una fotografía del inmueble.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setBusy(true);
    try {
      const draft: ListingDraft = {
        ...normalizeDraftInput(input),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        photos,
      };
      await saveListingDraft(draft);
      setDrafts((previous) => [draft, ...previous]);
      setValues(initial);
      setPhotos([]);
      if (fileInput.current) fileInput.current.value = "";
      setStorageError("");
      setMessage(
        "Borrador guardado solo en este navegador. No se ha publicado ni enviado a un servidor.",
      );
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteListingDraft(id);
      setDrafts((previous) => previous.filter((draft) => draft.id !== id));
      setMessage("Borrador eliminado de este navegador.");
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function field(
    name: Exclude<
      keyof typeof initial,
      "imageRights" | "operation" | "propertyType" | "description"
    >,
    label: string,
    type = "text",
    hint?: string,
  ) {
    return (
      <label className="listing-field">
        <span id={`${fieldId(name)}-label`}>{label}</span>
        <input
          id={fieldId(name)}
          aria-labelledby={`${fieldId(name)}-label`}
          name={name}
          type={type}
          value={values[name]}
          onChange={(event) => change(name, event.target.value)}
          step={type === "number" ? "any" : undefined}
          aria-invalid={!!errors[name]}
          aria-describedby={
            [
              hint ? `${fieldId(name)}-hint` : "",
              errors[name] ? `error-${name}` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {hint && <small id={`${fieldId(name)}-hint`}>{hint}</small>}
        {errors[name] && (
          <span className="listing-field-error" id={`error-${name}`}>
            {errors[name]}
          </span>
        )}
      </label>
    );
  }
  return (
    <div className="listing-workspace">
      <div className="listing-local-notice">
        <strong>Borradores locales · No publicados</strong>
        <p>
          Se guardan solo en este navegador y dispositivo. No aparecen en el
          catálogo público ni se comparten con otras personas. Al borrar los
          datos del navegador puedes perderlos; descarga un respaldo para
          conservarlos.
        </p>
      </div>
      {storageError && (
        <p className="listing-error" role="alert">
          {storageError}
        </p>
      )}
      {message && (
        <p className="listing-success" role="status">
          {message}
        </p>
      )}
      <form className="listing-form" onSubmit={submit} noValidate>
        {Object.values(errors).some(Boolean) && (
          <div className="listing-error" role="alert" aria-atomic="true">
            <strong>Revisa la información del borrador.</strong>
            <ul>
              {Object.entries(errors)
                .filter(([, error]) => Boolean(error))
                .map(([name, error]) => (
                  <li key={name}>
                    <a
                      href={`#${fieldId(name)}`}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(fieldId(name))?.focus();
                      }}
                    >
                      {error}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
        <fieldset disabled={busy || !loaded}>
          <legend>Datos del inmueble</legend>
          <div className="listing-field-grid">
            <label className="listing-field">
              <span id={`${fieldId("operation")}-label`}>Operación</span>
              <select
                id={fieldId("operation")}
                aria-labelledby={`${fieldId("operation")}-label`}
                aria-invalid={!!errors.operation}
                value={values.operation}
                onChange={(event) => change("operation", event.target.value)}
              >
                <option>Renta</option>
                <option>Venta</option>
              </select>
            </label>
            <label className="listing-field">
              <span id={`${fieldId("propertyType")}-label`}>
                Tipo de inmueble
              </span>
              <select
                id={fieldId("propertyType")}
                aria-labelledby={`${fieldId("propertyType")}-label`}
                aria-invalid={!!errors.propertyType}
                value={values.propertyType}
                onChange={(event) => change("propertyType", event.target.value)}
              >
                <option>Casa</option>
                <option>Departamento</option>
                <option>Terreno</option>
              </select>
            </label>
            {field("title", "Título del anuncio")}
            {field(
              "price",
              values.operation === "Renta"
                ? "Renta mensual (MXN)"
                : "Precio de venta (MXN)",
              "number",
            )}
            {field(
              "area",
              values.propertyType === "Terreno"
                ? "Superficie del terreno (m²)"
                : "Superficie construida (m²)",
              "number",
            )}
            {values.propertyType !== "Terreno" && (
              <>
                {field("beds", "Recámaras (opcional)", "number")}
                {field("baths", "Baños (opcional)", "number")}
              </>
            )}
            {field(
              "annualTax",
              "Predial anual (MXN, opcional)",
              "number",
              "Monto proporcionado por ti; no es un cálculo fiscal.",
            )}
            {field(
              "monthlyMaintenance",
              "Mantenimiento mensual (MXN, opcional)",
              "number",
            )}
          </div>
          <label className="listing-field">
            <span id={`${fieldId("description")}-label`}>Descripción</span>
            <textarea
              id={fieldId("description")}
              aria-labelledby={`${fieldId("description")}-label`}
              value={values.description}
              onChange={(event) => change("description", event.target.value)}
              rows={5}
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "error-description" : undefined
              }
            />
            {errors.description && (
              <span className="listing-field-error" id="error-description">
                {errors.description}
              </span>
            )}
          </label>
          <h2>Ubicación aproximada</h2>
          <p className="listing-help">
            Usa una referencia de la zona, sin dirección exacta ni datos de
            contacto. Las coordenadas iniciales son el centro de León y debes
            ajustarlas a la ubicación aproximada de tu inmueble.
          </p>
          <div className="listing-field-grid">
            {field("state", "Estado")}
            {field("city", "Ciudad / municipio")}
            {field("neighborhood", "Colonia / zona")}
            {field("latitude", "Latitud aproximada", "number")}
            {field("longitude", "Longitud aproximada", "number")}
          </div>
          <h2>Fotografías autorizadas</h2>
          <p className="listing-help">
            Hasta {MAX_PHOTOS} fotos JPEG, PNG o WebP de 5 MB cada una. Se
            reducen de tamaño y se retiran los metadatos al prepararlas. Evita
            rostros, documentos y otros datos privados. Las fotos normales se
            muestran en galería; no se convierten en recorridos 360.
          </p>
          <label className="listing-field">
            <span id={`${fieldId("photos")}-label`}>
              Seleccionar fotografías
            </span>
            <input
              id={fieldId("photos")}
              aria-labelledby={`${fieldId("photos")}-label`}
              aria-invalid={!!errors.photos}
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => void choosePhotos(event.target.files)}
              aria-describedby={errors.photos ? "error-photos" : undefined}
            />
          </label>
          {errors.photos && (
            <p className="listing-field-error" id="error-photos">
              {errors.photos}
            </p>
          )}
          <div className="listing-photo-preview">
            {photos.map((photo, i) => (
              <PhotoPreview
                key={photo.id}
                photo={photo}
                label={`Foto seleccionada ${i + 1}`}
              />
            ))}
          </div>
          <label className="listing-rights">
            <input
              id={fieldId("imageRights")}
              aria-labelledby={`${fieldId("imageRights")}-label`}
              aria-invalid={!!errors.imageRights}
              type="checkbox"
              checked={values.imageRights}
              onChange={(event) => change("imageRights", event.target.checked)}
              aria-describedby={errors.imageRights ? "error-rights" : undefined}
            />
            <span id={`${fieldId("imageRights")}-label`}>
              Tomé estas fotos o tengo autorización para utilizarlas.
            </span>
          </label>
          {errors.imageRights && (
            <p className="listing-field-error" id="error-rights">
              {errors.imageRights}
            </p>
          )}
          <button type="submit" className="button button-dark">
            {busy ? "Preparando…" : "Guardar borrador en este navegador"}
          </button>
        </fieldset>
      </form>
      <section className="listing-saved" aria-labelledby="saved-title">
        <h2 id="saved-title">Mis borradores locales</h2>
        <p className="listing-help">
          Estos anuncios no están publicados. Quien use este navegador en este
          dispositivo podría acceder a ellos.
        </p>
        {!loaded ? (
          <p role="status">Leyendo borradores…</p>
        ) : drafts.length === 0 ? (
          <p className="listing-empty">
            Todavía no has guardado borradores en este navegador.
          </p>
        ) : (
          drafts.map((draft) => (
            <article key={draft.id} className="draft-card">
              <div className="draft-card-heading">
                <div>
                  <span className="draft-status">
                    Borrador local · No publicado
                  </span>
                  <h3>{draft.title}</h3>
                  <p>
                    {draft.propertyType} · {draft.operation} ·{" "}
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                      maximumFractionDigits: 0,
                    }).format(draft.price)}
                    {draft.operation === "Renta" ? " / mes" : ""}
                  </p>
                </div>
                <div className="draft-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void exportDraft(draft).catch((error) =>
                        setStorageError(storageMessage(error)),
                      )
                    }
                  >
                    Descargar respaldo
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(draft.id)}
                  >
                    Eliminar borrador
                  </button>
                </div>
              </div>
              <p>
                {draft.city}, {draft.state} · {draft.neighborhood}
              </p>
              <p className="draft-description">{draft.description}</p>
              <div className="draft-photo-grid">
                {draft.photos.map((photo, i) => (
                  <PhotoPreview
                    key={photo.id}
                    photo={photo}
                    label={`Fotografía ${i + 1} de ${draft.title}`}
                  />
                ))}
              </div>
              <p className="draft-no-tour">
                {draft.propertyType === "Terreno"
                  ? "Terreno: ficha y fotografías, sin recorrido 360."
                  : "Galería de fotos normales. Este borrador no tiene recorrido 360."}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
