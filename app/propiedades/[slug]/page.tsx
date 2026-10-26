import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PropertyGallery } from "@/components/PropertyGallery";
import { PropertyActions } from "@/components/PropertyActions";
import { PropertySectionNav } from "@/components/PropertySectionNav";
import { PropertyCosts } from "@/components/PropertyCosts";
import { PropertyDetails } from "@/components/PropertyDetails";
import { PropertyLocation } from "@/components/PropertyLocation";
import { PropertyTour } from "@/components/PropertyTour";
import { getProperty, properties } from "@/lib/properties";
export function generateStaticParams() {
  return properties.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: getProperty(slug)?.title ?? "Propiedad no encontrada" };
}
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();
  return (
    <>
      <Header />
      <main className="section-wrap property-page">
        <Link href="/#propiedades" className="back-link">
          ← Volver al catálogo
        </Link>
        <div className="property-heading">
          <div>
            <p className="eyebrow">
              RECORRIDO VIRTUAL · PROPIEDAD DE DEMOSTRACIÓN
            </p>
            <h1>{property.title}</h1>
            <p className="muted">
              {property.address}
              <br />
              {property.location}
            </p>
          </div>
          <div className="detail-facts">
            <span>
              <strong>{property.area}</strong> m²
            </span>
            <span>
              <strong>{property.beds}</strong> recámaras
            </span>
            <span>
              <strong>{property.baths}</strong> baños
            </span>
          </div>
        </div>
        <div className="property-toolbar">
          <div className="property-asking-price">
            <span>PRECIO DE VENTA · DEMO</span>
            <strong>
              {property.price}
              <small> MXN</small>
            </strong>
          </div>
          <PropertyActions title={property.title} />
        </div>
        <PropertyGallery title={property.title} images={property.gallery} />
        <PropertySectionNav />
        <PropertyDetails property={property} />
        <PropertyTour property={property} />
        <PropertyLocation property={property} />
        <PropertyCosts property={property} />
      </main>
      <footer className="site-footer">
        <Link href="/" className="brand">
          homeview.
        </Link>
        <span>Explora sin prisa. Imagina sin límites.</span>
        <span>Datos e imágenes ficticias · Demo</span>
      </footer>
    </>
  );
}
