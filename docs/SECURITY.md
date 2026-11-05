# Pendientes antes de producción

El catálogo público incluye demos ficticias y versiones publicadas explícitamente desde el piloto. `/alta` guarda localmente; `/privado` requiere una cuenta privada y persiste datos y medios en el servidor. No hay registro público, cobros ni formularios de contacto. El aviso de visita no representa una reserva ni envía mensajes. No añadir credenciales al repositorio.

Antes de operar con propiedades o personas reales:

- Acreditar derechos sobre fotos, panoramas, planos y textos. Obtener consentimiento para interiores privados; retirar rostros, documentos, placas, objetos sensibles y metadatos EXIF/GPS. Revisar también los reflejos de los panoramas.
- Validar en servidor todas las entradas de catálogo y hotspots; autorizar orígenes de imágenes. Evitar URLs arbitrarias, SSRF en importadores y HTML sin sanear. El catálogo usa rutas locales predefinidas; las vistas previas locales usan URLs blob creadas por el navegador y texto escapado por React. No se aceptan URLs remotas de medios.
- Diseñar el backend de solicitudes: validación y límites de tamaño, rate limiting, protección antibots y contra abuso, CSRF/origin según el modelo de sesión, y envío de correo desde servidor con secretos gestionados. No afirmar que una solicitud fue enviada si el proveedor no la aceptó.
- Establecer aviso de privacidad, consentimiento y finalidad, retención mínima, eliminación y control de acceso a datos personales. No registrar datos personales o tokens en logs. Revisar requisitos legales de la jurisdicción.
- Si se incorporan cuentas, diseñar autenticación y autorización por recurso, sesiones seguras, cookies HttpOnly/Secure/SameSite y recuperación de acceso; no confiar en identificadores suministrados por el cliente.
- Revisar dependencias con `npm audit`, actualizaciones y avisos de Next.js/React/Marzipano. Marzipano incorpora dependencias antiguas: analizar y mitigar su riesgo antes del despliegue. Conservar lockfile y habilitar actualizaciones automatizadas y análisis de secretos.
- Configurar HTTPS, cabeceras de seguridad y una CSP probada con Next.js y WebGL (scripts, workers, imágenes, conexiones). Aplicar HSTS solo con HTTPS operativo, `frame-ancestors`, `nosniff` y Permissions-Policy según las funciones usadas. No usar una CSP que deshabilite el visor sin probarla.
- Validar límites de memoria/GPU y rendimiento en móviles; detectar dispositivos sin WebGL, recuperación por pérdida de contexto y ofrecer alternativas descriptivas o imágenes estáticas equivalentes. Revisar WCAG, contraste, foco, lectura y movimiento con usuarios y tecnologías de asistencia.
- Separar demostración y datos reales; verificar precios, medidas y planos. Añadir contacto verificable y obligaciones legales de publicidad inmobiliaria. Retirar `noindex` únicamente tras revisión y lanzamiento autorizado.
- Definir monitorización con minimización de datos, gestión de incidentes, backups si existe persistencia y pruebas de restauración. Revisar políticas del hosting y caché antes de publicar.

El resultado de auditorías o pruebas se informa por separado; esta lista no es una certificación de seguridad ni implica que todas las medidas estén implementadas.

## Ubicaciones y predial

El mapa utiliza datos vectoriales locales de Natural Earth con marcadores ficticios. Antes de publicar domicilios reales: revisar licencia y atribución de teselas, términos de geocodificación, límites y facturación, restricciones de claves públicas, exposición de IP/ubicación a proveedores y precisión con que se divulgan domicilios. No solicitar ubicación del usuario sin necesidad y consentimiento. Validar coordenadas y datos de marcadores en servidor.

El predial anual y las cuotas actuales son datos sintéticos. Para cifras reales documentar municipio, ejercicio fiscal, fecha y fuente de actualización; distinguir montos oficiales, estimaciones y adeudos. Confirmar con autoridades y administración. No presentar un cálculo ilustrativo como avalúo, obligación fiscal o asesoría legal.

## Galería y acciones del anuncio

El diálogo de galería usa imágenes locales y texto alternativo definido en datos; validar esos campos si se introducen cargas de usuarios. No incorporar fotos o descripciones de un portal de terceros sin licencia. El régimen de propiedad de la demo no acredita titularidad ni ausencia de gravámenes: exigir verificación documental antes de publicar información jurídica real.

Compartir y copiar dependen de permisos del navegador y de un contexto seguro. La aplicación ofrece una copia manual y no confirma una copia fallida ni publica automáticamente en redes. Evitar datos personales o secretos en URLs compartidas; el prototipo solo comparte la ruta de una propiedad ficticia. Revisar accesibilidad del diálogo con lectores de pantalla y navegadores reales, además de las pruebas automatizadas.

