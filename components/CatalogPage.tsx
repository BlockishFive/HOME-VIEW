import Link from "next/link";
import { Header } from "./Header";
import { PropertyExplorer } from "./PropertyExplorer";
import { properties } from "@/lib/properties";
export function CatalogPage({
  title,
  description,
  operation = "Todas",
  type = "Todos",
}: {
  title: string;
  description: string;
  operation?: string;
  type?: string;
}) {
  return (
    <>
      <Header />
      <main className="section-wrap catalog-page">
        <Link href="/" className="back-link">
          ← Inicio
        </Link>
        <div className="section-heading">
          <div>
            <p className="eyebrow">MÉXICO · GUANAJUATO · LEÓN</p>
            <h1>{title}</h1>
          </div>
          <p>{description}</p>
        </div>
        <PropertyExplorer
          properties={properties}
          initialOperation={operation}
          initialType={type}
        />
      </main>
      <footer className="site-footer">
        <span className="brand">homeview.</span>
        <span>Propiedades de demostración · Sin ofertas reales</span>
      </footer>
    </>
  );
}
