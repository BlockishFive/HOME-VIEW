import { CatalogPage } from "@/components/CatalogPage";
export const metadata = { title: "Propiedades en renta" };
export default function Rentals() {
  return (
    <CatalogPage
      title="Tu siguiente hogar, en renta."
      description="Explora nuestra primera casa de demostración en León. Precios por mes en MXN."
      operation="Renta"
    />
  );
}
