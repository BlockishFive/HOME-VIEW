# Validación del piloto venta/renta

Comprobado el 26 de octubre de 2026 con Node.js 24.19.0, npm 11.9.0, Next.js 16.4.3 y Chromium del sistema (`/usr/bin/chromium`). Base revisada: `main` en `99ef514c69eb515d1a726e90bd318afec28e418f`. Se leyeron AGENTS.md, README y las guías instaladas de Next.js antes de modificar la aplicación.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| `npm ci --cache /workspace/.cache/npm` | Dependencias del lockfile instaladas |
| `npm test` | 26 pruebas aprobadas |
| `npm run typecheck` | Sin errores |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Compilación de producción y generación de las 14 páginas completadas |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium NEXT_TELEMETRY_DISABLED=1 npx playwright test --workers=2` | 27 pruebas aprobadas sobre servidor de producción |
| `npm audit --json` | 0 vulnerabilidades conocidas reportadas en esta ejecución |
| `git diff --check` | Sin errores de espacios |
| Revisión visual en viewport de 390 px | Formulario, costos y ficha de renta legibles y sin desbordamiento horizontal |

`NEXT_TELEMETRY_DISABLED=1` evita escrituras de configuración en el directorio personal de solo lectura de este entorno. Las comprobaciones de red/servidor requieren que el entorno permita conexiones de npm y loopback. El proyecto no incluye un script de lint independiente.

## Cobertura

- Catálogo, panel del mapa y ficha de renta sin predial; venta con precio de compra, predial y mantenimiento sin requisitos de arrendamiento.
- Cuota adicional de $900 sobre renta de $18,000 → total de $18,900. Cuota incluida → $18,000, sin duplicar. Importes o inclusión pendientes no generan total ni cero ficticio. Servicios, depósito y póliza quedan fuera de la suma. Los centavos se conservan.
- Requisitos independientes y aval o póliza como alternativas, mascotas, amueblado, cuatro servicios y pertenencia a conjunto con estado desconocido explícito.
- Formulario por operación, error con foco accesible, guardado/edición sobre un único ID, recarga, exportación de fotografías, eliminación y errores de almacenamiento/imágenes.
- Migración IndexedDB v1 no destructiva al leer: precio conservado, cuota con inclusión pendiente, requisitos no inferidos y guardado explícito en v2.
- Fotos normales separadas de panoramas, rechazo de proporciones incorrectas, dos escenas procedurales, conexión manual y ángulo persistido, visor Marzipano real, limpieza de conexiones al eliminar escena y apertura guardada bajo demanda.
- Manifest e iconos PNG, registro del worker, caché limitada y aviso sin conexión.
- Pruebas previas de galería, teclado, compartir/imprimir, 404, WebGL, filtros y mapa. El archivo PMTiles real conserva HTTP Range/206; no se sustituyó por cartografía simulada ni se añadieron peticiones a proveedores externos.

## Comprobaciones pendientes

No se comprobó la instalación desde la interfaz del sistema operativo en teléfonos físicos iOS/Android, el rendimiento en móviles de poca memoria ni el uso con lectores de pantalla reales. El viewport automatizado no sustituye esas pruebas. La auditoría de dependencias no equivale a una auditoría de seguridad.

No existe todavía backend ni acceso privado, almacenamiento compartido, sincronización, importación de respaldos, resolución de conflictos entre pestañas, panoramas multirresolución ni edición offline completa. Se conserva un aviso offline, no las pantallas completas de Next.js. Las fotos/panoramas de pruebas son ilustraciones procedurales del repositorio; no se añadieron datos de inmuebles o personas reales.

Antes de un uso compartido consultar [seguridad](SECURITY.md), [arquitectura](ARCHITECTURE.md) y [PWA](PWA.md). No se implementaron pagos ni registro público; este cambio no despliega ni publica los borradores.

## Ampliación: legibilidad e interfaz español/inglés

La rama incorpora textos secundarios de al menos 14 px, campos y descripciones de 16 px, controles táctiles y selector ES/EN persistente. Se verificaron 16 combinaciones de pantalla/ruta en español (1440, 1024, 768 y 390 px) y 8 en inglés (1024 y 390 px), sin desbordamiento horizontal en inicio, alta, renta y ficha. Los textos del propietario se conservan y los importes siguen en MXN.

Después de esta ampliación pasan TypeScript, compilación de producción y 32 pruebas unitarias. La suite de navegador tiene 33 casos: 31 pasaron en la ejecución conjunta; se corrigió una aserción que confundía el verbo inglés «Describe» con texto español y se repitió ese caso correctamente. La inicialización WebGL del recorrido excedió el límite de cinco segundos en esa ejecución concurrente y se comprobó además de forma aislada. Los nuevos casos cubren preferencia persistente, formulario sin pérdida de datos, valores canónicos, validación, moneda, manifest inglés y aviso offline bilingüe.

La prueba automatizada no acredita funcionamiento en un iPad físico ni elimina el pendiente de revisar Safari y lectores de pantalla. [Idiomas y límites de renderizado](I18N.md).

## Confirmación y conservación de la captura local

Se comprobó el guardado sin vaciar el formulario, confirmación visible junto al botón, enlace y foco al borrador guardado, actualización sobre un único ID y limpieza solo mediante acción explícita. Se añadió lectura de verificación posterior a la transacción. Los fallos simulados de escritura o lectura no borran campos ni fotografías; el reintento conserva la identidad.

La compilación de producción y TypeScript pasan, y las 32 pruebas unitarias siguen aprobadas. Una selección de 22 pruebas de navegador pasó: cuatro regresiones nuevas de guardado, más captura, idioma, migración, persistencia, exportación y escenas. La prueba con HTML modificado mediante atributos `__gcruniqueid` también permite guardar y recargar el registro; no identifica qué herramienta externa añadió los atributos en el navegador del usuario. No se ocultan avisos de hidratación con `suppressHydrationWarning`.

La ausencia de borradores de un iPad en una PC corresponde al almacenamiento local del piloto; no se implementó sincronización. No borrar datos del sitio para tratar de recuperar un borrador. Usar el mismo navegador, perfil y origen donde se capturó.

## Área privada y captura compartida

La rama añade una cuenta privada creada por terminal, API autenticada, SQLite persistente con medios en transacciones, copia explícita desde IndexedDB, revisión optimista, validación Sharp y respaldo consistente. No crea una cuenta real por defecto ni publica registros en el catálogo.

Comprobaciones finales: **38 unitarias aprobadas**, **41 pruebas de navegador aprobadas con un worker**, TypeScript y build de producción correctos; `npm audit` reporta 0 vulnerabilidades conocidas. Se amplió después la prueba de dos dispositivos para confirmar edición desde la PC, actualización de lista en el iPad y rechazo de su captura antigua; esa prueba focalizada también pasó.

La cobertura nueva verifica sesiones revocables/expiración y contraseñas con hash; límites de intentos; origen exacto, proxy de Codespaces y rechazo de forwarded-host arbitrario; bloqueo de API y medios sin sesión; cookies HttpOnly/SameSite; no-store; imágenes malformadas; registros/medios atómicos; revisiones antiguas y eliminación; copia local conservando original; fotos y panorama privados accesibles desde otra sesión; ausencia de datos privados en catálogo público. Los respaldos se comprobaron en una conexión SQLite separada. Se ejecutaron manualmente setup:private y backup:private con una cuenta y directorio ficticios aislados, confirmando contraseña sin eco.

Las regresiones ajustadas esperan confirmación de guardado/eliminación antes de recargar. El recorrido con varias cargas WebGL tiene un presupuesto total de 60 segundos. El manifest se renderiza desde React para evitar duplicados al cambiar idioma durante navegación; se conserva su URL. Las pruebas usan bases temporales y no reutilizan un servidor de datos reales.

Pendiente: Safari/iPad físicos, auditoría independiente, restauración operativa con backups externos y alojamiento Node.js permanente con disco persistente. La implementación funciona en un servidor único activo; no elimina la suspensión de Codespaces. Véase [configuración privada](PRIVATE_PILOT.md).

## Publicación explícita y panoramas del piloto

- `npm test`: 39 pruebas aprobadas, incluida publicación por lista de campos, aislamiento de medios, snapshot estable tras editar, revisión obsoleta y retirada/eliminación.
- Suite completa Playwright: 42 pruebas aprobadas (3 minutos), sobre base temporal y medios ficticios autorizados. Incluye publicar/cancelar/actualizar/retirar, catálogo de renta sin sesión, ficha con foto y Marzipano 360, borrador conservado, rechazo de acceso privado anónimo y mutaciones cross-origin/obsoletas.
- Compilación de producción y TypeScript aprobados. El catálogo y las fichas pasan a renderizado dinámico para reflejar las publicaciones. No se publica ni inspecciona material real del propietario durante las pruebas.
- Tras esa suite se restringe además el optimizador de imágenes a las dos carpetas estáticas de demo: evita una copia persistente alternativa de medios retirados. Se recompila y se vuelven a comprobar los recorridos, galerías y el flujo privado/publicación, incluida petición directa al optimizador y cambio de idioma sin traducir el título del anunciante.
- Los navegadores automatizados usan Chromium con dos contextos separados y tamaños de iPad/PC. Siguen pendientes Safari/iPad físico, transferencia desde una cámara real y auditoría independiente. La cámara debe exportar primero un JPEG equirectangular completo; no se implementa SDK/conexión directa.
- Los mapas conservan el archivo local actual: calles detalladas, búsqueda de direcciones y proveedor actualizado quedan pendientes, con criterios de integración en PUBLISHING.md. No se configura alojamiento permanente ni cuentas reales en este entorno.

## Captura de ubicación privada y calles opcionales

- `npm test`: **43 unitarias aprobadas**. Incluyen precisión aproximada/exacta, exclusión de campos privados, snapshots antiguos, rechazo de publicación sin revisión, parseo de resultados geográficos, caché y límite global de búsqueda, y recuperación de errores sin revelar detalles del proveedor.
- `npm run typecheck` y `NEXT_TELEMETRY_DISABLED=1 npm run build`: aprobados. Se recompila después de corregir el ciclo de vida del mapa al cambiar de fuente.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test --workers=1`: **46 pruebas aprobadas en la ejecución final completa (4.1 minutos)**. Se verifica buscar solo tras acción explícita, elegir resultado, tocar/arrastrar el punto, GPS con precisión simulada y permiso denegado, cambio de idioma, guardado/edición, revisión de precisión, publicación cuyo HTML no contiene el punto privado, API autenticada/origen, errores de red y fallback sin perder coordenadas.
- Las calles se prueban con PNG sintético generado por Sharp y rutas externas interceptadas: fallo/recuperación, zoom hasta 19 y marcadores de propiedades al cambiar de fuente. La suite detectó y corrigió un fallo de reinicialización que podía dejar esos marcadores ausentes. Cada publicación de prueba se retira para no alterar los casos que esperan solo las demos.
- Se revisó la captura a tamaño iPad (820×1180), sin desbordamiento horizontal. Las pruebas móviles existentes, el PMTiles local, renta/venta, borradores, idiomas, PWA y Marzipano siguen pasando. Los screenshots de prueba usan el directorio de salida de Playwright, sin rutas absolutas del entorno.
- **No verificado en vivo:** cobertura/numeración de Marroka, teselas reales ni respuesta real de Photon desde este entorno. Ambos hosts reciben rechazo HTTP 403 del proxy de red antes de llegar al proveedor. Se consultaron sus documentos oficiales; no se evadió el bloqueo ni se generó carga de teselas reales durante pruebas.
- **Pendiente físico/operativo:** Safari/iPad, GPS real y calidad de datos en campo, capacidad del servicio con más usuarios, proveedor con garantía acordada, cola offline y alojamiento persistente. Véase LOCATION_CAPTURE.md para instrucciones, privacidad y condiciones de OSM/Photon. No se contrataron servicios ni se desplegó una página pública.

