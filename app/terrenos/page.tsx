import { CatalogPage } from "@/components/CatalogPage";
import { properties } from "@/lib/properties";
import { publishedProperties } from "@/lib/server/publications";
export const dynamic = "force-dynamic";
export const metadata = { title: "Terrenos" };
export default function Land() {
  return (
    <CatalogPage properties={[...publishedProperties(), ...properties]}
      title="Espacio para tus próximos planes."
      description="Terrenos con ubicación e imágenes, sin recorrido 360."
      type="Terreno"
    />
  );
}
