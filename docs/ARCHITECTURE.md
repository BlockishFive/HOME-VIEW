# Arquitectura

## Flujo

`app/page.tsx` → datos locales de `lib/properties.ts` → `PropertyCard` → `/propiedades/[slug]` → `PropertyTour` → `PanoramaViewer`, `FloorPlan`, `VisitRequest`.

Next.js App Router renderiza el catálogo y las rutas conocidas. Los slugs desconocidos responden 404. Los metadatos declaran `noindex`: el prototipo no representa ofertas reales. TypeScript define el contrato de propiedades, habitaciones y hotspots. Tailwind CSS 4 se integra mediante PostCSS; la hoja global define los componentes visuales, los tamaños adaptables y las reglas de movimiento reducido. No hay proveedor de tipografías externo.

## Límites de componentes

- `Header` y `PropertyCard`: componentes de servidor reutilizables.
- `PropertyTour`: componente cliente que mantiene una sola fuente de verdad para la habitación seleccionada. El visor, la lista y el plano comparten ese estado.
- `PanoramaViewer`: importa Marzipano únicamente en cliente. Carga una imagen equirectangular local 2:1, crea la escena y sus hotspots con elementos DOM (sin HTML inyectado). Destruye el visor anterior al cambiar de habitación o desmontarse para liberar WebGL y listeners. Gestiona errores de imagen/inicialización, zoom, dirección y pantalla completa. Los límites de vista evitan acercamientos extremos.
- `FloorPlan`: distribución SVG genérica, sin escala; botones HTML accesibles indican la habitación activa.
- `VisitRequest`: aviso local reversible; deliberadamente no contiene formulario, endpoint, email ni almacenamiento.

## Activos y rendimiento

`public/panoramas` contiene tres panoramas 2048×1024 y tres cubiertas 1200×850. Se usa un panorama por escena, apropiado para el prototipo. Next Image optimiza las cubiertas; Marzipano carga directamente el JPEG. Para fotos de mayor resolución conviene generar mosaicos multirresolución, presupuesto de memoria, carga progresiva y CDN controlado. El script opcional de medios usa NumPy y Pillow y no es necesario para instalar o ejecutar la aplicación.

## Pruebas

`tests/properties.test.ts` comprueba rutas únicas, selección inexistente, conectividad del grafo, destinos válidos, coordenadas geográficas de referencia y presencia/formato de todos los medios. `tests/browser/tour.spec.ts` comprueba catálogo, inicio real del visor WebGL, cambio por hotspot/plano/lista, aviso de visita, ausencia de errores JS, 404 y adaptación móvil. `playwright.config.ts` puede iniciar la compilación de producción. El renderer software permite pruebas WebGL en máquinas sin GPU.

## Evolución

Cambiar datos locales por un repositorio de datos validado en servidor, con identificadores de escena por inmueble y planos reales autorizados. Separar borradores de contenido publicado. Incorporar un endpoint de solicitudes solo tras resolver los pendientes de seguridad y privacidad. Las pruebas no sustituyen revisión manual con lectores de pantalla, móviles físicos y dispositivos de baja memoria.

## Exploración con mapa y datos de México

`PropertyExplorer` mantiene filtros por texto (sin distinguir acentos), tipo, operación y presupuesto, selección y vista mapa/tarjetas. `filterProperties` es una función pura compartida y probada. La lista de resultados y los marcadores reciben exactamente el mismo conjunto filtrado; al excluir la selección anterior se selecciona el primer resultado disponible. Un estado vacío ofrece restablecer los filtros.

`PropertyMap` importa MapLibre y PMTiles solo en el cliente. Lee `/maps/home-view.pmtiles` del mismo origen mediante HTTP Range. Un protocolo compartido por módulo permite dos mapas simultáneos sin desregistrar el lector al desmontar una instancia. Tres fuentes con rangos 3–7/8–10/11–14 comparten el mismo archivo y filtran `scope` mexico/guanajuato/leon. Los niveles de contexto pueden sobreescalarse; el detalle geográfico está limitado a la cobertura documentada.

El estilo oscuro es local y no usa glyphs, sprites, fuentes o teselas remotas. Los marcadores de inmuebles y etiquetas de ciudades son elementos DOM con texto seguro. Se liberan mapas, marcadores y ResizeObserver. WebGL dibuja los vectores. Los errores de lectura o inicialización ofrecen reintento explícito sin bucles; el mapa no se considera listo si la fuente reporta error.

`PropertyDetails` presenta construcción, terreno de referencia, recámaras, baños, estacionamientos, año, equipamiento y costos por operación. Solo venta contiene predial anual; mantenimiento usa un estado explícito. Las cifras del catálogo son ficticias en MXN, nunca cálculos fiscales. Se usan valores numéricos y `Intl.NumberFormat` para su presentación. La interfaz combina fondo negro, superficies oscuras y acentos lima/amarillo, según la referencia visual del usuario.

