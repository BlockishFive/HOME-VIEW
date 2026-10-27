import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Home View · Piloto privado",
    short_name: "Home View",
    description:
      "Catálogo de demostración y captura privada compartida entre tus dispositivos.",
    lang: "es-MX",
    start_url: "/privado",
    scope: "/",
    display: "standalone",
    background_color: "#141614",
    theme_color: "#141614",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
