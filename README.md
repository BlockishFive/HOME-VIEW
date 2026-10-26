# Home View

> HOME-VIEW · Project Design for Real Estate Services

Prototipo en español para venta y renta de casas, departamentos y terrenos. Incluye cinco fichas ficticias, mapa vectorial propio MapLibre/PMTiles con vistas de referencia de México, Guanajuato y León, galería ampliable, datos de predial y costos, compartir e imprimir. Las tres viviendas originales tienen recorridos 360 con Marzipano. La casa en renta de demostración utiliza una galería convencional; los terrenos no ofrecen 360.

`/alta` permite preparar una ficha con tus propias fotos autorizadas y guardarla como borrador solo en este navegador. No hay cuentas, pagos, envío de contactos ni publicación de los borradores en un catálogo compartido.

## Ejecutar localmente

Requisitos: Node.js 24 LTS y npm 11 (versiones utilizadas en desarrollo). No se necesitan claves ni variables de entorno. El mapa incluido se sirve desde este mismo sitio; no necesita conexión a un proveedor cartográfico ni claves de API.

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

1. Filtra por ubicación, tipo o presupuesto. Selecciona un marcador para ver su resumen o abre una tarjeta del catálogo. El mapa se puede arrastrar, acercar y restablecer; usa cartografía de referencia real y posiciones ficticias aproximadas en León. Los botones León, Guanajuato y México cambian su alcance. No calcula rutas ni pide tu ubicación GPS.
2. Abre una imagen de la galería para ampliarla; navega con las flechas y cierra con Escape. Los accesos Resumen, Recorrido 360°, Ubicación y Costos permiten recorrer la ficha. Compartir usa las capacidades del navegador o muestra un enlace para copiar manualmente; Imprimir abre la impresión del navegador.
3. Cuando el inmueble ofrece un recorrido 360, arrastra el panorama con ratón o pantalla táctil. También puedes usar los botones de dirección y zoom, alcanzables con Tab y activables con Enter.
4. Cambia de habitación mediante los hotspots, el plano o la lista inferior. El plano y la lista permiten navegar aunque WebGL no esté disponible.
5. “Solicitar visita” abre un aviso explícito: no guarda datos ni envía una solicitud real.

Los navegadores necesitan WebGL para el visor. Si falla, se muestra un mensaje y las alternativas de selección de habitaciones continúan disponibles. Pantalla completa depende de las capacidades y permisos del navegador.

## Datos e imágenes

En el catálogo incluido, los anuncios, precios, direcciones, posiciones de marcadores, prediales, cuotas y características son ficticios. La cartografía Natural Earth representa geografía real generalizada, no un callejero completo. Los datos y las fotos que añadas a un borrador local son los que tú proporciones. Los importes fiscales carecen de validez oficial. Las viviendas originales con 360 reutilizan una distribución genérica de tres habitaciones para mostrar la funcionalidad: las imágenes y el plano no corresponden a superficies o características reales.

Los JPEG locales son ilustraciones originales generadas mediante trazado de rayos procedural; no se usan fotografías ajenas, APIs de imágenes ni fuentes remotas. Véase [procedencia de medios](docs/MEDIA.md). No son representaciones fotorrealistas de inmuebles reales.

## Preparar tu casa en renta

1. Abre **Alta de inmueble** (`/alta`). Se inicia con Renta, Casa, Guanajuato y León.
2. Completa título, mensualidad en MXN, superficie, descripción y colonia. Recámaras, baños, predial y mantenimiento pueden dejarse sin especificar; no se inventan montos.
3. Ajusta latitud/longitud a una ubicación aproximada de tu zona. La referencia inicial es el centro de León; no indica tu domicilio.
4. Selecciona entre 1 y 8 fotos JPEG/PNG/WebP de hasta 5 MB cada una. Convierte HEIC previamente. El navegador las decodifica, reduce a un máximo de 1920 px y reencoda como JPEG sin los metadatos originales. Las fotos normales no se convierten en panoramas 360.
5. Confirma que tienes autorización para usar las imágenes y guarda el borrador. Sigue siendo local, no publicado y accesible a quien use ese navegador. Usa **Descargar respaldo** para conservar una copia JSON con fotos; la importación de respaldos aún está pendiente.

Los borradores se almacenan en IndexedDB, no se suben al servidor y no aparecen en otros dispositivos ni en el catálogo público. Pueden perderse al borrar datos del navegador o cambiar de dirección/origen del sitio. Antes de publicar inmuebles reales se necesita backend, control de acceso y almacenamiento compartido.

## Servicios y costos

No se integraron servicios con claves de pago. Las bibliotecas son de código abierto; el mapa utiliza un archivo PMTiles local de 304 KB, sin proveedor externo de teselas. El visor se descarga por separado y se conserva en caché. Hosting, dominios y Codespaces tienen límites y pueden generar costos. Consulta [servicios y costos](docs/SERVICES.md).

Las pruebas de navegador usan el archivo PMTiles real, comprueban HTTP206/Range y verifican que el mapa no hace solicitudes HTTP a servicios externos.

## Documentación

- [Arquitectura y decisiones](docs/ARCHITECTURE.md)
- [Servicios, costos y límites](docs/SERVICES.md)
- [Datos del mapa y regeneración](docs/MAP_DATA.md)
- [Pendientes de seguridad y producción](docs/SECURITY.md)
- [Medios y regeneración](docs/MEDIA.md)

Los comandos de instalación y arranque no publican código ni despliegan la aplicación. Para actualizar un Codespace desde GitHub, guarda primero tus cambios locales y luego ejecuta `git pull origin main`, `npm ci` y `npm run dev`.

## Mapa propio y cobertura

El archivo publicado `public/maps/home-view.pmtiles` pesa304,117 bytes (aproximadamente 297 KiB), con 478 fragmentos y compresión gzip. Es el tamaño de los datos geográficos, no de toda la aplicación. MapLibre y PMTiles se cargan al iniciar el visor.

La cobertura es progresiva: México en niveles 3–7, Guanajuato en 8–10 y la zona de León en 11–14. Los niveles de contexto se conservan al acercar. Son límites, huellas urbanas y vías principales de Natural Earth (dominio público). **No están todas las calles, colonias, edificios o números de domicilio de León**; no sirve para calcular rutas ni acreditar límites de terrenos. Hace falta un extracto detallado autorizado de OSM/INEGI para ampliar ese nivel de cobertura.

Para regenerar o ampliar el paquete consulta [datos y generación](docs/MAP_DATA.md). El archivo ya viene incluido: no necesitas Python para ejecutar Home View. El alojamiento debe respetar solicitudes HTTP Range y responder 206 para descargar fragmentos. Next.js lo hace en la configuración probada.

Si el mapa no carga, usa **Actualizar cartografía**. Ante un fallo del archivo o de WebGL se muestra un aviso y la lista continúa disponible. En Codespaces reinicia el servidor después de cambiar la configuración y recarga la pestaña. Ya no se solicitan imágenes al servidor público de OpenStreetMap.
