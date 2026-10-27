import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/components/I18nProvider";
import { PwaInstall } from "@/components/PwaInstall";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Home View · Tu próximo hogar, desde aquí",
    template: "%s · Home View",
  },
  description:
    "Explora propiedades de demostración en recorridos virtuales 360. Prototipo con datos e imágenes ficticias.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Home View",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#141614" };
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <I18nProvider>
          {children}
          <PwaInstall />
        </I18nProvider>
      </body>
    </html>
  );
}