## Versión vectorial OpenFreeMap con estilo Home View

- Se retira el raster público de OpenStreetMap que podía mostrar «Access blocked». La capa detallada usa el TileJSON oficial de OpenFreeMap, un estilo original de Home View y nombres dibujados con fuentes del dispositivo en MapLibre 6. No usa mapas de Google ni copia sus geometrías.
- **44 pruebas unitarias aprobadas**, incluida validación completa del estilo según MapLibre y ausencia de raster, sprites y fuentes remotas.
- **TypeScript y compilación de producción aprobados**. No se agregaron dependencias de producción, cuentas, claves ni servicios de pago.
- **6 pruebas dirigidas aprobadas**, después **48 pruebas de navegador aprobadas en la ejecución completa (5.5 minutos)**. Se comprueba MVT vectorial, nombres/estilo oscuro, créditos, ES/EN, cambio de fuente sin perder marcadores/vista, zoom, selección/GPS, privacidad, fallo 403 y recuperación al respaldo. Se mantienen catálogo, renta/venta, borradores, PWA, publicación y Marzipano.
- Los MVT de prueba se generan a partir de calles y edificios ficticios y nunca se incluyen en los datos de la aplicación. Todas las conexiones externas de estas pruebas se interceptan; no generan tráfico automatizado al proveedor real. La captura a tamaño iPad se revisó con etiquetas de texto locales y sin desbordamiento horizontal.
- **Limitación de comprobación en vivo:** el proxy del entorno también rechaza tiles.openfreemap.org con 403 antes de llegar al servicio. La fuente/capas se verificaron contra la documentación y el repositorio oficial, pero la cobertura real de Marroka y la conectividad desde Safari/iPad necesitan comprobación en el navegador habitual. Cambiar de proveedor no garantiza resolver restricciones de una red ni calles ausentes de los datos OSM.

