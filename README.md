# Home View

> HOME-VIEW · Project Design for Real Estate Services

Prototipo en español para venta y renta de casas, departamentos y terrenos. Incluye cinco fichas ficticias, mapa geográfico Leaflet/OpenStreetMap con vistas de México, Guanajuato y León, galería ampliable, datos de predial y costos, compartir e imprimir. Las tres viviendas originales tienen recorridos 360 con Marzipano. La casa en renta de demostración utiliza una galería convencional; los terrenos no ofrecen 360.

`/alta` permite preparar una ficha con tus propias fotos autorizadas y guardarla como borrador solo en este navegador. No hay cuentas, pagos, envío de contactos ni publicación de los borradores en un catálogo compartido.

## Ejecutar localmente

Requisitos: Node.js 24 LTS y npm 11 (versiones utilizadas en desarrollo). No se necesitan claves ni variables de entorno. El mapa solicita imágenes al servidor público de OpenStreetMap desde el navegador; el catálogo y los borradores pueden usarse aunque esa conexión falle.

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

1. Filtra por ubicación, tipo o presupuesto. Selecciona un marcador para ver su resumen o abre una tarjeta del catálogo. El mapa se puede arrastrar, acercar y restablecer; usa cartografía real y posiciones ficticias aproximadas en León. Los botones León, Guanajuato y México cambian su alcance. No calcula rutas ni pide tu ubicación GPS.
2. Abre una imagen de la galería para ampliarla; navega con las flechas y cierra con Escape. Los accesos Resumen, Recorrido 360°, Ubicación y Costos permiten recorrer la ficha. Compartir usa las capacidades del navegador o muestra un enlace para copiar manualmente; Imprimir abre la impresión del navegador.
3. Cuando el inmueble ofrece un recorrido 360, arrastra el panorama con ratón o pantalla táctil. También puedes usar los botones de dirección y zoom, alcanzables con Tab y activables con Enter.
4. Cambia de habitación mediante los hotspots, el plano o la lista inferior. El plano y la lista permiten navegar aunque WebGL no esté disponible.
5. “Solicitar visita” abre un aviso explícito: no guarda datos ni envía una solicitud real.

Los navegadores necesitan WebGL para el visor. Si falla, se muestra un mensaje y las alternativas de selección de habitaciones continúan disponibles. Pantalla completa depende de las capacidades y permisos del navegador.

## Datos e imágenes

En el catálogo incluido, los anuncios, precios, direcciones, posiciones de marcadores, prediales, cuotas y características son ficticios. La cartografía de OpenStreetMap representa geografía real. Los datos y las fotos que añadas a un borrador local son los que tú proporciones. Los importes fiscales carecen de validez oficial. Las viviendas originales con 360 reutilizan una distribución genérica de tres habitaciones para mostrar la funcionalidad: las imágenes y el plano no corresponden a superficies o características reales.

Los JPEG locales son ilustraciones originales generadas mediante trazado de rayos procedural; no se usan fotografías ajenas, APIs de imágenes ni fuentes remotas. Véase [procedencia de medios](docs/MEDIA.md). No son representaciones fotorrealistas de inmuebles reales.

## Preparar tu casa en renta

1. Abre **Alta de inmueble** (`/alta`). Se inicia con Renta, Casa, Guanajuato y León.
2. Completa título, mensualidad en MXN, superficie, descripción y colonia. Recámaras, baños, predial y mantenimiento pueden dejarse sin especificar; no se inventan montos.
3. Ajusta latitud/longitud a una ubicación aproximada de tu zona. La referencia inicial es el centro de León; no indica tu domicilio.
4. Selecciona entre 1 y 8 fotos JPEG/PNG/WebP de hasta 5 MB cada una. Convierte HEIC previamente. El navegador las decodifica, reduce a un máximo de 1920 px y reencoda como JPEG sin los metadatos originales. Las fotos normales no se convierten en panoramas 360.
5. Confirma que tienes autorización para usar las imágenes y guarda el borrador. Sigue siendo local, no publicado y accesible a quien use ese navegador. Usa **Descargar respaldo** para conservar una copia JSON con fotos; la importación de respaldos aún está pendiente.

Los borradores se almacenan en IndexedDB, no se suben al servidor y no aparecen en otros dispositivos ni en el catálogo público. Pueden perderse al borrar datos del navegador o cambiar de dirección/origen del sitio. Antes de publicar inmuebles reales se necesita backend, control de acceso y almacenamiento compartido.

## Servicios y costos

No se integraron servicios con claves de pago. Las bibliotecas son de código abierto; el mapa usa las teselas comunitarias de OpenStreetMap, sujetas a política de uso y sin garantía de disponibilidad o capacidad ilimitada. Hosting, dominios y Codespaces tienen límites y pueden generar costos. Consulta [servicios y costos](docs/SERVICES.md).

Las pruebas de navegador interceptan el transporte de teselas para probar controles y errores de forma repetible sin cargar los servidores públicos. Esto no valida la conectividad real con OpenStreetMap, que se comprueba por separado.

## Documentación

- [Arquitectura y decisiones](docs/ARCHITECTURE.md)
- [Servicios, costos y límites](docs/SERVICES.md)
- [Pendientes de seguridad y producción](docs/SECURITY.md)
- [Medios y regeneración](docs/MEDIA.md)

Los comandos de instalación y arranque no publican código ni despliegan la aplicación. Para actualizar un Codespace desde GitHub, guarda primero tus cambios locales y luego ejecuta `git pull origin main`, `npm ci` y `npm run dev`.

## Si el mapa no carga en Codespaces

Actualiza el repositorio y reinicia `npm run dev`. La configuración detecta el nombre del Codespace y autoriza únicamente su hostname de vista previa para el puerto de desarrollo; no habilita todos los Codespaces. Si usas otro puerto, defínelo con `PORT` antes de arrancar.

Si se ven los botones y marcadores pero las imágenes dicen **403 / Access blocked**, el visor sí inició: el rechazo viene del proveedor cartográfico. Las teselas llevan `referrerPolicy: strict-origin-when-cross-origin` para que OpenStreetMap reciba el origen real del sitio, incluso cuando la página tenga una política de referencia restrictiva. No se envían la ruta ni los parámetros de la página. Tras actualizar, recarga la pestaña del prototipo con Ctrl+Shift+R para evitar conservar imágenes antiguas de error.

El botón **Actualizar cartografía** solicita otra vez las imágenes visibles. En fallos de conexión se ofrece también **Volver a cargar mapa** y un enlace para consultar la zona en OpenStreetMap. No hay reintentos automáticos continuos, proxies ni cambio a servidores alternativos para evitar restricciones. Si persiste un rechazo del proveedor, comprobar su respuesta y los encabezados desde el navegador real antes de atribuirlo al código o elegir otro servicio.

La autorización de red de este entorno de desarrollo es independiente de las políticas de OpenStreetMap y de la conexión del navegador que abre tu Codespace.
