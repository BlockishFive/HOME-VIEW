import { ArrowIcon } from "@/components/ArrowIcon";
import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/properties";
export function PropertyCard({ property }: { property: Property }) {
  return (
    <Link href={`/propiedades/${property.slug}`} className="property-card">
      <div className="card-image">
        <Image
          src={property.cover}
          alt={`Ilustración sintética del interior de ${property.title}`}
          fill
          sizes="(max-width: 700px) 100vw, 33vw"
        />
        <span className="image-label">↻ Recorrido 360°</span>
        <span className="card-arrow" aria-hidden="true">
          <ArrowIcon />
        </span>
      </div>
      <div className="card-body">
        <p className="eyebrow">{property.tag}</p>
        <div className="card-title">
          <h3>{property.title}</h3>
          <span>
            {property.price}
            <small> MXN</small>
          </span>
        </div>
        <p className="muted location">{property.location}</p>
        <div className="card-facts">
          <span>{property.area} m²</span>
          <span>{property.beds} recámaras</span>
          <span>{property.baths} baños</span>
        </div>
      </div>
    </Link>
  );
}