## Panel privado y recuperación automática de capturas

- **44 pruebas unitarias aprobadas** y compilación de producción con TypeScript correcta. No se añaden dependencias, cuentas ni servicios externos.
- **56 pruebas de navegador aprobadas en la ejecución final completa (6.3 minutos, un worker)** con Chromium y base temporal aislada. Se conservan las regresiones de renta/venta, borradores locales, publicación/retirada, autorización, mapas, idiomas, PWA, galería y Marzipano.
- Ocho escenarios nuevos de navegador comprueban panel inicial, búsqueda y estados de publicación, descarga de panoramas solo bajo demanda, campos incompletos y precios separados por operación, persistencia de fotos/escenas tras recargar, traducción sin alterar contenido, ausencia de subidas durante el guardado automático, pérdida de conexión real simulada en Chromium y reintento hacia el mismo ID del servidor.
- Se prueban transacciones IndexedDB abortadas sin anunciar éxito, recuperación/reintento, conflictos entre pestañas con copia explícita, reversión a valores iniciales, descarte sin crear recuperaciones vacías y cierre de sesión con checkpoint local, cancelación ante error y continuación posterior. Las inyecciones de fallos del guardado manual se limitan a su base para no consumirlas en el almacén automático.
- El panel y la captura se comprueban a tamaño iPad (820×1180), sin desbordamiento horizontal; se revisa la captura del panel con material ficticio. Las pruebas de direcciones bloquean el service worker para que sus respuestas simuladas sean interceptables; la prueba PWA separada sigue comprobando el worker real y la exclusión de datos privados de caché.
- **Límites:** no se ha probado Safari/iPad físico, terminación de la app por iOS, expulsión/cuota real del dispositivo ni transferencia desde una cámara 360 real. La recuperación es local al navegador y no está cifrada; el área privada necesita conexión al abrir. No se implementa arranque offline completo ni cola automática de envío. Se mantienen los límites de verificación en vivo de los proveedores cartográficos descritos arriba. Véase [uso y privacidad de recuperación](AUTOSAVE_DASHBOARD.md).

