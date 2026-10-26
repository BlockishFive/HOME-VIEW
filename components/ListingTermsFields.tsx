"use client";
import type {
  Community,
  Maintenance,
  RentalTerms,
  SaleTerms,
} from "@/lib/property-terms";
export function ListingTermsFields({
  operation,
  rental,
  sale,
  maintenance,
  community,
  onRental,
  onSale,
  onMaintenance,
  onCommunity,
  errors,
  fieldId,
}: {
  fieldId: (name: string) => string;
  operation: "Renta" | "Venta";
  rental: RentalTerms;
  sale: SaleTerms;
  maintenance: Maintenance;
  community: Community;
  onRental: (value: RentalTerms) => void;
  onSale: (value: SaleTerms) => void;
  onMaintenance: (value: Maintenance) => void;
  onCommunity: (value: Community) => void;
  errors: Record<string, string>;
}) {
  function select<T extends string>(
    key: string,
    label: string,
    value: T,
    options: [T, string][],
    change: (value: T) => void,
  ) {
    return (
      <label className="listing-field">
        <span id={`${fieldId(key)}-label`}>{label}</span>
        <select
          id={fieldId(key)}
          name={key}
          aria-labelledby={`${fieldId(key)}-label`}
          value={value}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${fieldId(key)}-error` : undefined}
          onChange={(e) => change(e.target.value as T)}
        >
          {options.map(([v, text]) => (
            <option key={v} value={v}>
              {text}
            </option>
          ))}
        </select>
        {errors[key] && (
          <small id={`${fieldId(key)}-error`} className="listing-field-error">
            {errors[key]}
          </small>
        )}
      </label>
    );
  }
  function amount(
    key: string,
    label: string,
    value: number | null,
    change: (value: number | null) => void,
  ) {
    return (
      <label className="listing-field">
        <span id={`${fieldId(key)}-label`}>{label}</span>
        <input
          id={fieldId(key)}
          name={key}
          aria-labelledby={`${fieldId(key)}-label`}
          type="number"
          min={key === "minimumMonths" ? 1 : 0}
          step={key === "minimumMonths" ? 1 : "0.01"}
          value={value ?? ""}
          placeholder="Por confirmar"
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${fieldId(key)}-error` : undefined}
          onChange={(e) =>
            change(e.target.value === "" ? null : Number(e.target.value))
          }
        />
        {errors[key] && (
          <small id={`${fieldId(key)}-error`} className="listing-field-error">
            {errors[key]}
          </small>
        )}
      </label>
    );
  }
  const yesNo: ["yes" | "no" | "unknown", string][] = [
    ["unknown", "Por confirmar"],
    ["yes", "Sí"],
    ["no", "No"],
  ];
  const requirement: [RentalTerms["guarantor"], string][] = [
    ["unknown", "Por confirmar"],
    ["required", "Requerido"],
    ["not-required", "No requerido"],
  ];
  return (
    <>
      <h2>
        {operation === "Renta"
          ? "Condiciones de renta"
          : "Condiciones de venta"}
      </h2>
      <p className="listing-help">
        Deja por confirmar lo que aún no conozcas. Ningún dato pendiente se
        interpreta como cero o como una autorización.
      </p>
      <div className="listing-field-grid">
        {operation === "Venta" ? (
          amount(
            "annualTax",
            "Predial anual (MXN, opcional)",
            sale.annualTax,
            (v) => onSale({ ...sale, annualTax: v }),
          )
        ) : (
          <>
            {amount("deposit", "Depósito (MXN)", rental.deposit, (v) =>
              onRental({ ...rental, deposit: v }),
            )}
            {amount(
              "minimumMonths",
              "Plazo mínimo (meses)",
              rental.minimumMonths,
              (v) => onRental({ ...rental, minimumMonths: v }),
            )}
            {select(
              "guarantee",
              "Relación entre aval y póliza jurídica",
              rental.guarantee,
              [
                ["unknown", "Por confirmar"],
                ["either", "Aval o póliza (alternativas)"],
                ["independent", "Requisitos independientes"],
              ],
              (v) => onRental({ ...rental, guarantee: v }),
            )}
            {rental.guarantee !== "either" && (
              <>
                {select(
                  "guarantor",
                  "Aval",
                  rental.guarantor,
                  requirement,
                  (v) => onRental({ ...rental, guarantor: v }),
                )}
                {select(
                  "legalPolicy",
                  "Póliza jurídica",
                  rental.legalPolicy,
                  requirement,
                  (v) => onRental({ ...rental, legalPolicy: v }),
                )}
              </>
            )}
            {select(
              "pets",
              "Mascotas",
              rental.pets,
              [
                ["unknown", "Por confirmar"],
                ["yes", "Permitidas"],
                ["no", "No permitidas"],
                ["conditional", "Sujetas a condiciones"],
              ],
              (v) => onRental({ ...rental, pets: v }),
            )}
            {select(
              "furnished",
              "Amueblado",
              rental.furnished,
              [
                ["unknown", "Por confirmar"],
                ["yes", "Sí"],
                ["no", "No"],
                ["partial", "Parcialmente"],
              ],
              (v) => onRental({ ...rental, furnished: v }),
            )}
            {(
              [
                ["water", "Agua"],
                ["electricity", "Electricidad"],
                ["gas", "Gas"],
                ["internet", "Internet"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                {select(
                  key,
                  `${label} en la renta`,
                  rental.services[key],
                  [
                    ["unknown", "Por confirmar"],
                    ["included", "Incluido"],
                    ["excluded", "No incluido"],
                  ],
                  (v) =>
                    onRental({
                      ...rental,
                      services: { ...rental.services, [key]: v },
                    }),
                )}
              </div>
            ))}
          </>
        )}
      </div>
      <h2>Mantenimiento y conjunto</h2>
      <div className="listing-field-grid">
        {select(
          "community",
          "¿Pertenece a fraccionamiento o condominio?",
          community,
          [
            ["unknown", "Por confirmar"],
            ["gated", "Fraccionamiento"],
            ["condominium", "Condominio"],
            ["neither", "No pertenece"],
          ],
          onCommunity,
        )}
        {select(
          "maintenanceStatus",
          "¿Existe cuota de mantenimiento?",
          maintenance.status,
          [
            ["unknown", "Por confirmar"],
            ["yes", "Sí"],
            ["no", "No aplica"],
          ],
          (v) => onMaintenance({ ...maintenance, status: v }),
        )}
        {maintenance.status === "yes" && (
          <>
            {amount(
              "maintenanceAmount",
              "Mantenimiento mensual (MXN)",
              maintenance.amount,
              (v) => onMaintenance({ ...maintenance, amount: v }),
            )}
            {operation === "Renta" &&
              select(
                "maintenanceIncluded",
                "¿La renta anunciada incluye mantenimiento?",
                maintenance.included,
                yesNo,
                (v) => onMaintenance({ ...maintenance, included: v }),
              )}
          </>
        )}
      </div>
      <p className="listing-help">
        La suma mensual solo considera renta y una cuota conocida. Excluye
        servicios, depósito y póliza jurídica. Una cuota incluida nunca se suma
        dos veces.
      </p>
    </>
  );
}
