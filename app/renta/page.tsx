import { CatalogPage } from "@/components/CatalogPage";
import { properties } from "@/lib/properties";
import { publishedProperties } from "@/lib/server/publications";
export const dynamic = "force-dynamic";
export const metadata = { title: "Propiedades en renta" };
export default function Rentals() {
  return (
    <CatalogPage properties={[...publishedProperties(), ...properties]}
      title="Tu siguiente hogar, en renta."
      description="Explora propiedades en renta y ejemplos de demostración. Precios por mes en MXN."
      operation="Renta"
    />
  );
}