## Alta local y fotografías del propietario

El formulario de `/alta` es local y no está protegido por autenticación. `/privado` usa la cuenta privada del piloto. IndexedDB está disponible a quien use ese navegador y no sustituye un almacén cifrado ni backups. Al cambiar de origen o borrar datos se pierden los borradores locales. Los JSON descargados contienen información y fotos aportadas por el propietario: tratarlos como archivos privados. La importación valida los archivos y restaura copias nuevas locales; véase BACKUPS_AND_VISUAL_TOURS.md.

El flujo local valida fotos en cliente. El flujo privado además valida estructura, tipo, contenido y tamaño y reencoda los medios en el servidor; esto no permite cargas públicas ni sustituye moderación. Implementar validación independiente de tipo y contenido, límites de recursos, escaneo/moderación, cuotas, almacenamiento fuera de rutas ejecutables y autorización antes de crear un endpoint. El canvas retira los metadatos originales al reencodar; no oculta información visible, rostros, reflejos o documentos. Revisar fotos antes de publicarlas.

No mostrar la posición exacta de una vivienda sin permiso. Los rangos numéricos del formulario solo son una validación aproximada de latitud/longitud; no certifican que un punto esté dentro de un municipio o polígono legal. Para terrenos comprobar uso de suelo, servicios, medidas y documentación con fuentes oficiales.

## Archivo vectorial local

Mantener PMTiles y snapshots como datos estáticos verificados. La generación valida SHA256 de sus entradas. Si se aceptan archivos PMTiles/GeoJSON externos en el futuro, limitar tamaño, geometrías y recursos antes de procesarlos. No crear un proxy abierto a URLs arbitrarias. Los límites generalizados no acreditan superficies ni situación jurídica de inmuebles.

## Piloto PWA, borradores v2 y panoramas

- El worker solo cachea el aviso offline y dos iconos; no cachea HTML de borradores, respuestas de APIs, blobs ni mapas. Mantener esa exclusión al añadir rutas privadas. HTTPS es requisito de instalación y APIs seguras. Instalar la PWA no agrega contraseña, cifrado ni autorización.
- IndexedDB y los respaldos contienen descripciones y medios locales. Cualquiera con acceso al perfil puede leerlos; evitar datos sensibles. Las URL blob se revocan al desmontar. El importador limita esquema, tamaño, tipos, destinos y ángulos; no descarga URLs de medios ni adopta revisiones/credenciales. Tras revisión explícita crea una recuperación nueva local y exige volver a confirmar derechos y ubicación.
- La migración v1 es no destructiva al leer. Revisar explícitamente condiciones antes de guardar v2: montos antiguos cero no prueban exención, y una cuota positiva no prueba que se incluya en la renta. No extrapolar aval, póliza ni servicios. Conservar respaldos antes de cambios de dominio o limpieza de almacenamiento.
- Las fotografías y panoramas se validan/reencodan en cliente con límites de bytes y píxeles, pero la decodificación puede consumir memoria antes de medir dimensiones. Probar móviles de poca memoria; limitar recursos y validar independientemente en cualquier futuro servidor. Proporción 2:1 no garantiza contenido panorámico ni autorización. No ocultar rostros/reflejos/documentos solo por retirar metadatos.
- El piloto compartido ya tiene sesión privada, autorización de API/medios, cuotas, revisión para evitar sobrescrituras y respaldo consistente. Siguen pendientes moderación, retención formal, identidades/roles múltiples, segundo factor, supervisión y restauración operativa. No exponer IndexedDB por endpoints improvisados.
- Los borradores confirmados de `/alta` conservan el modelo anterior: no combinan cambios entre pestañas y la última escritura gana. Las recuperaciones automáticas y el servidor privado sí comparan versiones y rechazan sobrescrituras obsoletas. Pruebas automáticas no equivalen a revisión física de instalación iOS/Android ni a auditoría de seguridad.

## Servidor privado del piloto

Véase [PRIVATE_PILOT.md](PRIVATE_PILOT.md) para modelo de cuenta única, sesiones, rate limit, origen/HTTPS, validación Sharp, cuotas, respaldos y limitaciones. La base y sus medios viven fuera de public y de Git; no hay credenciales ni secretos de sesión en el código. La cuenta se configura o restablece por terminal. Los tokens se almacenan solo como hash en servidor y cookie HttpOnly; no en localStorage. El logout revoca la sesión y avisa a otras pestañas del mismo navegador.

