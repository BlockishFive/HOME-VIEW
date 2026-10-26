# Pendientes antes de producción

El catálogo es estático y ficticio. Los borradores y medios aportados se guardan solo en el navegador; no hay autenticación, cobros, formularios de contacto ni persistencia de información personal en servidor. El aviso de visita no representa una reserva ni envía mensajes. No añadir credenciales al repositorio.

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

El formulario de borradores no es un panel de administración con autenticación. IndexedDB está disponible a quien use ese navegador y no sustituye un almacén cifrado ni backups. Al cambiar de origen o borrar datos se pierden los borradores locales. Los JSON descargados contienen información y fotos aportadas por el propietario: tratarlos como archivos privados. La importación de respaldos y su validación todavía no están implementadas.

La validación de fotos ocurre en cliente: no basta para permitir cargas públicas a un futuro servidor. Implementar validación independiente de tipo y contenido, límites de recursos, escaneo/moderación, cuotas, almacenamiento fuera de rutas ejecutables y autorización antes de crear un endpoint. El canvas retira los metadatos originales al reencodar; no oculta información visible, rostros, reflejos o documentos. Revisar fotos antes de publicarlas.

No mostrar la posición exacta de una vivienda sin permiso. Los rangos numéricos del formulario solo son una validación aproximada de latitud/longitud; no certifican que un punto esté dentro de un municipio o polígono legal. Para terrenos comprobar uso de suelo, servicios, medidas y documentación con fuentes oficiales.

## Archivo vectorial local

Mantener PMTiles y snapshots como datos estáticos verificados. La generación valida SHA256 de sus entradas. Si se aceptan archivos PMTiles/GeoJSON externos en el futuro, limitar tamaño, geometrías y recursos antes de procesarlos. No crear un proxy abierto a URLs arbitrarias. Los límites generalizados no acreditan superficies ni situación jurídica de inmuebles.

## Piloto PWA, borradores v2 y panoramas

- El worker solo cachea el aviso offline y dos iconos; no cachea HTML de borradores, respuestas de APIs, blobs ni mapas. Mantener esa exclusión al añadir rutas privadas. HTTPS es requisito de instalación y APIs seguras. Instalar la PWA no agrega contraseña, cifrado ni autorización.
- IndexedDB y los respaldos contienen descripciones y medios locales. Cualquiera con acceso al perfil puede leerlos; evitar datos sensibles. Las URL blob se revocan al desmontar. Los respaldos no se transmiten y su importación sigue pendiente; un futuro importador necesitará validación de esquema, tamaño, tipos, destinos y política de medios.
- La migración v1 es no destructiva al leer. Revisar explícitamente condiciones antes de guardar v2: montos antiguos cero no prueban exención, y una cuota positiva no prueba que se incluya en la renta. No extrapolar aval, póliza ni servicios. Conservar respaldos antes de cambios de dominio o limpieza de almacenamiento.
- Las fotografías y panoramas se validan/reencodan en cliente con límites de bytes y píxeles, pero la decodificación puede consumir memoria antes de medir dimensiones. Probar móviles de poca memoria; limitar recursos y validar independientemente en cualquier futuro servidor. Proporción 2:1 no garantiza contenido panorámico ni autorización. No ocultar rostros/reflejos/documentos solo por retirar metadatos.
- Antes de almacenamiento compartido: autenticación privada, autorización por inmueble y medio, cargas acotadas, moderación, retención/borrado y backups probados. No usar el panel actual como administración protegida ni exponer IndexedDB por endpoints improvisados.
- Edición concurrente entre pestañas no tiene bloqueo ni combinación: última escritura gana. Pruebas automáticas no equivalen a revisión física de instalación iOS/Android ni a auditoría de seguridad.