Para publicar ubicaciones reales se deberá decidir su precisión pública, obtener autorización, implementar límites y filtros por viewport y revisar las licencias de los datos y los costos de infraestructura. No se representan límites catastrales ni levantamientos topográficos. Véase SERVICES.md.

La configuración de desarrollo permite explícitamente el origen de loopback `127.0.0.1` para las comprobaciones locales de Next.js; no autoriza orígenes externos arbitrarios.

## Galería y ficha del inmueble

La ruta de cada propiedad abre con nombre, dirección ficticia, precio de demostración y un mosaico de tres ilustraciones. `PropertyGallery` recibe imágenes con `src`, `alt` y `label`. Usa un diálogo nativo modal con foco inicial, Escape, retorno de foco al disparador, flechas anterior/siguiente, contador y estado de imagen no disponible. El scroll de fondo se bloquea mientras el diálogo está abierto. No se incorpora ninguna fotografía ni texto comercial de las capturas de referencia.

`PropertySectionNav` usa enlaces a secciones visibles, en vez de pestañas que oculten contenido. La posición de las secciones indica el enlace activo con un listener de scroll limitado mediante requestAnimationFrame; se detecta también el final del documento para activar Costos en pantallas altas. `PropertyDetails` reúne descripción y resumen en una cuadrícula, con niveles, tipo de construcción, barrio, régimen, terreno, antigüedad, predial solo para venta y estacionamientos. `plotArea: null` representa superficie de terreno no especificada: no se sustituye por cero ni por la superficie del departamento. `PropertyCosts` mantiene el detalle de costos en una sección independiente.

`PropertyActions` invoca Web Share cuando está disponible. Si no lo está o falla, intenta Clipboard API y confirma únicamente después de copiar; si el permiso se deniega, presenta una URL de solo lectura para copiar manualmente. Cancelar el diálogo nativo no activa el portapapeles. El fragmento de sección se elimina del enlace compartido. Imprimir abre la función del navegador; una hoja de impresión conserva descripción, resumen, precio, imagen principal y costos, y omite controles y WebGL.

Los datos de titularidad y referencia son ficticios; no son certificados ni comprobaciones registrales. El prototipo mantiene el recorrido 360 y el mapa geográfico de forma independiente a la galería.

## Venta, renta, terrenos y alta local

`Property.operation` diferencia Venta/Renta; el precio de una renta es mensual y se etiqueta en tarjetas, marcadores y ficha. `/venta`, `/renta` y `/terrenos` reutilizan `CatalogPage` y `PropertyExplorer` con filtros iniciales. `hasTour` exige una vivienda y escenas: ningún terreno renderiza visor, hotspots, mini plano o acceso a 360. La casa en renta incluida es una demo con fotos convencionales.

`ListingForm` y `lib/listing-drafts.ts` no dependen del catálogo estático ni de un backend. Validan datos, permisos sobre imágenes, cantidad, tipo y tamaño; las fotos se decodifican y reencodan con canvas antes de guardar blobs en IndexedDB. Las transacciones se confirman antes de anunciar éxito. Se revocan las ObjectURL de previsualización y se maneja almacenamiento denegado/cuota. El respaldo JSON incluye las fotos; no hay todavía importación ni sincronización.

Los datos del formulario no se insertan en `lib/properties.ts` ni se publican en rutas del servidor. Para un catálogo compartido se necesita una capa persistente con autorización, validación en servidor y moderación. Las pruebas de navegador cubren persistencia, exportación y eliminación de borradores y leen el archivo PMTiles local real; el mapa ya no requiere acceso a un proveedor externo.

## Desarrollo en Codespaces y solicitudes del mapa

`lib/dev-origins.ts` construye `allowedDevOrigins` a partir de las variables de plataforma `CODESPACE_NAME`, `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN` y `PORT` (3000 por defecto). Valida etiquetas DNS y puerto y añade solo el hostname exacto; mantiene 127.0.0.1 y no usa un wildcard sobre todos los Codespaces.

El antiguo mapa raster de OpenStreetMap se sustituyó por datos locales de Natural Earth, sin solicitudes HTTP a proveedores de mapas. El lector PMTiles solicita rangos del archivo estático y el servidor debe responder 206 con Content-Range. El paquete usa teselas MVT con geometrías reales cuantizadas y gzip; scripts/build-vector-map.py verifica SHA256 de snapshots y genera el archivo y sus métricas. Véase MAP_DATA.md.

Las pruebas leen los datos locales reales, verifican encabezados y geometría en León y prueban el transporte Range y la recuperación del mapa. No se sustituyen los datos geográficos por imágenes simuladas. El callejero completo, la geocodificación, los puntos de interés y las rutas continúan pendientes.

## Piloto: contratos y cantidades

