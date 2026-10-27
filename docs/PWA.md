# Piloto móvil instalable

La PWA tiene manifest (`app/manifest.ts`), iconos PNG originales de 192 y 512 px, icono maskable con margen seguro e icono Apple de 180 px. Abre el panel local de `/alta#saved-title` en modo standalone. El diseño conserva negro y verde; no hay cuentas ni pagos.

En producción (`npm run build` y `npm run start`) el componente `PwaInstall` registra `/sw.js` en un contexto seguro. Chrome y Edge pueden ofrecer el botón **Instalar Home View**; Safari en iPhone/iPad utiliza Compartir → Añadir a pantalla de inicio. El sitio debe servirse por HTTPS; localhost permite probar sin certificado. No se promete que todos los navegadores muestren un aviso automático. No se registran service workers nuevos desde `npm run dev`.

## Alcance sin conexión

Este piloto es instalable, pero todavía necesita conexión para abrir las pantallas de Next.js. El service worker usa la red para navegaciones y, si falla, muestra `public/offline.html`. Guarda en Cache Storage **únicamente** ese aviso y dos iconos públicos. No guarda HTML de catálogo o editor, respuestas API, fotos de usuarios, panoramas locales, blobs ni fragmentos Range del mapa. No cambia el funcionamiento de MapLibre/PMTiles.

Los borradores y sus medios permanecen en IndexedDB, solo en ese navegador y origen. El service worker no los lee ni transmite. Instalar la aplicación no los sincroniza; cambiar dominio, navegador, perfil o dispositivo crea otro almacenamiento. Borrar los datos del sitio elimina los borradores. Si la página del editor ya está abierta podría seguir guardando localmente sin red, pero no se garantiza recargar o navegar sin conexión.

Antes de ofrecer edición sin conexión completa se necesita una estrategia versionada para el shell y sus módulos, migraciones compatibles, actualizaciones y pruebas con varios tabs. Antes de incorporar almacenamiento compartido se requieren autenticación y autorización del lado servidor, controles sobre medios y backups, límites de uso y revisión de qué puede almacenarse en caché. No cachear rutas privadas futuras de forma indiscriminada.

## Verificar

```sh
node scripts/generate-pwa-icons.mjs  # regeneración determinista, sin dependencias
npm run build
npx playwright test tests/browser/pwa.spec.ts
```

La prueba comprueba manifest, iconos, registro, aviso offline y que Cache Storage solo contiene los recursos permitidos. La instalación real en un dispositivo iOS/Android y sus opciones del menú requieren validación manual; Playwright no representa la interfaz de instalación del sistema operativo.

## Idiomas

El selector de idioma usa el manifest español o `public/manifest-en.webmanifest` con el mismo ID y start_url. El aviso offline tiene español/inglés y conserva la preferencia del navegador. El worker v2 renueva su caché de aviso e iconos; no lee ni cachea borradores. La versión instalada del sistema operativo puede conservar su nombre hasta actualizar/reinstalar según el navegador. Véase [idiomas](I18N.md).
