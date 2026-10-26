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
export function formatMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
const knownAmount = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value >= 0;
export function maintenanceLabel(
  maintenance: Maintenance,
  rental = false,
): string {
  if (maintenance.status === "no") return "No aplica";
  if (maintenance.status === "unknown") return "Por confirmar";
  const amount = knownAmount(maintenance.amount)
    ? `${formatMXN(maintenance.amount)} MXN/mes`
    : "Monto por confirmar";
  if (!rental) return amount;
  return `${amount} · ${maintenance.included === "yes" ? "Incluido en la renta" : maintenance.included === "no" ? "Adicional a la renta" : "Inclusión en renta por confirmar"}`;
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
): string {
  const rent = knownAmount(rental.monthlyRent)
    ? `${formatMXN(rental.monthlyRent)} MXN/mes`
    : "Renta por confirmar";
  if (maintenance.status === "no") return `${rent} · Mantenimiento no aplica.`;
  if (maintenance.status === "unknown")
    return `${rent} · Mantenimiento por confirmar.`;
  if (maintenance.included === "yes")
    return `${rent} · Mantenimiento incluido.`;
  if (
    maintenance.included === "no" &&
    knownAmount(maintenance.amount) &&
    knownAmount(rental.monthlyRent)
  )
    return `${formatMXN(rental.monthlyRent)} de renta + ${formatMXN(maintenance.amount)} de mantenimiento.`;
  return `${rent} · Mantenimiento: ${maintenanceLabel(maintenance, true)}.`;
}
export function communityLabel(community: Community): string {
  return {
    condominium: "Condominio",
    gated: "Fraccionamiento",
    neither: "No pertenece a fraccionamiento ni condominio",
    unknown: "Por confirmar",
  }[community];
}
export function rentalFacts(rental: RentalTerms): [string, string][] {
  const requirement = (value: RentalTerms["guarantor"]) =>
    ({
      required: "Requerido",
      "not-required": "No requerido",
      unknown: "Por confirmar",
    })[value];
  const facts: [string, string][] = [
    [
      "Depósito",
      knownAmount(rental.deposit)
        ? `${formatMXN(rental.deposit)} MXN`
        : "Por confirmar",
    ],
    [
      "Plazo mínimo",
      rental.minimumMonths === null
        ? "Por confirmar"
        : `${rental.minimumMonths} meses`,
    ],
  ];
  if (rental.guarantee === "either")
    facts.push(["Garantía", "Aval o póliza jurídica (alternativas)"]);
  else {
    facts.push([
      "Requisitos",
      rental.guarantee === "independent"
        ? "Independientes"
        : "Relación entre requisitos por confirmar",
    ]);
    facts.push(
      ["Aval", requirement(rental.guarantor)],
      ["Póliza jurídica", requirement(rental.legalPolicy)],
    );
  }
  facts.push(
    [
      "Mascotas",
      {
        yes: "Permitidas",
        no: "No permitidas",
        conditional: "Sujetas a condiciones",
        unknown: "Por confirmar",
      }[rental.pets],
    ],
    [
      "Amueblado",
      {
        yes: "Sí",
        no: "No",
        partial: "Parcialmente",
        unknown: "Por confirmar",
      }[rental.furnished],
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
      serviceLabels[key],
      {
        included: "Incluido en la renta",
        excluded: "No incluido en la renta",
        unknown: "Por confirmar",
      }[rental.services[key]],
    ]);
  }
  return facts;
}