## Respaldos portátiles y editor visual 360

- **52 pruebas unitarias aprobadas**: se añaden casos de JSON parcial, borradores v1/v2, migración sin inventar condiciones, IDs/destinos remapeados, exclusión de metadata ajena, rechazo de versión/campos/base64/URLs/SVG/firma/tamaño/grafo/orientación, límite previo a lectura de archivo, vistas de entrada y alcanzabilidad dirigida. TypeScript y compilación de producción correctos.
- **62 pruebas de navegador aprobadas en la suite completa (5.2 minutos, un worker)**. Se mantienen catálogo, renta/venta, mantenimiento, mapas, ubicación, guardado/recuperación, publicación/retirada, autorización, idiomas, PWA y Marzipano.
- Tras el ajuste final de presentación se recompila y pasan **dos pruebas dirigidas** de traslado/restauración y edición visual con nuevas capturas de pantalla. La prueba de reordenación espera el orden confirmado en IndexedDB antes de recargar, respetando el intervalo del guardado automático y evitando depender del tiempo de una captura de pantalla.
- **Siete escenarios dirigidos aprobados**, incluidos los seis nuevos y la regresión del editor manual anterior. La última comprobación específica de gestos también pasó con entradas multitouch reales de Chromium: pellizcar y arrastrar no crean una flecha, el toque proyecta una posición y el botón del centro es una alternativa accesible. Orientación e inicio sobreviven a recuperación tras recarga y se muestran en ES/EN.
- Se descarga un JSON desde la UI y se restaura en un contexto de navegador independiente. Se comprueban vista previa/cancelación, imágenes decodificadas, valores vacíos y precios independientes, derechos y revisión de ubicación pendientes, ausencia de subidas, guardado de copia sin reemplazar la original, abortos de transacción y reintento sin duplicados. Medios externos o corruptos se rechazan antes de escribir.
- El flujo privado importa localmente, confirma explícitamente en servidor, conserva la orientación al volver a editar y al publicar, y rechaza una orientación inválida enviada directamente a la API sin sustituir la versión válida. La ficha publicada usa el visor sin sesión; las rutas privadas siguen rechazando acceso anónimo. Las publicaciones de prueba se retiran al terminar.
- Revisión visual a tamaño iPad (820×1180), comprobación de anchura y material ficticio. No se usan propiedades reales ni se generan consultas a proveedores cartográficos en estas pruebas. Continúan pendientes Safari/iPad físico, memoria/cuota de archivos grandes, hardware de cámara, arranque offline completo y restauración operativa del servidor. Véase [guía de uso y límites](BACKUPS_AND_VISUAL_TOURS.md).