Las escrituras aceptan el origen exacto de la petición, un origen público fijado por HOME_VIEW_PUBLIC_ORIGIN o el hostname HTTPS exacto del Codespace derivado de su configuración validada. No se confía en un x-forwarded-host arbitrario. Configurar HOME_VIEW_PUBLIC_ORIGIN en un proxy/hosting propio. No hay CORS abierto.

No usar en funciones efímeras o varias instancias sin almacenamiento persistente/consistencia compartida. Proteger el volumen y las copias; el contenido no tiene cifrado de aplicación en reposo. Instalar HTTPS y restringir acceso a la infraestructura. Aún no se ha validado con una auditoría independiente ni móviles físicos.

## Publicaciones del piloto

Publicar requiere sesión, origen validado, revisión actual y confirmación explícita en UI. El endpoint usa una lista pública de campos; medios privados y publicados están separados. Solo los IDs presentes en publication_assets son públicos. Eliminar/retirar revoca lecturas futuras de medios y ficha, pero no borra descargas, capturas ni pestañas ya abiertas. No hay moderación automática de imágenes/datos personales: revisar caras, placas, documentos, reflejos y precisión de coordenadas antes de confirmar. Se retiran metadatos por Sharp, no contenido visual sensible. La cuenta única tiene todos los permisos; roles múltiples, auditoría externa inalterable, moderación, controles de abuso de lecturas públicas y hosting permanente quedan pendientes. No convertir una ruta pública a proxy de archivos o URLs arbitrarias.

El optimizador Next Image solo acepta las rutas estáticas de demo `/panoramas/**` y `/illustrations/**`, sin query. Las rutas `/api/private` y `/api/public` no pueden entrar a su caché persistente; los medios publicados se sirven directamente con no-store.

## Ubicación y proveedores cartográficos

La captura privada y la precisión pública son independientes. Aproximar el marcador no anonimiza descripciones o fotos. Los snapshots antiguos sin precisión declarada se aproximan al servirlos; guardar nuevos campos no supone autorización para publicar coordenadas exactas. Una nueva publicación exige revisar y guardar la elección; cambiar el punto o la precisión revoca la revisión en UI. Proteger también respaldos que conservan el punto privado.

GPS solo se lee tras pulsar el botón y conceder permiso; no hay seguimiento. Calles externas solo tras opt-in con aviso de IP/viewport. Photon solo recibe el texto solicitado, no el GPS, y requiere sesión/origen válido. No registrar consultas ni respuestas sensibles en consola. El endpoint de proveedor es configuración administrativa HTTPS, no un parámetro de usuario, sin redirecciones. La caché de consultas/respuestas privadas vive en SQLite; caduca a las 24 h y se limpia/limita al consultar, los respaldos pueden conservarla. No enviar datos personales/confidenciales. Antes de ampliar acceso: proveedor con cuotas acordadas, retención operativa y análisis de privacidad. Véase LOCATION_CAPTURE.md.

## Capturas automáticas del dispositivo

La recuperación puede contener datos y medios privados completos incluso antes de validar el formulario. Se guarda solo en IndexedDB de ese origen y no transmite hasta Guardar. No contiene contraseña/cookie/token, pero tampoco tiene cifrado de aplicación ni aislamiento frente a otra persona con acceso al mismo perfil. Cerrar sesión oculta la interfaz privada y revoca sesión; no borra silenciosamente una recuperación sin confirmar. Informar antes de capturar y descartar/confirmar al terminar en un equipo compartido.

La versión local evita reemplazos entre pestañas; la revisión del backend sigue impidiendo sobrescrituras del servidor. No se usa el idioma como dato de captura ni se acepta un origen remoto de recuperación. Los límites de cuota/20 registros generan error sin afirmar éxito ni borrar los anteriores. Browser eviction, modo privado, limpieza de datos y terminación del proceso pueden perder almacenamiento o cambios aún pendientes. Copias parciales no están incluidas en backup:private. La verificación de sesión requiere conexión y no se añade un acceso offline privado. Véase AUTOSAVE_DASHBOARD.md.

## Importación de JSON y editor visual

Los archivos seleccionados son datos no confiables. El parser usa listas explícitas de campos, límites de bytes/registros/texto, enums y tipos, firmas JPEG/PNG/WebP y base64 embebido; no ejecuta contenido ni solicita URLs del archivo. Antes de ofrecer restaurar se decodifican/reencodan imágenes secuencialmente y se valida el grafo y la orientación. Nuevos UUID para propiedad/medios/escenas y remapeo de destinos evitan reemplazos o referencias a medios privados previos. Una sola transacción conserva la recuperación y no anuncia éxito antes del commit. Importar no llama a APIs de subida/publicación. Los campos de autorización de imágenes y revisión de ubicación se reinician para nueva revisión.

