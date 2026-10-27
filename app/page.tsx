"use client";
import { useI18n, usePageTitle } from "@/components/I18nProvider";
import { ArrowIcon } from "@/components/ArrowIcon";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PropertyExplorer } from "@/components/PropertyExplorer";
import { properties } from "@/lib/properties";
export default function Home() {
  const { t } = useI18n();
  usePageTitle("Home View · Tu próximo hogar, desde aquí", "Explora propiedades de demostración en recorridos virtuales 360. Prototipo con datos e imágenes ficticias.");
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-line" />
              {t("TU PRÓXIMO ESPACIO EMPIEZA AQUÍ")}
            </p>
            <h1>
              {t("Tu próximo hogar.")}
              <br />
              <em>{t("Desde otra perspectiva.")}</em>
            </h1>
            <p className="hero-description">
              {t(
                "Abre la puerta sin salir de donde estás. Recorre cada espacio, descubre sus detalles e imagina tu vida ahí.",
              )}
            </p>
            <Link href="#propiedades" className="button button-dark">
              {t("Explorar el mapa")}{" "}
              <span aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
            <div className="hero-meta">
              <span className="circle-icon">360°</span>
              <span>
                {t("Recorridos inmersivos.")}
                <br />
                <strong>{t("A tu ritmo, desde cualquier lugar.")}</strong>
              </span>
            </div>
          </div>
          <div className="hero-image">
            <Image
              src="/panoramas/sala-cover.jpg"
              alt={t(
                "Interior ficticio con sofá verde, ventanales y acabados cálidos",
              )}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
            />
            <span className="hero-image-tag">
              {t("ESPACIOS QUE SE SIENTEN COMO HOGAR")}
            </span>
            <Link
              href="/propiedades/casa-jardin-renta"
              className="hero-feature"
            >
              <span>
                <small>{t("DESCUBRE POR DENTRO")}</small>
                <strong>{t("Casa Jardín en renta")}</strong>
                <span>{t("León, Guanajuato · $18,500 MXN / mes · Demo")}</span>
              </span>
              <span className="feature-play" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        </section>
        <section className="catalog section-wrap" id="propiedades">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t("EXPLORA. DESCUBRE. IMAGINA.")}</p>
              <h2>{t("Un espacio para cada historia.")}</h2>
            </div>
            <p>
              {t("Tu próxima dirección empieza")}
              <br />
              {t("con una nueva perspectiva.")}
            </p>
          </div>
          <PropertyExplorer properties={properties} />
        </section>
        <section className="steps section-wrap">
          <p className="eyebrow">{t("ASÍ DE SENCILLO")}</p>
          <h2>{t("Visítalo antes de visitarlo.")}</h2>
          <div className="steps-grid">
            {[
              [
                "01",
                "Elige un espacio",
                "Encuentra una propiedad que despierte tu curiosidad.",
              ],
              [
                "02",
                "Mira a tu alrededor",
                "Arrastra la vista y cambia de habitación con los puntos interactivos.",
              ],
              [
                "03",
                "Da el siguiente paso",
                "Prueba la solicitud de visita en esta demostración.",
              ],
            ].map(([n, title, body]) => (
              <div key={n}>
                <span className="step-number">{n}</span>
                <h3>{t(title)}</h3>
                <p>{t(body)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span className="brand">{t("homeview.")}</span>
        <span>{t("Una nueva perspectiva de tu próximo hogar.")}</span>
        <span>{t("Prototipo · Sin ofertas comerciales reales")}</span>
      </footer>
    </>
  );
}
