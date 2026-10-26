import { CatalogPage } from "@/components/CatalogPage";
export const metadata = { title: "Propiedades en venta" };
export default function Sales() {
  return (
    <CatalogPage
      title="Un nuevo lugar para empezar."
      description="Casas, departamentos y terrenos en venta de demostración."
      operation="Venta"
    />
  );
}