`lib/property-terms.ts` define `RentalTerms`, `SaleTerms`, `Maintenance` y `Community`. `Property` y `DraftInput` son uniones discriminadas por `operation`: solo `Renta` contiene `rental`; solo `Venta` contiene `sale`. No se guardan simultáneamente las condiciones de operaciones distintas. `priceValue` del catálogo permanece como índice de presupuesto; sus pruebas verifican que coincide con el importe del bloque de operación. Una renta no tiene campo de predial.

`null` representa un importe pendiente. Las opciones usan valores explícitos (`unknown`, requisitos independientes o alternativos, servicios incluidos/excluidos, cuota aplicable o no aplicable). `normalizeDraftInput` elige los campos del contrato activo, elimina valores escondidos y limpia cuota/inclusión si no aplica. Al seleccionar aval o póliza, los requisitos independientes se limpian. Las cantidades se validan en cliente con hasta dos decimales; los totales usan centavos para evitar error de punto flotante.

`rentalSummary` y `rentalMonthlyTotal` son la única lógica de presentación/suma. La renta anunciada incluye la cuota solo cuando se confirma `included: yes`; si es adicional se suma una vez. El total se omite ante monto o inclusión pendientes, incluso si se sabe que existe cuota. `No aplica` se muestra explícito y no genera una cuota cero inventada. No se suman servicios, depósito ni póliza. `TermsDetails` comparte estos resultados entre la ficha pública, la vista previa del formulario y los borradores; catálogo y panel del mapa reutilizan los mismos helpers.

## Piloto: borradores y medios

El esquema de registro es `schemaVersion: 2`; la base IndexedDB conserva su versión estructural 1 y el store `listings`. No necesita crear stores nuevos. `migrateListingDraft` adapta registros v1 en memoria al leerlos, conservando ID, fecha y blobs. No sobrescribe originales al abrir. Precio y predial se mapean a la operación; cuota antigua positiva conserva monto con inclusión desconocida. Cuota vacía/cero antigua es ambigua y se marca por confirmar. No se deducen condiciones comerciales. Al editar/guardar se escribe v2 sobre el mismo ID con `updatedAt`.

`ListingForm` separa estados de venta/renta, comunes, fotos y escenas. `ListingTermsFields` conecta las opciones con validación, vista previa y guardado. El panel permite editar, cancelar, eliminar y exportar; cada transacción termina antes de anunciar éxito. No hay importación de respaldos ni resolución de conflictos entre pestañas. La última escritura gana; evitar edición concurrente del mismo borrador.

`lib/draft-tour.ts` valida límites, dimensiones de captura y el grafo. `DraftTourEditor` procesa capturas ya equirectangulares (la proporción 2:1 no prueba por sí misma una esfera completa), permite nombre, destino, yaw y pitch manuales. Eliminar escena retira conexiones entrantes. Las conexiones son dirigidas; escenas sin conexiones siguen accesibles por botones, sin inventar plano ni adyacencias. Se guardan JPEG reencodados en blobs separados de las fotografías convencionales. El respaldo v2 serializa ambos grupos a data URLs junto a las conexiones.

`DraftTourPreview` adapta los blobs a ObjectURL y al mismo `PanoramaViewer` genérico de las demostraciones. Destruye visores y revoca URLs al cambiar o cerrar. `DraftTourSavedPreview` lo monta bajo demanda para limitar WebGL. Los controles usan `type=button` dentro del formulario. La etiqueta de material local evita atribuir al propietario imágenes sintéticas. Las demos existentes mantienen sus panoramas y plano genérico.

## Piloto móvil y límites

Véase [PWA](PWA.md) para instalación, worker y límites offline. No se cambian el mapa ni sus datos/licencias. No hay pagos ni registro público. El panel local no es un área privada autenticada: almacenamiento compartido, URLs de medios con autorización, usuarios privados, validación en servidor y política de backups requieren otra fase.

Pruebas nuevas: reglas de cantidades/mantenimiento/garantías, migración y normalización v1/v2, límites/grafo 360 y regresiones de navegador de separación por operación, mantenimiento, edición, persistencia, respaldo, escenas manuales, manifest y aviso offline. Los archivos `tests/browser/*` usan medios procedurales del repositorio, no material de terceros.

## Interfaz bilingüe y captura en iPad

`I18nProvider` conserva locale cliente sin cambiar ruta/origen ni esquema de IndexedDB. Los diccionarios explícitos de `lib/i18n/` traducen la interfaz y el catálogo ficticio; se preserva el contenido escrito por el propietario. Los helpers de costos admiten locale opcional sin cambiar las cantidades ni cálculos. Las vistas cliente de inicio, alta y propiedad dejan en servidor la resolución de rutas, 404 y parámetros estáticos. Los componentes de mapa actualizan etiquetas conservando vista y filtros.

Los dos manifests comparten identidad PWA; el aviso offline usa la misma preferencia y el worker v2 mantiene la caché limitada. El HTML estático inicial sigue en español y `noindex`, con traducción al hidratar. No es una implementación de SEO multilingüe en servidor. Véase [I18N.md](I18N.md) para límites y tipografía.
