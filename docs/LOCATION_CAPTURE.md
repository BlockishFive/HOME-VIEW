# Ubicación privada, mapas de calles y publicación

El piloto sigue funcionando en el Codespace existente. No necesita contratar servidor, crear otra cuenta, instalar una app ni agregar claves para estas funciones. Los servicios externos del piloto tienen límites y no ofrecen garantía de disponibilidad o cobertura completa.

## Capturar desde el iPad

1. Abre `/privado`, inicia sesión y crea o edita el borrador. Baja a **Ubicación privada y pública**.
2. Busca una calle, colonia o lugar junto con su ciudad, por ejemplo una referencia pública de Marroka en León. Solo **Buscar dirección** o Enter envía la consulta; escribir no envía solicitudes. La búsqueda requiere sesión privada, también si usas `/alta` en otra pestaña del mismo navegador. No envíes nombres de propietarios, teléfonos, números interiores ni información confidencial.
3. Elige un resultado. Si no aparece, no inventes uno: ajusta el punto manualmente, usando el mapa o las coordenadas.
4. **Activar calles · OpenStreetMap** carga una capa de calles. Antes del clic no se solicita cartografía externa. Se muestran atribución y aviso de envío de IP/área consultada al proveedor. Puedes volver a **Usar mapa local** conservando el punto. La referencia local no ofrece calles completas.
5. **Usar mi ubicación actual** pide permiso del navegador, solo una lectura y con tiempo máximo. Estando frente a la vivienda puede servir de referencia; no identifica por sí sola el inmueble. Requiere HTTPS (o localhost para desarrollo), dispositivo compatible y permiso de ubicación. Se muestra la precisión estimada; un error o denegación conserva el punto anterior. Una lectura tardía no reemplaza un ajuste manual posterior.
6. Toca el mapa o arrastra el marcador verde para corregir. También puedes escribir latitud/longitud. Los rangos admitidos son un rectángulo aproximado de México, no una certificación de municipio o límites.
7. Elige la precisión pública y marca **Revisé la ubicación y autorizo la precisión pública seleccionada**. Guardar conserva el punto privado y la elección. Cambiar coordenadas o precisión desmarca la revisión. Puedes guardar sin revisar, pero publicar requerirá revisión y nuevo guardado.
8. Publica o actualiza la publicación explícitamente. Abrir el catálogo en otro dispositivo requiere actualizarlo; no hay edición en tiempo real.

## Precisión pública

- **Zona aproximada**, por defecto: se publica el centro de una celda de 0.01 grados (aproximadamente 1 km en esta región). Es una zona orientativa, sin desplazamiento aleatorio. El punto privado no viaja al HTML/RSC del anuncio ni al mapa público.
- **Punto exacto**, opcional: requiere elegirlo explícitamente y revisar la autorización. Solo entonces el snapshot público contiene las coordenadas capturadas.
- La descripción, la colonia y las fotos también se publican: una precisión aproximada no oculta una dirección escrita, placas o referencias visibles en imágenes. No es una garantía de anonimato.
- El borrador local conserva el punto privado en IndexedDB. El compartido lo conserva en SQLite bajo sesión. Respaldos y exportaciones contienen los datos privados y deben protegerse.
- Borradores anteriores sin estos campos conservan su ubicación y se abren con precisión aproximada y revisión pendiente. No se inventa consentimiento. No se reescriben los originales al leer. Snapshots públicos antiguos sin precisión declarada se aproximan al servirlos, incluso antes de volver a guardar.

## Proveedores y límites del piloto

Las calles usan raster HTTPS de [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/), atribución visible y caché HTTP normal del navegador. Solo se solicitan teselas del viewport al activarlas; no hay descarga de ciudad, precarga masiva, scraping ni mapas offline externos. El mapa local PMTiles continúa disponible. No aplicar `no-referrer` ni desactivar la caché HTTP a estas solicitudes; `/privado` usa strict-origin-when-cross-origin para identificar el sitio sin enviar su ruta privada. La atribución identifica también los datos locales de Natural Earth cuando corresponde.

La búsqueda usa el servicio de demostración [Photon/Komoot](https://photon.komoot.io/), basado en datos OSM. Es apropiado solo para uso moderado del piloto; el proveedor puede limitarlo o suspenderlo. Se consulta desde el servidor, únicamente bajo sesión y origen válido, con User-Agent de Home View, un bloqueo global persistente entre workers, espera entre consultas, timeout de 8 s, respuesta máxima de 256 KB y caché privada de 24 h y hasta 200 resultados de consultas. No se envían al geocodificador las coordenadas GPS ni la ficha: solo el texto solicitado y una referencia fija a León. No se hacen consultas periódicas, autocomplete ni geocodificación inversa automática. Se descartan respuestas inválidas y resultados fuera de la cobertura; cuando existe código de país, se exige México.

`HOME_VIEW_GEOCODER_URL` permite cambiar el endpoint Photon-compatible por otro HTTPS sin modificar código. Es configuración del administrador, nunca un URL tomado del formulario; no admite credenciales en el URL, query ni redirecciones. Reiniciar Next.js después de cambiar `.env.local`. Ninguna clave privada debe enviarse al navegador. Para ampliar el uso, elegir proveedor contratado o instancia propia y revisar sus condiciones/atribución antes de reemplazar estos servicios comunitarios.

No se promete que Marroka, sus calles nuevas o sus accesos estén completos o actualizados en una fecha concreta. Comparar en el iPad con observación en campo. No hay navegación/rutas, límites catastrales, garantía de numeración, edificios 3D ni localización en segundo plano.

## Comprobación y límites de esta entrega

Pruebas automatizadas usan consultas y puntos ficticios, GPS simulado y teselas externas interceptadas. Verifican interacción, fallback, persistencia, exclusión del punto privado en el anuncio, precisión explícita, autorización y errores. No generan carga sobre servidores comunitarios. Se revisa la presentación a tamaño iPad y móvil.

La política de red del entorno de desarrollo del asistente rechaza con HTTP 403 las conexiones a tile.openstreetmap.org y photon.komoot.io; no se pudo verificar una respuesta real para Marroka. La documentación oficial de ambos proveedores sí se consultó. Probar cobertura y permisos GPS en Safari/iPad físico desde el Codespace habitual antes de la visita. Si su red también bloquea estos dominios, la app conserva el formulario y ofrece el mapa local/manual.

La cola de envíos offline, sincronización automática, alojamiento estable y conexión directa con cámara 360 siguen siendo trabajo posterior. Nada de esto requiere publicar ahora la página al internet abierto.
