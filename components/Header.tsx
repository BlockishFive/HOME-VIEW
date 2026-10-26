import Link from "next/link";
export function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Home View, inicio">
        <span className="brand-mark" aria-hidden="true">
          ⌂
        </span>{" "}
        home<span className="brand-light">view</span>
        <span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/venta">Venta</Link>
        <Link href="/renta">Renta</Link>
        <Link href="/terrenos">Terrenos</Link>
        <Link href="/alta#saved-title">Mis borradores</Link>
        <Link href="/alta" className="header-add">
          Alta de inmueble
        </Link>
        <span className="demo-pill">Prototipo demo</span>
      </nav>
    </header>
  );
}
