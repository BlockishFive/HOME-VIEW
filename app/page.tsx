import { ArrowIcon } from "@/components/ArrowIcon";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PropertyExplorer } from "@/components/PropertyExplorer";
import { properties } from "@/lib/properties";
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-line" /> TU PRÓXIMO ESPACIO EMPIEZA AQUÍ
            </p>
            <h1>
              Tu próximo hogar.
              <br />
              <em>Desde otra perspectiva.</em>
            </h1>
            <p className="hero-description">
              Abre la puerta sin salir de donde estás. Recorre cada espacio,
              descubre sus detalles e imagina tu vida ahí.
            </p>
            <Link href="#propiedades" className="button button-dark">
              Explorar el mapa{" "}
              <span aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
            <div className="hero-meta">
              <span className="circle-icon">360°</span>
              <span>
                Recorridos inmersivos.
                <br />
                <strong>A tu ritmo, desde cualquier lugar.</strong>
              </span>
            </div>
          </div>
          <div className="hero-image">
            <Image
              src="/panoramas/sala-cover.jpg"
              alt="Interior ficticio con sofá verde, ventanales y acabados cálidos"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 55vw"
            />
            <span className="hero-image-tag">
              ESPACIOS QUE SE SIENTEN COMO HOGAR
            </span>
            <Link href="/propiedades/casa-oliva" className="hero-feature">
              <span>
                <small>DESCUBRE POR DENTRO</small>
                <strong>Casa Oliva</strong>
                <span>Distrito Jardín · 185 m² · Demo</span>
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
              <p className="eyebrow">EXPLORA. DESCUBRE. IMAGINA.</p>
              <h2>Un espacio para cada historia.</h2>
            </div>
            <p>
              Tu próxima dirección empieza
              <br />
              con una nueva perspectiva.
            </p>
          </div>
          <PropertyExplorer properties={properties} />
        </section>
        <section className="steps section-wrap">
          <p className="eyebrow">ASÍ DE SENCILLO</p>
          <h2>Visítalo antes de visitarlo.</h2>
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
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span className="brand">homeview.</span>
        <span>Una nueva perspectiva de tu próximo hogar.</span>
        <span>Prototipo · Sin ofertas comerciales reales</span>
      </footer>
    </>
  );
}
