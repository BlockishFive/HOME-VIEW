import { CatalogPage } from "@/components/CatalogPage";
import { properties } from "@/lib/properties";
import { publishedProperties } from "@/lib/server/publications";
export const dynamic = "force-dynamic";
export const metadata = { title: "Propiedades en venta" };
export default function Sales() {
  return (
    <CatalogPage properties={[...publishedProperties(), ...properties]}
      title="Un nuevo lugar para empezar."
      description="Casas, departamentos y terrenos en venta, junto con ejemplos de demostración."
      operation="Venta"
    />
  );
}
