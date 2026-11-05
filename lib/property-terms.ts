import { translate, type Locale } from "./i18n";
/** Explicit operation terms. Unknown values are never interpreted as zero or consent. */
export type Maintenance = {
  status: "yes" | "no" | "unknown";
  amount: number | null;
  included: "yes" | "no" | "unknown";
};
export type Community = "condominium" | "gated" | "neither" | "unknown";
export type RentalTerms = {
  monthlyRent: number | null;
  deposit: number | null;
  minimumMonths: number | null;
  guarantee: "independent" | "either" | "unknown";
  guarantor: "required" | "not-required" | "unknown";
  legalPolicy: "required" | "not-required" | "unknown";
  pets: "yes" | "no" | "conditional" | "unknown";
  furnished: "yes" | "no" | "partial" | "unknown";
  services: Record<
    "water" | "electricity" | "gas" | "internet",
    "included" | "excluded" | "unknown"
  >;
};
export type SaleTerms = {
  purchasePrice: number | null;
  annualTax: number | null;
};
export function defaultMaintenance(): Maintenance {
  return { status: "unknown", amount: null, included: "unknown" };
}
export function defaultRentalTerms(): RentalTerms {
  return {
    monthlyRent: null,
    deposit: null,
    minimumMonths: null,
    guarantee: "unknown",
    guarantor: "unknown",
    legalPolicy: "unknown",
    pets: "unknown",
    furnished: "unknown",
    services: {
      water: "unknown",
      electricity: "unknown",
      gas: "unknown",
      internet: "unknown",
    },
  };
}
export function formatMXN(value: number, locale: Locale = "es") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
const knownAmount = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;
export function maintenanceLabel(
  maintenance: Maintenance,
  rental = false,
  locale: Locale = "es",
): string {
  const t = (message: string, params?: Record<string, string | number>) =>
    translate(locale, message, params);
  if (maintenance.status === "no") return t("No aplica");
  if (maintenance.status === "unknown") return t("Por confirmar");
  const amount = knownAmount(maintenance.amount)
    ? t("{amount} MXN/mes", { amount: formatMXN(maintenance.amount, locale) })
    : t("Monto por confirmar");
  if (!rental) return amount;
  return `${amount} · ${t(maintenance.included === "yes" ? "Incluido en la renta" : maintenance.included === "no" ? "Adicional a la renta" : "Inclusión en renta por confirmar")}`;
}
/** Only sum a confirmed separate fee; an included fee must not be counted twice. */
export function rentalMonthlyTotal(
  rental: RentalTerms,
  maintenance: Maintenance,
): number | null {
  if (
    !knownAmount(rental.monthlyRent) ||
    maintenance.status !== "yes" ||
    !knownAmount(maintenance.amount) ||
    maintenance.included === "unknown"
  )
    return null;
  const rentCents = Math.round(rental.monthlyRent * 100);
  const feeCents = Math.round(maintenance.amount * 100);
  return (
    (maintenance.included === "yes" ? rentCents : rentCents + feeCents) / 100
  );
}
export function rentalSummary(
  rental: RentalTerms,
  maintenance: Maintenance,
  locale: Locale = "es",
): string {
  const t = (message: string, params?: Record<string, string | number>) =>
    translate(locale, message, params);
  const rent = knownAmount(rental.monthlyRent)
    ? t("{amount} MXN/mes", { amount: formatMXN(rental.monthlyRent, locale) })
    : t("Renta por confirmar");
  if (maintenance.status === "no")
    return t("{rent} · Mantenimiento no aplica.", { rent });
  if (maintenance.status === "unknown")
    return t("{rent} · Mantenimiento por confirmar.", { rent });
  if (maintenance.included === "yes")
    return t("{rent} · Mantenimiento incluido.", { rent });
  if (
    maintenance.included === "no" &&
    knownAmount(maintenance.amount) &&
    knownAmount(rental.monthlyRent)
  )
    return t("{rent} de renta + {maintenance} de mantenimiento.", {
      rent: formatMXN(rental.monthlyRent, locale),
      maintenance: formatMXN(maintenance.amount, locale),
    });
  return t("{rent} · Mantenimiento: {maintenance}.", {
    rent,
    maintenance: maintenanceLabel(maintenance, true, locale),
  });
}
export function communityLabel(
  community: Community,
  locale: Locale = "es",
): string {
  return translate(
    locale,
    {
      condominium: "Condominio",
      gated: "Fraccionamiento",
      neither: "No pertenece a fraccionamiento ni condominio",
      unknown: "Por confirmar",
    }[community],
  );
}
export function rentalFacts(
  rental: RentalTerms,
  locale: Locale = "es",
): [string, string][] {
  const t = (message: string, params?: Record<string, string | number>) =>
    translate(locale, message, params);
  const requirement = (value: RentalTerms["guarantor"]) =>
    t(
      {
        required: "Requerido",
        "not-required": "No requerido",
        unknown: "Por confirmar",
      }[value],
    );
  const facts: [string, string][] = [
    [
      t("Depósito"),
      knownAmount(rental.deposit)
        ? `${formatMXN(rental.deposit, locale)} MXN`
        : t("Por confirmar"),
    ],
    [
      t("Plazo mínimo"),
      rental.minimumMonths === null
        ? t("Por confirmar")
        : t("{count} meses", { count: rental.minimumMonths }),
    ],
  ];
  if (rental.guarantee === "either")
    facts.push([t("Garantía"), t("Aval o póliza jurídica (alternativas)")]);
  else {
    facts.push([
      t("Requisitos"),
      t(
        rental.guarantee === "independent"
          ? "Independientes"
          : "Relación entre requisitos por confirmar",
      ),
    ]);
    facts.push(
      [t("Aval"), requirement(rental.guarantor)],
      [t("Póliza jurídica"), requirement(rental.legalPolicy)],
    );
  }
  facts.push(
    [
      t("Mascotas"),
      t(
        {
          yes: "Permitidas",
          no: "No permitidas",
          conditional: "Sujetas a condiciones",
          unknown: "Por confirmar",
        }[rental.pets],
      ),
    ],
    [
      t("Amueblado"),
      t(
        {
          yes: "Sí",
          no: "No",
          partial: "Parcialmente",
          unknown: "Por confirmar",
        }[rental.furnished],
      ),
    ],
  );
  const serviceLabels = {
    water: "Agua",
    electricity: "Electricidad",
    gas: "Gas",
    internet: "Internet",
  };
  for (const key of Object.keys(
    serviceLabels,
  ) as (keyof RentalTerms["services"])[]) {
    facts.push([
      t(serviceLabels[key]),
      t(
        {
          included: "Incluido en la renta",
          excluded: "No incluido en la renta",
          unknown: "Por confirmar",
        }[rental.services[key]],
      ),
    ]);
  }
  return facts;
}
