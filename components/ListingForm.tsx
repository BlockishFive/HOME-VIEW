"use client";
import Link from "next/link";
import { emptyVisitAccess } from "@/lib/visit-access";
import { ListingReviewDialog } from "./ListingReviewDialog";
import { VisitAccessDetails } from "./VisitAccessDetails";
import { draftFromCapture } from "@/lib/listing-review";
import { ListingBackupTools } from "./ListingBackupTools";
import {
  downloadDraftBackup,
  downloadCaptureBackup,
  contentFromDraft,
} from "@/lib/listing-backup";
import { useCaptureAutosave } from "./useCaptureAutosave";
import {
  captureFingerprint,
  getCapture,
  initialCaptureValues,
  type CaptureContent,
  type CaptureSummary,
} from "@/lib/capture-store";
import { LocationPicker } from "./LocationPicker";
import type { PublicLocation } from "@/lib/location";
import {
  getSharedDraftSummaries,
  privateRequest,
  loadSharedDraft,
  type RemoteDraft,
  saveSharedDraft,
  deleteSharedDraft,
  publishSharedDraft,
} from "@/lib/shared-drafts";
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
const initial = initialCaptureValues;
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
export function ListingForm({
  storage = "local",
  registerPreserve,
}: {
  storage?: "local" | "shared";
  registerPreserve?: (preserve: (() => Promise<boolean>) | null) => void;
}) {
  const shared = storage === "shared";
  const sharedRevision = useRef(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const revisionOf = (draft: ListingDraft | RemoteDraft) =>
    "sharedRevision" in draft && typeof draft.sharedRevision === "number"
      ? draft.sharedRevision
      : 0;
  const { t, locale } = useI18n();
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
  const [publicLocation, setPublicLocation] =
    useState<PublicLocation>("approximate");
  const [locationReviewed, setLocationReviewed] = useState(false);
  const [visitAccess, setVisitAccess] = useState(emptyVisitAccess);
  const [rental, setRental] = useState<RentalTerms>(defaultRentalTerms);
  const [sale, setSale] = useState<SaleTerms>({
    purchasePrice: null,
    annualTax: null,
  });
  const [maintenance, setMaintenance] =
    useState<Maintenance>(defaultMaintenance);
  const [community, setCommunity] = useState<Community>("unknown");
  const [scenes, setScenes] = useState<DraftScene[]>([]);
  const [editing, setEditing] = useState<Pick<
    ListingDraft,
    "id" | "title"
  > | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const identity = useRef<{ id: string; createdAt: string } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [drafts, setDrafts] = useState<(ListingDraft | RemoteDraft)[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [backupError, setBackupError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [review, setReview] = useState<{
    draft: ListingDraft | RemoteDraft;
    saved: boolean;
    revision: number;
    nonce: number;
  } | null>(null);
  const [reviewError, setReviewError] = useState("");
  const reviewNonce = useRef(0);

  const [loadingMediaId, setLoadingMediaId] = useState<string | null>(null);
  const savedListRef = useRef<HTMLElement>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const [editorOpen, setEditorOpen] = useState(!shared);
  const [query, setQuery] = useState("");
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(
    () => new Set(),
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const content: CaptureContent = {
    visitAccess,
    values,
    rental,
    sale,
    maintenance,
    community,
    publicLocation,
    locationReviewed,
    photos,
    scenes,
  };
  const contentRef = useRef(content);
  contentRef.current = content;
  const autosave = useCaptureAutosave(content, storage, editorOpen, () => {
    identity.current ??= {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return {
      identity: identity.current,
      sharedRevision: sharedRevision.current,
      editingTitle: editing?.title,
    };
  });
  useEffect(() => {
    if (!registerPreserve) return;
    registerPreserve(() => (busy ? Promise.resolve(false) : autosave.flush()));
    return () => registerPreserve(null);
  }, [registerPreserve, autosave.flush, busy]);
  const publicationState = (draft: ListingDraft | RemoteDraft) =>
    !("publishedRevision" in draft && draft.publishedRevision)
      ? "draft"
      : draft.publishedRevision === revisionOf(draft)
        ? "published"
        : "changes";
  const searchText = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visibleDrafts = drafts.filter(
    (draft) =>
      (statusFilter === "all" || publicationState(draft) === statusFilter) &&
      searchText(
        `${draft.title} ${draft.city} ${draft.neighborhood} ${draft.operation}`,
      ).includes(searchText(query.trim())),
  );
  function applyCapture(next: CaptureContent) {
    setValues(next.values);
    setRental(next.rental);
    setSale(next.sale);
    setMaintenance(next.maintenance);
    setCommunity(next.community);
    setPublicLocation(next.publicLocation);
    setLocationReviewed(next.locationReviewed);
    setVisitAccess(next.visitAccess ?? emptyVisitAccess());
    setPhotos(next.photos);
    setScenes(next.scenes);
    setErrors({});
    setSavedId(null);
    setMessage("");
  }
  async function recoverCapture(id: string) {
    setBusy(true);
    try {
      const capture = await autosave.restore(id);
      if (!capture) return;
      identity.current = capture.identity;
      sharedRevision.current = capture.sharedRevision;
      setEditing(
        capture.editingTitle
          ? { id: capture.identity.id, title: capture.editingTitle }
          : null,
      );
      applyCapture(capture.content);
      setEditorOpen(true);
      requestAnimationFrame(() =>
        formRef.current?.scrollIntoView({ block: "start" }),
      );
    } finally {
      setBusy(false);
    }
  }
  async function closeEditor() {
    setBusy(true);
    try {
      if (await autosave.flush()) {
        setEditorOpen(false);
        document
          .getElementById("saved-title")
          ?.scrollIntoView({ block: "start" });
      }
    } finally {
      setBusy(false);
    }
  }
  async function discardCapture(row: CaptureSummary) {
    if (
      !window.confirm(
        t(
          "¿Descartar esta captura automática del dispositivo? No se eliminará ninguna propiedad del servidor.",
        ),
      )
    )
      return;
    setBusy(true);
    try {
      if (await autosave.discard(row))
        if (row.id === autosave.activeId) {
          await resetEditor();
          setEditorOpen(!shared);
        }
    } finally {
      setBusy(false);
    }
  }
  async function forkCapture() {
    setBusy(true);
    try {
      await autosave.fork();
    } finally {
      setBusy(false);
    }
  }
  async function expand(draft: ListingDraft | RemoteDraft) {
    setLoadingMediaId(draft.id);
    setBusy(true);
    setStorageError("");
    try {
      const full = await loadSharedDraft(draft);
      setDrafts((rows) => rows.map((row) => (row.id === full.id ? full : row)));
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
      setLoadingMediaId(null);
    }
  }
  async function beginEdit(draft: ListingDraft | RemoteDraft) {
    setBusy(true);
    try {
      await edit(
        shared ? await loadSharedDraft(draft) : (draft as ListingDraft),
      );
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function download(draft: ListingDraft | RemoteDraft) {
    setBusy(true);
    setBackupError("");
    try {
      await downloadDraftBackup(
        shared ? await loadSharedDraft(draft) : (draft as ListingDraft),
      );
    } catch (error) {
      setBackupError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function downloadRecovery(id: string) {
    setBusy(true);
    setBackupError("");
    try {
      const row = await getCapture(id);
      if (!row || row.scope !== storage)
        throw new Error(
          "La captura ya no está disponible en este dispositivo.",
        );
      await downloadCaptureBackup(row.content);
    } catch (error) {
      setBackupError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    (shared ? getSharedDraftSummaries() : getListingDrafts())
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
  }, [shared]);
  function change(name: keyof typeof initial, value: string | boolean) {
    if (name === "latitude" || name === "longitude") setLocationReviewed(false);
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
      visitAccess,
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
      publicLocation,
      locationReviewed,
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
    const submittedSignature = captureFingerprint(contentRef.current);
    setBusy(true);
    try {
      await autosave.flush();
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
      if (shared) {
        const revision = await saveSharedDraft(draft, sharedRevision.current);
        sharedRevision.current = revision;
        Object.assign(draft, { sharedRevision: revision });
      } else await saveListingDraft(draft);
      setDrafts((previous) => [
        Object.assign(draft, {
          publishedRevision: (
            previous.find((item) => item.id === draft.id) as ListingDraft & {
              publishedRevision?: number;
            }
          )?.publishedRevision,
        }),
        ...previous.filter((item) => item.id !== draft.id),
      ]);
      setEditing({ id: draft.id, title: draft.title });
      await autosave.confirmed(submittedSignature);
      setSavedId(draft.id);
      setStorageError("");
      setMessage(
        shared
          ? "Borrador guardado en el servidor privado. Abre el área privada en tu otro dispositivo y actualiza la lista."
          : "Borrador guardado solo en este navegador. No se ha publicado ni enviado a un servidor.",
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
  function resetValues() {
    sharedRevision.current = 0;
    identity.current = null;
    setSavedId(null);
    setMessage("");
    setValues(initial);
    setVisitAccess(emptyVisitAccess());
    setPublicLocation("approximate");
    setLocationReviewed(false);
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
  const contentOf = contentFromDraft;
  async function resetEditor() {
    const next = {
      ...contentRef.current,
      values: initial,
      rental: defaultRentalTerms(),
      sale: { purchasePrice: null, annualTax: null },
      maintenance: defaultMaintenance(),
      community: "unknown" as const,
      publicLocation: "approximate" as const,
      locationReviewed: false,
      visitAccess: emptyVisitAccess(),
      photos: [],
      scenes: [],
    };
    setBusy(true);
    try {
      if (!(await autosave.begin(next))) return;
      resetValues();
      setEditorOpen(true);
      requestAnimationFrame(() =>
        formRef.current?.scrollIntoView({ block: "start" }),
      );
    } finally {
      setBusy(false);
    }
  }
  async function edit(draft: ListingDraft) {
    if (!(await autosave.begin(contentOf(draft)))) return;
    setEditorOpen(true);
    setPublicLocation(draft.publicLocation ?? "approximate");
    setLocationReviewed(draft.locationReviewed === true);
    setVisitAccess(draft.visitAccess ?? emptyVisitAccess());
    sharedRevision.current = revisionOf(draft);
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
        (shared
          ? "Editando un borrador privado. Guarda para enviar los cambios; publicar es una acción independiente."
          : "Editando un borrador local. Guarda para conservar los cambios."),
    );
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      if (shared)
        await deleteSharedDraft(
          id,
          revisionOf(drafts.find((draft) => draft.id === id)!),
        );
      else await deleteListingDraft(id);
      setDrafts((previous) => previous.filter((draft) => draft.id !== id));
      if (editing?.id === id) {
        await resetEditor();
        if (shared) setEditorOpen(false);
      }
      setMessage(
        shared
          ? "Borrador eliminado del servidor privado."
          : "Borrador eliminado de este navegador.",
      );
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function replaceShared(rows: RemoteDraft[]) {
    savedListRef.current
      ?.querySelectorAll<HTMLDetailsElement>("details")
      .forEach((details) => {
        details.open = false;
      });
    setDrafts(rows);
  }
  async function refreshShared() {
    setBusy(true);
    setStorageError("");
    try {
      replaceShared(await getSharedDraftSummaries());
      setMessage(
        "Lista privada actualizada. La captura en curso permanece en el formulario.",
      );
    } catch (error) {
      setStorageError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function openSavedReview(draft: ListingDraft | RemoteDraft) {
    setBusy(true);
    setStorageError("");
    setReviewError("");
    try {
      const fresh = shared
        ? ((await (await privateRequest(`drafts/${draft.id}`)).json())
            .draft as RemoteDraft)
        : draft;
      if (shared)
        setDrafts((rows) =>
          rows.map((row) => (row.id === fresh.id ? fresh : row)),
        );
      setReview({
        draft: fresh,
        saved: true,
        revision: revisionOf(fresh),
        nonce: ++reviewNonce.current,
      });
    } catch (error) {
      setStorageError(storageMessage(error));
      if (review) setReviewError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  function openCaptureReview() {
    setReviewError("");
    setReview({
      draft: draftFromCapture(contentRef.current),
      saved: false,
      revision: 0,
      nonce: ++reviewNonce.current,
    });
  }
  async function publish(draft: ListingDraft | RemoteDraft, enabled: boolean) {
    if (
      !window.confirm(
        t(
          enabled
            ? "Se publicará la versión guardada: descripción, precios, condiciones, ubicación, fotos y panoramas serán visibles para cualquiera con acceso al sitio. Confirma que tienes autorización y que no contienen datos personales. Los cambios sin guardar no se publican. ¿Publicar?"
            : "¿Retirar esta propiedad del catálogo público? El borrador privado se conservará.",
        ),
      )
    )
      return;
    setBusy(true);
    setStorageError("");
    setReviewError("");
    try {
      await publishSharedDraft(draft.id, revisionOf(draft), enabled);
      if (enabled) setReview(null);
      replaceShared(await getSharedDraftSummaries());
      setMessage(
        enabled
          ? "Propiedad publicada. Abre el catálogo para verla."
          : "Propiedad retirada. Se conserva el borrador privado.",
      );
    } catch (error) {
      setStorageError(storageMessage(error));
      if (enabled) setReviewError(storageMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function copyToPrivate(draft: ListingDraft) {
    setBusy(true);
    setCopyError(null);
    setCopied(null);
    try {
      await saveSharedDraft(draft, 0);
      setCopied(draft.id);
    } catch (error) {
      setCopyError({ id: draft.id, message: storageMessage(error) });
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
  const savedSection = (
    <section
      ref={savedListRef}
      className="listing-saved"
      aria-labelledby="saved-title"
    >
      <h2 id="saved-title">
        {t(shared ? "Mis borradores privados" : "Mis borradores locales")}
      </h2>
      <p className="listing-help">
        {t(
          shared
            ? "Guardar no publica. Usa Publicar propiedad para compartir una versión en el catálogo; puedes retirarla cuando quieras."
            : "Estos anuncios no están publicados. Quien use este navegador en este dispositivo podría acceder a ellos.",
        )}
      </p>
      {shared && (
        <div className="dashboard-controls">
          <label className="listing-field">
            <span>{t("Buscar mis propiedades")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="listing-field">
            <span>{t("Estado de publicación")}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">{t("Todas mis propiedades")}</option>
              <option value="draft">{t("Borradores")}</option>
              <option value="published">{t("Publicadas")}</option>
              <option value="changes">{t("Cambios pendientes")}</option>
            </select>
          </label>
          <button
            type="button"
            className="button button-dark"
            disabled={busy || !autosave.ready}
            onClick={() => void resetEditor()}
          >
            {t("Nueva propiedad")}
          </button>
        </div>
      )}
      {shared && !editorOpen && storageError && (
        <p className="listing-error" role="alert">
          {t(storageError)}
        </p>
      )}
      {shared && !editorOpen && message && <p role="status">{t(message)}</p>}
      {!loaded ? (
        <p role="status">{t("Leyendo borradores…")}</p>
      ) : drafts.length === 0 ? (
        <p className="listing-empty">
          {t(
            shared
              ? "Todavía no hay borradores en el servidor privado."
              : "Todavía no has guardado borradores en este navegador.",
          )}
        </p>
      ) : visibleDrafts.length === 0 ? (
        <p>{t("No hay propiedades con esos filtros.")}</p>
      ) : (
        visibleDrafts.map((draft) => (
          <article
            key={draft.id}
            id={`draft-${draft.id}`}
            tabIndex={-1}
            className="draft-card"
          >
            <div className="draft-card-heading">
              <div>
                <span className="draft-status">
                  {t(
                    shared
                      ? "publishedRevision" in draft && draft.publishedRevision
                        ? draft.publishedRevision === revisionOf(draft)
                          ? "Publicado"
                          : "Publicado · Cambios pendientes de publicar"
                        : "Borrador privado · No publicado"
                      : "Borrador local · No publicado",
                  )}
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
                {shared && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void openSavedReview(draft)}
                    >
                      {t(
                        "publishedRevision" in draft && draft.publishedRevision
                          ? "Actualizar publicación"
                          : "Publicar propiedad",
                      )}
                    </button>
                    {"publishedRevision" in draft &&
                      !!draft.publishedRevision && (
                        <>
                          <Link
                            href={`/propiedades/anuncio-${draft.id}`}
                            target="_blank"
                            rel="noopener"
                          >
                            {t("Ver publicación")}
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void publish(draft, false)}
                          >
                            {t("Retirar publicación")}
                          </button>
                        </>
                      )}
                  </>
                )}
                {!shared && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void copyToPrivate(draft as ListingDraft)}
                  >
                    {t("Copiar al área privada")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void openSavedReview(draft)}
                >
                  {t("Revisar anuncio guardado")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void beginEdit(draft)}
                >
                  {t("Editar borrador")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void download(draft)}
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
            {copied === draft.id && (
              <p role="status">
                {t(
                  "Copia guardada en el servidor privado. El original sigue en este navegador.",
                )}{" "}
                <Link href="/privado">{t("Ver área privada")}</Link>
              </p>
            )}
            {copyError?.id === draft.id && (
              <p className="listing-error" role="alert">
                {t(copyError.message)}{" "}
                <Link href="/privado" target="_blank" rel="noopener">
                  {t("Abrir área privada")}
                </Link>
              </p>
            )}
            {shared && (
              <p className="dashboard-meta">
                {t("{photos} fotos · {scenes} escenas 360", {
                  photos: draft.photos.length,
                  scenes: draft.scenes.length,
                })}
              </p>
            )}
            {shared &&
              draft.photos[0] &&
              ("url" in draft.photos[0] ? (
                <img
                  className="dashboard-cover"
                  src={draft.photos[0].url}
                  alt={draft.title}
                  loading="lazy"
                />
              ) : (
                <div className="dashboard-cover">
                  <PhotoPreview photo={draft.photos[0]} label={draft.title} />
                </div>
              ))}
            <details
              className="draft-details"
              open={shared ? undefined : true}
              onToggle={(event) => {
                const open = event.currentTarget.open;
                if (shared)
                  setExpandedDrafts((previous) => {
                    const next = new Set(previous);
                    if (open) next.add(draft.id);
                    else next.delete(draft.id);
                    return next;
                  });
                if (
                  shared &&
                  event.currentTarget.open &&
                  draft.photos[0] &&
                  "url" in draft.photos[0]
                )
                  void expand(draft);
              }}
            >
              <summary hidden={!shared}>
                {shared ? t("Ver detalles y medios") : null}
              </summary>
              {(!shared || expandedDrafts.has(draft.id)) && (
                <>
                  {loadingMediaId === draft.id && (
                    <p role="status">{t("Cargando fotos y escenas…")}</p>
                  )}
                  <p>
                    {draft.city}, {draft.state} · {draft.neighborhood}
                  </p>
                  {draft.migrationNote && (
                    <p className="listing-help">{t(draft.migrationNote)}</p>
                  )}
                  <p className="draft-description">{draft.description}</p>
                  <TermsDetails terms={draft} />
                  <VisitAccessDetails access={draft.visitAccess} />

                  <div className="draft-photo-grid">
                    {draft.photos
                      .filter((photo): photo is DraftPhoto => "blob" in photo)
                      .map((photo, i) => (
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
                    <DraftTourSavedPreview
                      scenes={draft.scenes.filter(
                        (scene): scene is DraftScene => "blob" in scene,
                      )}
                      shared={shared}
                    />
                  )}
                  <p className="draft-no-tour">
                    {draft.propertyType === "Terreno"
                      ? t("Terreno: ficha y fotografías, sin recorrido 360.")
                      : draft.scenes.length
                        ? t(
                            shared
                              ? "Vista del recorrido guardado. Publica o actualiza la publicación para compartirlo."
                              : "Recorrido 360 local con conexiones manuales; no publicado.",
                          )
                        : t(
                            "Galería de fotos normales. Este borrador no tiene recorrido 360.",
                          )}
                  </p>
                </>
              )}
            </details>
          </article>
        ))
      )}
    </section>
  );
  return (
    <div className="listing-workspace">
      <div className="listing-local-notice">
        <strong>
          {t(
            shared
              ? "Borradores privados · Guardados en el servidor"
              : "Borradores locales · No publicados",
          )}
        </strong>
        <p>
          {t(
            shared
              ? "Estos borradores e imágenes se comparten entre tus dispositivos al iniciar sesión en esta misma dirección. Solo aparecen en el catálogo si publicas una propiedad. Conserva respaldos del servidor."
              : "Se guardan solo en este navegador y dispositivo. No aparecen en el catálogo público ni se comparten con otras personas. Al borrar los datos del navegador puedes perderlos; descarga un respaldo para conservarlos.",
          )}
        </p>
        {!shared && (
          <>
            <p>
              {t(
                "Estos borradores locales no se sincronizan. Para verlos en tu otro dispositivo, copia cada uno al área privada.",
              )}
            </p>
            <Link
              href="/privado"
              target="_blank"
              rel="noopener"
              className="back-link"
            >
              {t("Abrir área privada para compartir entre dispositivos")}
            </Link>
          </>
        )}
        {shared && (
          <button
            type="button"
            className="button button-dark"
            disabled={busy || !loaded}
            onClick={() => void refreshShared()}
          >
            {t("Actualizar lista privada")}
          </button>
        )}
      </div>
      {review && (
        <ListingReviewDialog
          key={review.nonce}
          draft={review.draft}
          saved={review.saved}
          server={shared}
          revision={review.revision}
          busy={busy}
          error={reviewError}
          onClose={() => setReview(null)}
          onEdit={() => {
            const source = review;
            setReview(null);
            if (source.saved || source.draft.id !== "captura")
              void beginEdit(source.draft);
          }}
          onPublish={
            shared && review.saved
              ? () => publish(review.draft, true)
              : undefined
          }
          onReload={
            shared && review.saved
              ? () => openSavedReview(review.draft)
              : undefined
          }
        />
      )}
      {shared && savedSection}
      <ListingBackupTools
        scope={storage}
        current={editorOpen ? content : undefined}
        disabled={busy}
        onBusyChange={setBusy}
        onRestored={autosave.reload}
      />
      {backupError && (
        <p className="listing-error" role="alert">
          {t(backupError)}
        </p>
      )}
      {(!shared ||
        editorOpen ||
        autosave.captures.length > 0 ||
        autosave.error) && (
        <section
          id="capture-recovery"
          className="capture-recovery"
          aria-label={t("Capturas en este dispositivo")}
        >
          <h2>{t("Capturas en este dispositivo")}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => void autosave.reload()}
          >
            {t("Actualizar capturas del dispositivo")}
          </button>
          <p className="listing-help">
            {t(
              "El guardado automático conserva campos incompletos, fotos y escenas en este navegador, incluso tras cerrar sesión. No los envía ni publica. En un dispositivo compartido descarta las capturas al terminar.",
            )}
          </p>
          {autosave.error && (
            <p className="capture-error" role="alert">
              {t(autosave.error)}{" "}
              <button type="button" onClick={() => void autosave.flush()}>
                {t("Reintentar guardado automático")}
              </button>{" "}
              {autosave.conflict && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void forkCapture()}
                >
                  {t("Guardar copia de recuperación")}
                </button>
              )}
            </p>
          )}
          {autosave.captures.map((row) => (
            <div className="capture-recovery-row" key={row.id}>
              <div>
                <strong>{row.title || t("Captura sin título")}</strong>
                <p>{t("Solo en este dispositivo · Pendiente de confirmar")}</p>
                <time dateTime={row.updatedAt}>
                  {t("Guardada en el dispositivo: {when}", {
                    when: new Intl.DateTimeFormat(
                      locale === "en" ? "en-US" : "es-MX",
                      { dateStyle: "short", timeStyle: "short" },
                    ).format(new Date(row.updatedAt)),
                  })}
                </time>
                <small>
                  {t("{photos} fotos · {scenes} escenas 360", {
                    photos: row.photos,
                    scenes: row.scenes,
                  })}
                </small>
              </div>
              <button
                type="button"
                disabled={busy || (editorOpen && autosave.activeId === row.id)}
                onClick={() => void recoverCapture(row.id)}
              >
                {t("Continuar captura")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void downloadRecovery(row.id)}
              >
                {t("Descargar captura")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void discardCapture(row)}
              >
                {t("Descartar captura local")}
              </button>
            </div>
          ))}
          {autosave.ready &&
            !autosave.error &&
            autosave.captures.length === 0 && (
              <p className="listing-help">
                {t("No hay capturas pendientes en este navegador.")}
              </p>
            )}
        </section>
      )}
      {editorOpen && (
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
          <div
            className="capture-save-state"
            data-save-state={autosave.status}
            role="status"
          >
            {t(
              autosave.status === "confirmed"
                ? shared
                  ? "Confirmado en el servidor"
                  : "Borrador confirmado en este navegador"
                : autosave.status === "device"
                  ? shared
                    ? "Guardado en este dispositivo · Pendiente de enviar al servidor"
                    : "Guardado automático en este navegador · Pendiente de confirmar borrador"
                  : autosave.status === "saving"
                    ? "Guardando en este dispositivo…"
                    : autosave.status === "waiting"
                      ? "Cambios pendientes de guardar automáticamente"
                      : autosave.status === "error"
                        ? "Guardado automático con error"
                        : "Guardado automático listo",
            )}
          </div>
          {!online && (
            <p className="capture-network">
              {t(
                "Sin conexión. Puedes seguir capturando en esta pantalla; el servidor no ha recibido estos cambios.",
              )}
            </p>
          )}
          {shared && (
            <button
              className="button button-dark"
              type="button"
              disabled={busy}
              onClick={() => void closeEditor()}
            >
              {t("Volver a mis propiedades")}
            </button>
          )}
          {editing && (
            <div className="listing-local-notice">
              <strong>
                {t("Editando: {title}", { title: editing.title })}
              </strong>
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
                <span id={`${fieldId("operation")}-label`}>
                  {t("Operación")}
                </span>
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
                  onChange={(event) =>
                    change("propertyType", event.target.value)
                  }
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
            <h2>{t("Ubicación privada y pública")}</h2>
            <p className="listing-help">
              {t(
                "El punto inicial es el centro de León: ajústalo a tu inmueble. Guarda el punto privado y elige por separado qué precisión tendrá el anuncio público. Usa solo referencias autorizadas en la colonia y la descripción.",
              )}
            </p>
            <div className="listing-field-grid">
              {field("state", "Estado")}
              {field("city", "Ciudad / municipio")}
              {field("neighborhood", "Colonia / zona")}
              {field("latitude", "Latitud del punto privado", "number")}
              {field("longitude", "Longitud del punto privado", "number")}
            </div>
            <LocationPicker
              visitAccess={visitAccess}
              onVisitAccess={(value) => {
                if (busy) return;
                setVisitAccess(value);
                setMessage("");
                setSavedId(null);
              }}
              accessError={errors.visitAccess}
              accessFieldId={fieldId("visitAccess")}
              point={{
                lat: Number(values.latitude),
                lng: Number(values.longitude),
              }}
              onChange={(point) => {
                if (busy) return;
                setValues((previous) => ({
                  ...previous,
                  latitude: String(point.lat),
                  longitude: String(point.lng),
                }));
                setLocationReviewed(false);
                setMessage("");
                setSavedId(null);
              }}
              precision={publicLocation}
              onPrecision={(value) => {
                setPublicLocation(value);
                setLocationReviewed(false);
                setMessage("");
                setSavedId(null);
              }}
              reviewed={locationReviewed}
              onReviewed={(value) => {
                setLocationReviewed(value);
                setMessage("");
                setSavedId(null);
              }}
            />
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
                  shared={shared}
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
                onChange={(event) =>
                  change("imageRights", event.target.checked)
                }
                aria-describedby={
                  errors.imageRights ? "error-rights" : undefined
                }
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
            <button
              type="button"
              className="button button-dark"
              disabled={busy}
              onClick={openCaptureReview}
            >
              {t("Revisar captura actual")}
            </button>
            <button type="submit" className="button button-dark">
              {busy
                ? t("Preparando…")
                : editing
                  ? t("Guardar cambios del borrador")
                  : t(
                      shared
                        ? "Guardar borrador privado"
                        : "Guardar borrador en este navegador",
                    )}
            </button>
          </fieldset>
        </form>
      )}
      {!shared && savedSection}
    </div>
  );
}
