import { ArrowIcon } from "@/components/ArrowIcon";
import Link from "next/link";
import { Header } from "@/components/Header";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="section-wrap missing">
        <p className="eyebrow">404 · ESPACIO NO ENCONTRADO</p>
        <h1>Esta puerta no lleva a ningún lugar.</h1>
        <p>
          La propiedad que buscas no está en nuestro catálogo de demostración.
        </p>
        <Link href="/" className="button button-dark">
          Explorar propiedades <ArrowIcon />
        </Link>
      </main>
    </>
  );
}