Estos JSON no tienen cifrado ni firma de procedencia. Revisar el contenido no demuestra titularidad ni autorización; no compartir archivos con coordenadas y medios privados públicamente. Los límites de píxeles se verifican mediante cabeceras antes de decodificar; el decoder y el servidor también validan la imagen. Siguen pendientes presión real de memoria en iOS y aislamiento más fuerte de decodificación. Los blobs/URLs de vista previa se liberan al cerrar/cambiar. La orientación nueva se valida otra vez en servidor y se publica solo por snapshot explícito. No se crean conexiones de regreso ni se deduce la estructura de la vivienda.

## Revisión privada y acceso de visitas

La vista previa no es una publicación ni una ruta nueva accesible por URL. Reutiliza el DTO público por lista explícita y medios privados bajo sesión o blobs locales; conserva no-store y exclusión del optimizador. La interfaz distingue la versión guardada del formulario y exige consentimiento antes de publicar, pero la casilla no sustituye sesión, origen válido, derechos, revisión de ubicación o control de versión del servidor. Una edición concurrente sigue devolviendo conflicto y no adopta su revisión silenciosamente. Los avisos de condiciones desconocidas no inventan requisitos ni importes.

La referencia de acceso (`visitAccess`) puede contener ubicación/notas privadas y solo aparece en el área de captura/revisión, borradores, recuperaciones y respaldos. Se valida su forma y longitud y, al confirmar, las coordenadas vacías o emparejadas dentro de cobertura. Publicación y preview público la excluyen incluso con precisión exacta de la vivienda. No guardar códigos de acceso, contraseñas o datos personales en notas. Un texto o foto del anuncio puede revelar información por sí mismo y necesita revisión humana.

Los enlaces externos tienen hosts HTTPS fijos y coordenadas numéricas, noopener/noreferrer y aviso junto al enlace; no hay fetch/prefetch ni envío de notas. Abrirlos comparte coordenadas/IP con el proveedor a petición. No se copian mapas de Google ni se introduce una API facturable. No hay seguimiento GPS ni consulta en segundo plano. Siguen pendientes validación física y privacidad operativa de dispositivos/copias, cifrado, identidades/roles y auditoría independiente.

## Retención histórica y restauración del servidor

Eliminar un borrador no borra sus versiones retenidas: retira su publicación y conserva hasta 10 revisiones privadas, accesibles solo bajo sesión/no-store. Las cuotas históricas son independientes de las del contenido vigente: 300 MiB de blobs deduplicados y 200 propiedades con versiones. Purga explícita y retención automática eliminan referencias/medios sin uso; permanecen UUID/revisión mínimos, el registro de actividad y los respaldos externos. No se promete borrado físico seguro de páginas SQLite/WAL o volúmenes/copias del proveedor.

La recuperación histórica no publica: conserva el snapshot anterior, crea una revisión privada nueva y exige volver a autorizar medios/ubicación antes de actualizarlo. Las operaciones verifican revisión y estado activo/eliminado dentro de la misma transacción. La UI preserva la captura y no adopta revisiones automáticamente. El log registra acciones de contenido y recuperación, no contenidos/credenciales/IP. Tiene retención de 5,000 y es modificable por el operador de la base; no acredita una auditoría externa ni acceso por persona en una cuenta compartida.

Los respaldos completos incluyen credenciales mediante hash y datos privados; no están cifrados. SHA-256 verifica consistencia con un manifiesto, no procedencia ni autenticidad ante un atacante que pueda reemplazar ambos. Verificar/restaurar es una función del operador por terminal, sin importador HTTP. Se rechazan esquemas desconocidos, tablas/campos extraños, triggers/views, dimensiones/medios inválidos, cuotas y rutas servidas/versionadas. Las imágenes se comprueban serialmente; no se solicitan URLs del archivo. Aun así, importa únicamente respaldos propios/confiables y mantén SQLite/Sharp actualizados.

Restaurar usa una carpeta nueva/vacía y staging privado; no sobreescribe una base activa ni cambia la configuración. Revoca todas las sesiones y conserva las credenciales del respaldo. Recupera también las publicaciones existentes entonces: podrían volver a mostrar contenido retirado posteriormente si arrancas esa copia. Validar autorización/visibilidad antes de un cambio operativo real. En la prueba automatizada solo se arranca una instancia local aislada con contenido ficticio. Quedan pendientes cifrado/rotación/monitorización de backups, retención operativa, pruebas periódicas en la infraestructura definitiva y revisión independiente. [Procedimiento](HISTORY_AND_RECOVERY.md).
