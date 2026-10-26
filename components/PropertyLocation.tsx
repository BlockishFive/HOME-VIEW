"use client";
import type { Property } from "@/lib/properties";
import { PropertyMap } from "./PropertyMap";
export function PropertyLocation({ property }: { property: Property }) {
  return (
    <section
      id="ubicacion"
      className="location-section"
      aria-labelledby="location-title"
      tabIndex={-1}
    >
      <div>
        <p className="eyebrow">EL ENTORNO TAMBIÉN ES HOGAR</p>
        <h2 id="location-title">Ubica tu próximo espacio.</h2>
        <p>{property.address}</p>
        <strong>{property.location}</strong>
        <p className="demo-note">
          Cartografía vectorial de referencia de Natural Earth. El marcador de
          esta ficha es una ubicación aproximada ficticia en León, Guanajuato;
          no identifica una propiedad real ni sus límites.
        </p>
      </div>
      <PropertyMap
        properties={[property]}
        selected={property.slug}
        onSelect={() => {}}
      />
    </section>
  );
}
