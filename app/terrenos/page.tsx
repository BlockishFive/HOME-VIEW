import { CatalogPage } from "@/components/CatalogPage";
export const metadata = { title: "Terrenos" };
export default function Land() {
  return (
    <CatalogPage
      title="Espacio para tus próximos planes."
      description="Terrenos con ubicación e imágenes, sin recorrido 360."
      type="Terreno"
    />
  );
}
