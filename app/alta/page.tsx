import Link from "next/link";
import { Header } from "@/components/Header";
import { ListingForm } from "@/components/ListingForm";
export const metadata = {
  title: "Alta de inmueble · Borrador local",
  description:
    "Prepara una ficha de venta o renta con fotografías autorizadas. Guardado local en tu navegador, sin publicación automática.",
};
export default function ListingPage() {
  return (
    <>
      <Header />
      <main className="section-wrap listing-page">
        <Link href="/#propiedades" className="back-link">
          ← Volver al catálogo
        </Link>
        <div className="listing-heading">
          <p className="eyebrow">PREPARA TU PRIMER ANUNCIO</p>
          <h1>Un nuevo espacio comienza aquí.</h1>
          <p>
            Empieza con tu casa en renta en León, Guanajuato. Completa la
            información y añade tus fotos para preparar una ficha privada.
          </p>
        </div>
        <ListingForm />
      </main>
      <footer className="site-footer">
        <span className="brand">homeview.</span>
        <span>
          Preparación local · Sin cuentas, cobros ni publicación automática
        </span>
      </footer>
    </>
  );
}
