# Home View

> HOME-VIEW · Project Design for Real Estate Services

Prototipo web en español para explorar inmuebles ficticios mediante recorridos 360. Incluye galería ampliable con navegación por teclado, resumen del inmueble, compartir e imprimir, catálogo de tres propiedades, mapa urbano ficticio interactivo con filtros, fichas con predial anual y mantenimiento en MXN, navegación entre tres habitaciones con Marzipano, hotspots, plano esquemático, controles accesibles y solicitud de visita de demostración. No incluye cuentas, pagos, reservas reales ni backend de contactos.

## Ejecutar localmente

Requisitos: Node.js 24 LTS y npm 11 (versiones utilizadas en desarrollo). No se necesitan claves, servicios externos ni variables de entorno.

```sh
npm ci
npm run dev
```

Abre el puerto 3000 en tu navegador local. En un entorno donde el directorio personal no sea escribible, utiliza `npm ci --cache /workspace/.cache/npm`.

```sh
npm test                # integridad del catálogo, grafo de habitaciones y medios
npm run typecheck       # TypeScript
npm run build           # compilación de producción
npm run start           # servir la compilación en puerto 3000
```

Pruebas de navegador (compilar antes; se puede reutilizar un servidor de producción en puerto 3000):

```sh
npx playwright install chromium
npx playwright test
```

Si Chromium ya está instalado, puedes evitar la descarga con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test` (comando verificado en este entorno).

En Linux, Playwright puede requerir sus dependencias del sistema (`npx playwright install --with-deps chromium`). En la nube usa `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` al instalar y ejecutar si el directorio personal no es escribible.

## Uso

1. Filtra por ubicación, tipo o presupuesto. Selecciona un marcador para ver su resumen o abre una tarjeta del catálogo. El mapa se puede arrastrar, acercar y restablecer; es un esquema de ciudad ficticia, sin rutas ni geolocalización real.
2. Abre una imagen de la galería para ampliarla; navega con las flechas y cierra con Escape. Los accesos Resumen, Recorrido 360°, Ubicación y Costos permiten recorrer la ficha. Compartir usa las capacidades del navegador o muestra un enlace para copiar manualmente; Imprimir abre la impresión del navegador.
3. Arrastra el panorama con ratón o pantalla táctil. También puedes usar los botones de dirección y zoom, alcanzables con Tab y activables con Enter.
4. Cambia de habitación mediante los hotspots, el plano o la lista inferior. El plano y la lista permiten navegar aunque WebGL no esté disponible.
5. “Solicitar visita” abre un aviso explícito: no guarda datos ni envía una solicitud real.

Los navegadores necesitan WebGL para el visor. Si falla, se muestra un mensaje y las alternativas de selección de habitaciones continúan disponibles. Pantalla completa depende de las capacidades y permisos del navegador.

## Datos e imágenes

Todos los nombres, precios, direcciones, posiciones en el mapa, prediales, cuotas y características son ficticios. Los importes fiscales carecen de validez oficial. Las tres propiedades reutilizan una distribución genérica de tres habitaciones para mostrar la funcionalidad: las imágenes y el plano no corresponden a superficies o características reales.

Los JPEG locales son ilustraciones originales generadas mediante trazado de rayos procedural; no se usan fotografías ajenas, APIs de imágenes ni fuentes remotas. Véase [procedencia de medios](docs/MEDIA.md). No son representaciones fotorrealistas de inmuebles reales.

## Documentación

- [Arquitectura y decisiones](docs/ARCHITECTURE.md)
- [Pendientes de seguridad y producción](docs/SECURITY.md)
- [Medios y regeneración](docs/MEDIA.md)

Los archivos están preparados en el checkout; los comandos de instalación y arranque no publican el código en GitHub ni despliegan la aplicación.
