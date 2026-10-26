import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Home View · Tu próximo hogar, desde aquí",
    template: "%s · Home View",
  },
  description:
    "Explora propiedades de demostración en recorridos virtuales 360. Prototipo con datos e imágenes ficticias.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
