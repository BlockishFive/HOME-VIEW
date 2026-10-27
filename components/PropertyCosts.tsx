"use client";
import { useI18n } from "./I18nProvider";
import { type Property } from "@/lib/properties";
import {
  communityLabel,
  formatMXN,
  maintenanceLabel,
  rentalFacts,
  rentalMonthlyTotal,
  rentalSummary,
  type Community,
  type Maintenance,
  type RentalTerms,
  type SaleTerms,
} from "@/lib/property-terms";

type Terms = { maintenance: Maintenance; community: Community } & (
  | { operation: "Renta"; rental: RentalTerms }
  | { operation: "Venta"; sale: SaleTerms }
);
/** Shared by the public demo and the local draft preview. */
export function TermsDetails({
  terms,
  demo = false,
}: {
  terms: Terms;
  demo?: boolean;
}) {
  const { locale, t } = useI18n();
  const facts: [string, string][] =
    terms.operation === "Renta"
      ? [
          [
            "Renta mensual",
            terms.rental.monthlyRent === null
              ? "Por confirmar"
              : t("{amount} MXN/mes", {
                  amount: formatMXN(terms.rental.monthlyRent, locale),
                }),
          ],
          ...rentalFacts(terms.rental, locale),
        ]
      : [
          [
            "Precio de compra",
            terms.sale.purchasePrice === null
              ? "Por confirmar"
              : `${formatMXN(terms.sale.purchasePrice, locale)} MXN`,
          ],
          [
            "Predial anual estimado",
            terms.sale.annualTax === null
              ? "Por confirmar"
              : t("{amount} MXN / año", {
                  amount: formatMXN(terms.sale.annualTax, locale),
                }),
          ],
        ];
  facts.push([
    "Mantenimiento mensual",
    maintenanceLabel(terms.maintenance, terms.operation === "Renta", locale),
  ]);
  facts.push([
    "Fraccionamiento o condominio",
    communityLabel(terms.community, locale),
  ]);
  const monthlyTotal =
    terms.operation === "Renta"
      ? rentalMonthlyTotal(terms.rental, terms.maintenance)
      : null;
  return (
    <div className="cost-card terms-card">
      <span className="cost-icon" aria-hidden="true">
        $
      </span>
      <h3>
        {terms.operation === "Renta"
          ? t("Renta, condiciones y servicios")
          : t("Compra y gastos recurrentes")}
      </h3>
      {terms.operation === "Renta" && (
        <p>{rentalSummary(terms.rental, terms.maintenance, locale)}</p>
      )}
      <dl>
        {facts.map(([label, value], index) => (
          <div key={label} className={index === 0 ? "terms-price" : undefined}>
            <dt>{t(label)}</dt>
            <dd>{t(value)}</dd>
          </div>
        ))}
        {monthlyTotal !== null && (
          <div className="terms-total">
            <dt>{t("Renta y mantenimiento")}</dt>
            <dd>
              {formatMXN(monthlyTotal, locale)}
              {t("/mes")}
            </dd>
          </div>
        )}
      </dl>
      <p className="cost-note">
        {demo && `${t("Cifras ficticias, sin validez fiscal.")} `}
        {terms.operation === "Renta"
          ? t(
              "La suma de renta y mantenimiento excluye servicios, depósito y póliza. Confirma las condiciones en el contrato. Los datos por confirmar no se consideran cero.",
            )
          : t(
              "Confirma cuotas con la administración, predial y adeudos con la autoridad municipal. No incluye gastos notariales ni impuestos de adquisición.",
            )}
      </p>
    </div>
  );
}
export function PropertyCosts({ property }: { property: Property }) {
  const { locale, t } = useI18n();
  return (
    <section
      id="costos"
      className="property-costs"
      aria-labelledby="costs-title"
      tabIndex={-1}
    >
      <div>
        <p className="eyebrow">{t("INFORMACIÓN PARA TOMAR PERSPECTIVA")}</p>
        <h2 id="costs-title">
          {property.operation === "Renta"
            ? t("Tu renta, con claridad.")
            : t("Más allá del precio.")}
        </h2>
        <p className="muted">
          {property.operation === "Renta"
            ? t(
                "Consulta la mensualidad, los requisitos y los servicios antes de dar el siguiente paso.",
              )
            : t(
                "Conoce los gastos recurrentes de este inmueble de demostración antes de dar el siguiente paso.",
              )}
        </p>
        <p className="demo-note">
          {t(
            "Importes ficticios en pesos mexicanos, sin validez fiscal. Este prototipo no calcula créditos ni recibe pagos.",
          )}
        </p>
      </div>
      <TermsDetails terms={property} demo />
    </section>
  );
}