## Revisión de publicación y acceso privado para visitas

- **60 pruebas unitarias aprobadas** y build/TypeScript correctos. Se comprueban condiciones pendientes por operación, aval/póliza alternativos, bloqueo de datos obligatorios, preview previo a autorización de ubicación sin publicar, valores vacíos sin cero inventado, equivalencia de DTO de preview/publicación, exclusión de datos privados, validación/normalización de acceso, compatibilidad y huella estable de capturas antiguas y enlaces externos de hosts fijos.
- **67 escenarios de navegador verificados mediante suite completa y comprobaciones dirigidas.** La última ejecución completa aprobó 66 (7.4 minutos); el caso restante de cierre de sesión dependía de reactivar el almacenamiento después de cancelar realmente la confirmación. Se corrigió la espera del evento y la habilitación del botón, y pasó **dos ejecuciones dirigidas consecutivas** (16.4 segundos). El caso de idiomas también pasó tras identificar Descripción por su etiqueta. No se amplían timeouts ni se omiten comprobaciones para resolver estos fallos de prueba.
- **Cinco escenarios nuevos dirigidos aprobados** con Chromium a tamaño iPad, más las regresiones privadas y de ubicación. Incluyen captura actual frente a versión local/servidor, foco/cancelación y galería anidada, conservación de texto/medios e idiomas, medios privados directos, confirmación explícita, cancelación sin publicar, ediciones sin guardar excluidas, conflicto de revisión y nueva autorización al refrescar.
- La ficha previa y el HTML publicado no reciben coordenadas privadas ni referencia/notas de acceso cuando se eligió zona aproximada. Se verifica que el acceso sigue excluido del DTO incluso al autorizar el punto exacto del inmueble. Las publicaciones ficticias de prueba se retiran al terminar.
- El mapa se comprueba con GPS tardío simulado al cambiar de modo, puntos independientes, marcador activo/pasivo, ampliación, centrado y encuadre de ambos puntos, cambio de proveedor con MVT ficticio y sin solicitudes reales a Google/OSM. Recuperación tras recarga y JSON conservan el acceso; un par incompleto permanece como captura pero no confirma un borrador hasta completarse. La API también rechaza el par inválido sin reemplazar la versión válida.
- Se revisan capturas de pantalla a 820×1180, sin desbordamiento horizontal. La prueba de idiomas identifica explícitamente Descripción, pues el formulario tiene ahora también el campo de referencia privada. Los tests de publicación atraviesan la revisión y conservan el control de la confirmación final nativa; no se omite el nuevo flujo.
- **Pendiente físico/en vivo:** Safari/iPad, GPS real y recorrido de acceso, cobertura/numeración real de Marroka, disponibilidad/precisión de proveedores, auditoría independiente y límites operativos de privacidad/memoria. Se mantienen los bloqueos de red descritos en LOCATION_CAPTURE.md. No se despliega alojamiento ni se copian datos de Google; sus enlaces externos se abren solo por acción del usuario. Véase [guía de revisión y visitas](REVIEW_AND_VISITS.md).
