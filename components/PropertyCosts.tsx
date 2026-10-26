import { formatMXN, type Property } from "@/lib/properties";
export function PropertyCosts({ property }: { property: Property }) {
  return (
    <section
      id="costos"
      className="property-costs"
      aria-labelledby="costs-title"
      tabIndex={-1}
    >
      <div>
        <p className="eyebrow">INFORMACIÓN PARA TOMAR PERSPECTIVA</p>
        <h2 id="costs-title">Más allá del precio.</h2>
        <p className="muted">
          Conoce los gastos recurrentes de este inmueble de demostración antes
          de dar el siguiente paso.
        </p>
        <p className="demo-note">
          Todos los montos están expresados en pesos mexicanos. Este prototipo
          no calcula créditos ni recibe pagos.
        </p>
      </div>
      <div className="cost-card">
        <span className="cost-icon" aria-hidden="true">
          $
        </span>
        <h3>Costos para tener en cuenta</h3>
        <p>Importes ilustrativos en pesos mexicanos.</p>
        <dl>
          <div>
            <dt>Predial anual estimado</dt>
            <dd>
              {formatMXN(property.annualTax)} <small>MXN / año</small>
            </dd>
          </div>
          <div>
            <dt>Mantenimiento mensual</dt>
            <dd>
              {formatMXN(property.monthlyMaintenance)} <small>MXN / mes</small>
            </dd>
          </div>
        </dl>
        <p className="cost-note">
          Cifras ficticias, sin validez fiscal. En una operación real, confirma
          predial y adeudos con la autoridad municipal, y cuotas con la
          administración. No incluyen gastos notariales ni impuestos de
          adquisición.
        </p>
      </div>
    </section>
  );
}
