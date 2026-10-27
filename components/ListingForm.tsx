"use client";
import { useI18n } from "@/components/I18nProvider";
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
import {
  defaultMaintenance,
  defaultRentalTerms,
  type Maintenance,
  type RentalTerms,
  type SaleTerms,
  type Community,
} from "@/lib/property-terms";
import { TermsDetails } from "./PropertyCosts";
import { ListingTermsFields } from "./ListingTermsFields";
import { DraftTourEditor, DraftTourSavedPreview } from "./DraftTourEditor";
import { validateDraftScenes, type DraftScene } from "@/lib/draft-tour";
const initial = {
  title: "",
  operation: "Renta" as ListingOperation,
  propertyType: "Casa" as ListingKind,
  rentPrice: "",
  salePrice: "",
  description: "",
  state: "Guanajuato",
  city: "León",
  neighborhood: "",
  area: "",
  beds: "",
  baths: "",
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
  const scenes = await Promise.all(
    draft.scenes.map(async (scene) => ({
      ...scene,
      blob: undefined,
      dataUrl: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("No se pudo exportar un panorama."));
        reader.readAsDataURL(scene.blob);
      }),
    })),
  );
  const blob = new Blob(
    [
      JSON.stringify(
        {
          format: "home-view-local-draft",
          version: 2,
          ...draft,
          photos,
          scenes,
        },
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
  const { t } = useI18n();
  function localizeMessage(message: string) {
    const photoError = message.match(/^No se pudo leer (.+): (.*)$/);
    return photoError
      ? t("No se pudo leer {name}: {reason}", {
          name: photoError[1],
          reason: t(photoError[2]),
        })
      : t(message);
  }
  const formId = useId();
  const fieldId = (name: string) => `${formId}-${name}`;
  const [values, setValues] = useState(initial);
  const [rental, setRental] = useState<RentalTerms>(defaultRentalTerms);
  const [sale, setSale] = useState<SaleTerms>({
    purchasePrice: null,
    annualTax: null,
  });
  const [maintenance, setMaintenance] =
    useState<Maintenance>(defaultMaintenance);
  const [community, setCommunity] = useState<Community>("unknown");
  const [scenes, setScenes] = useState<DraftScene[]>([]);
  const [editing, setEditing] = useState<ListingDraft | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
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
    if (busy) return;
    const form = event.currentTarget;
    setMessage("");
    const input: DraftInput = {
      title: values.title,
      propertyType: values.propertyType,
      description: values.description,
      state: values.state,
      city: values.city,
      neighborhood: values.neighborhood,
      imageRights: values.imageRights,
      ...(values.operation === "Renta"
        ? {
            operation: "Renta" as const,
            rental: { ...rental, monthlyRent: Number(values.rentPrice) },
          }
        : {
            operation: "Venta" as const,
            sale: { ...sale, purchasePrice: Number(values.salePrice) },
          }),
      maintenance,
      community,
      area: Number(values.area),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      beds: numberOrNull(values.beds),
      baths: numberOrNull(values.baths),
    };
    const nextErrors = validateDraftInput(input);
    const sceneError =
      values.propertyType === "Terreno" ? null : validateDraftScenes(scenes);
    if (sceneError) nextErrors.scenes = sceneError;
    if (!photos.length)
      nextErrors.photos = "Añade al menos una fotografía del inmueble.";
    if (nextErrors.price) {
      nextErrors[values.operation === "Renta" ? "rentPrice" : "salePrice"] =
        nextErrors.price;
      delete nextErrors.price;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    setBusy(true);
    try {
      identity.current ??= {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const draft: ListingDraft = {
        ...normalizeDraftInput(input),
        schemaVersion: 2,
        id: identity.current.id,
        createdAt: identity.current.createdAt,
        updatedAt: new Date().toISOString(),
        photos,
        scenes: values.propertyType === "Terreno" ? [] : scenes,
      };
      await saveListingDraft(draft);
      setDrafts((previous) => [
        draft,
        ...previous.filter((item) => item.id !== draft.id),
      ]);
      setEditing(draft);
      setSavedId(draft.id);
      setStorageError("");
      setMessage(
        "Borrador guardado solo en este navegador. No se ha publicado ni enviado a un servidor.",
      );
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() =>
        feedbackRef.current?.scrollIntoView({ block: "center" }),
      );
    }
  }
  function resetEditor() {
    identity.current = null;
    setSavedId(null);
    setMessage("");
    setValues(initial);
    setRental(defaultRentalTerms());
    setSale({ purchasePrice: null, annualTax: null });
    setMaintenance(defaultMaintenance());
    setCommunity("unknown");
    setPhotos([]);
    setScenes([]);
    setEditing(null);
    setErrors({});
    if (fileInput.current) fileInput.current.value = "";
  }
  function edit(draft: ListingDraft) {
    identity.current = { id: draft.id, createdAt: draft.createdAt };
    setSavedId(null);
    setEditing(draft);
    setValues({
      ...initial,
      title: draft.title,
      operation: draft.operation,
      propertyType: draft.propertyType,
      rentPrice:
        draft.operation === "Renta"
          ? String(draft.rental.monthlyRent ?? "")
          : "",
      salePrice:
        draft.operation === "Venta"
          ? String(draft.sale.purchasePrice ?? "")
          : "",
      description: draft.description,
      state: draft.state,
      city: draft.city,
      neighborhood: draft.neighborhood,
      area: String(draft.area),
      beds: String(draft.beds ?? ""),
      baths: String(draft.baths ?? ""),
      latitude: String(draft.latitude),
      longitude: String(draft.longitude),
      imageRights: draft.imageRights,
    });
    setRental(
      draft.operation === "Renta" ? draft.rental : defaultRentalTerms(),
    );
    setSale(
      draft.operation === "Venta"
        ? draft.sale
        : { purchasePrice: null, annualTax: null },
    );
    setMaintenance(draft.maintenance);
    setCommunity(draft.community);
    setPhotos(draft.photos);
    setScenes(draft.scenes);
    setErrors({});
    setMessage(
      draft.migrationNote ||
        "Editando un borrador local. Guarda para conservar los cambios.",
    );
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteListingDraft(id);
      setDrafts((previous) => previous.filter((draft) => draft.id !== id));
      if (editing?.id === id) resetEditor();
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
        <span id={`${fieldId(name)}-label`}>{t(label)}</span>
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
        {hint && <small id={`${fieldId(name)}-hint`}>{t(hint)}</small>}
        {errors[name] && (
          <span className="listing-field-error" id={`error-${name}`}>
            {localizeMessage(errors[name])}
          </span>
        )}
      </label>
    );
  }
  return (
    <div className="listing-workspace">
      <div className="listing-local-notice">
        <strong>{t("Borradores locales · No publicados")}</strong>
        <p>
          {t(
            "Se guardan solo en este navegador y dispositivo. No aparecen en el catálogo público ni se comparten con otras personas. Al borrar los datos del navegador puedes perderlos; descarga un respaldo para conservarlos.",
          )}
        </p>
        <p>{t("Un borrador creado aquí no aparecerá en tu otro dispositivo. La sincronización todavía no está disponible.")}</p>
      </div>
      <form
        ref={formRef}
        className="listing-form"
        onSubmit={submit}
        onChange={() => {
          setMessage("");
          setSavedId(null);
        }}
        noValidate
      >
        {editing && (
          <div className="listing-local-notice">
            <strong>{t("Editando: {title}", { title: editing.title })}</strong>
            <button type="button" disabled={busy} onClick={resetEditor}>
              {t("Cancelar edición")}
            </button>
          </div>
        )}
        {Object.values(errors).some(Boolean) && (
          <div className="listing-error" role="alert" aria-atomic="true">
            <strong>{t("Revisa la información del borrador.")}</strong>
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
                      {localizeMessage(error)}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
        <fieldset disabled={busy || !loaded}>
          <legend>{t("Datos del inmueble")}</legend>
          <div className="listing-field-grid">
            <label className="listing-field">
              <span id={`${fieldId("operation")}-label`}>{t("Operación")}</span>
              <select
                id={fieldId("operation")}
                aria-labelledby={`${fieldId("operation")}-label`}
                aria-invalid={!!errors.operation}
                value={values.operation}
                onChange={(event) => change("operation", event.target.value)}
              >
                <option value="Renta">{t("Renta")}</option>
                <option value="Venta">{t("Venta")}</option>
              </select>
            </label>
            <label className="listing-field">
              <span id={`${fieldId("propertyType")}-label`}>
                {t("Tipo de inmueble")}
              </span>
              <select
                id={fieldId("propertyType")}
                aria-labelledby={`${fieldId("propertyType")}-label`}
                aria-invalid={!!errors.propertyType}
                value={values.propertyType}
                onChange={(event) => change("propertyType", event.target.value)}
              >
                <option value="Casa">{t("Casa")}</option>
                <option value="Departamento">{t("Departamento")}</option>
                <option value="Terreno">{t("Terreno")}</option>
              </select>
            </label>
            {field("title", "Título del anuncio")}
            {field(
              values.operation === "Renta" ? "rentPrice" : "salePrice",
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
          </div>
          <ListingTermsFields
            fieldId={fieldId}
            operation={values.operation}
            rental={rental}
            sale={sale}
            maintenance={maintenance}
            community={community}
            onRental={setRental}
            onSale={setSale}
            onMaintenance={setMaintenance}
            onCommunity={setCommunity}
            errors={errors}
          />
          <div
            className="draft-terms-preview"
            aria-label={t("Vista previa de costos")}
          >
            <TermsDetails
              terms={
                values.operation === "Renta"
                  ? {
                      operation: "Renta",
                      rental: {
                        ...rental,
                        monthlyRent: values.rentPrice.trim()
                          ? Number(values.rentPrice)
                          : null,
                      },
                      maintenance,
                      community,
                    }
                  : {
                      operation: "Venta",
                      sale: {
                        ...sale,
                        purchasePrice: values.salePrice.trim()
                          ? Number(values.salePrice)
                          : null,
                      },
                      maintenance,
                      community,
                    }
              }
            />
          </div>
          <label className="listing-field">
            <span id={`${fieldId("description")}-label`}>
              {t("Descripción")}
            </span>
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
                {localizeMessage(errors.description)}
              </span>
            )}
          </label>
          <h2>{t("Ubicación aproximada")}</h2>
          <p className="listing-help">
            {t(
              "Usa una referencia de la zona, sin dirección exacta ni datos de contacto. Las coordenadas iniciales son el centro de León y debes ajustarlas a la ubicación aproximada de tu inmueble.",
            )}
          </p>
          <div className="listing-field-grid">
            {field("state", "Estado")}
            {field("city", "Ciudad / municipio")}
            {field("neighborhood", "Colonia / zona")}
            {field("latitude", "Latitud aproximada", "number")}
            {field("longitude", "Longitud aproximada", "number")}
          </div>
          <h2>{t("Fotografías autorizadas")}</h2>
          <p className="listing-help">
            {t(
              "Hasta {count} fotos JPEG, PNG o WebP de 5 MB cada una. Se reducen de tamaño y se retiran los metadatos al prepararlas. Evita rostros, documentos y otros datos privados. Las fotos normales se muestran en galería; no se convierten en recorridos 360.",
              { count: MAX_PHOTOS },
            )}
          </p>
          <label className="listing-field">
            <span id={`${fieldId("photos")}-label`}>
              {t("Seleccionar fotografías")}
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
              {localizeMessage(errors.photos)}
            </p>
          )}
          <div className="listing-photo-preview">
            {photos.map((photo, i) => (
              <PhotoPreview
                key={photo.id}
                photo={photo}
                label={t("Foto seleccionada {number}", { number: i + 1 })}
              />
            ))}
          </div>
          {errors.scenes && (
            <p id="error-scenes" className="listing-error" role="alert">
              {localizeMessage(errors.scenes)}
            </p>
          )}
          {values.propertyType !== "Terreno" && (
            <div
              id={fieldId("scenes")}
              tabIndex={-1}
              aria-invalid={!!errors.scenes}
              aria-describedby={errors.scenes ? "error-scenes" : undefined}
            >
              <DraftTourEditor
                scenes={scenes}
                onChange={setScenes}
                disabled={busy}
                onBusyChange={setBusy}
              />
            </div>
          )}
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
              {t(
                "Tomé estas fotos y panoramas o tengo autorización para utilizarlos.",
              )}
            </span>
          </label>
          {errors.imageRights && (
            <p className="listing-field-error" id="error-rights">
              {localizeMessage(errors.imageRights)}
            </p>
          )}
          <div
            ref={feedbackRef}
            className="draft-save-feedback"
            aria-live="polite"
          >
            {storageError && (
              <p className="listing-error" role="alert">
                {localizeMessage(storageError)}{" "}
                {t(
                  "La captura permanece en el formulario. Intenta guardar otra vez sin borrar los datos del sitio.",
                )}
              </p>
            )}
            {message && (
              <p className="listing-success" role="status">
                {localizeMessage(message)}
              </p>
            )}
            {savedId && (
              <div className="draft-actions">
                <a
                  className="button button-dark"
                  href={`#draft-${savedId}`}
                  onClick={() =>
                    window.requestAnimationFrame(() =>
                      document.getElementById(`draft-${savedId}`)?.focus(),
                    )
                  }
                >
                  {t("Ver el borrador guardado")}
                </a>
                <button type="button" disabled={busy} onClick={resetEditor}>
                  {t("Crear otro borrador")}
                </button>
              </div>
            )}
          </div>
          <button type="submit" className="button button-dark">
            {busy
              ? t("Preparando…")
              : editing
                ? t("Guardar cambios del borrador")
                : t("Guardar borrador en este navegador")}
          </button>
        </fieldset>
      </form>
      <section className="listing-saved" aria-labelledby="saved-title">
        <h2 id="saved-title">{t("Mis borradores locales")}</h2>
        <p className="listing-help">
          {t(
            "Estos anuncios no están publicados. Quien use este navegador en este dispositivo podría acceder a ellos.",
          )}
        </p>
        {!loaded ? (
          <p role="status">{t("Leyendo borradores…")}</p>
        ) : drafts.length === 0 ? (
          <p className="listing-empty">
            {t("Todavía no has guardado borradores en este navegador.")}
          </p>
        ) : (
          drafts.map((draft) => (
            <article
              key={draft.id}
              id={`draft-${draft.id}`}
              tabIndex={-1}
              className="draft-card"
            >
              <div className="draft-card-heading">
                <div>
                  <span className="draft-status">
                    {t("Borrador local · No publicado")}
                  </span>
                  <h3>{draft.title}</h3>
                  <p>
                    {t(draft.propertyType)} · {t(draft.operation)} ·{" "}
                    {draft.operation === "Renta"
                      ? t("Renta mensual")
                      : t("Precio de compra")}
                  </p>
                </div>
                <div className="draft-actions">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => edit(draft)}
                  >
                    {t("Editar borrador")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void exportDraft(draft).catch((error) =>
                        setStorageError(storageMessage(error)),
                      )
                    }
                  >
                    {t("Descargar respaldo")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(draft.id)}
                  >
                    {t("Eliminar borrador")}
                  </button>
                </div>
              </div>
              <p>
                {draft.city}, {draft.state} · {draft.neighborhood}
              </p>
              {draft.migrationNote && (
                <p className="listing-help">{t(draft.migrationNote)}</p>
              )}
              <p className="draft-description">{draft.description}</p>
              <TermsDetails terms={draft} />

              <div className="draft-photo-grid">
                {draft.photos.map((photo, i) => (
                  <PhotoPreview
                    key={photo.id}
                    photo={photo}
                    label={t("Fotografía {number} de {title}", {
                      number: i + 1,
                      title: draft.title,
                    })}
                  />
                ))}
              </div>
              {draft.scenes.length > 0 && (
                <DraftTourSavedPreview scenes={draft.scenes} />
              )}
              <p className="draft-no-tour">
                {draft.propertyType === "Terreno"
                  ? t("Terreno: ficha y fotografías, sin recorrido 360.")
                  : draft.scenes.length
                    ? t(
                        "Recorrido 360 local con conexiones manuales; no publicado.",
                      )
                    : t(
                        "Galería de fotos normales. Este borrador no tiene recorrido 360.",
                      )}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
