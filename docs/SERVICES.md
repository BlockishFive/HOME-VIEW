# Servicios y límites del piloto

No se ha contratado alojamiento ni activado APIs de pago. El piloto requiere un servidor Next.js activo (el Codespace actual), conserva datos privados en su disco y usa algunos servicios comunitarios opcionales. No garantiza operación gratuita ilimitada.

| Componente | Uso actual | Límite principal |
| --- | --- | --- |
| Next.js, React, Tailwind, Marzipano, MapLibre, PMTiles | Bibliotecas de código abierto | Conservar licencias; ejecutar el servidor consume recursos. |
| Mapa local | PMTiles/Natural Earth incluido | Referencia general sin calles completas; consume transferencia del sitio. |
| Calles online opcionales | OpenStreetMap raster, tras pulsar Activar calles | Internet, atribución, caché HTTP y uso interactivo moderado; sin SLA ni descarga offline. |
| Búsqueda de lugares | Photon/Komoot bajo sesión y a petición | Uso moderado, caché privada y límite global; puede fallar o ser limitado por el proveedor. |
| GPS del iPad | Geolocalización del navegador con permiso | HTTPS, precisión variable; no es identificación automática del inmueble. |
| Borradores locales | IndexedDB y exportación JSON | Solo en ese navegador/origen; importación todavía pendiente. |
| Área privada | Cuenta única, sesión y API Node/SQLite | Datos y medios en disco persistente; no hay registro público, roles múltiples ni nube gestionada. |
| Publicación | Snapshot revisado del borrador y medios | Público para quien pueda abrir el sitio; publicación/actualización/retirada explícitas. |
| Codespaces | Desarrollo y pruebas compartidas | Cuotas/facturación según cuenta; puede suspenderse, no es hosting permanente. |
| Dominio, alojamiento estable y copias externas | Pendientes | Elegir condiciones, persistencia, costo y uso comercial antes de desplegar. |

Consulta [captura de ubicación y proveedores](LOCATION_CAPTURE.md), [acceso y respaldos](PRIVATE_PILOT.md) y [publicación](PUBLISHING.md).

## Condiciones cartográficas

- [Política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/): solo el viewport activo, atribución visible, identificador/Referer y caché HTTP normal. No hacer prefetch, scraping ni descarga de ciudades. El navegador no conecta hasta elegir esta capa. La red del sitio recibe solicitudes locales; OSM recibe IP/área consultada al activar calles.
- [Photon/Komoot](https://photon.komoot.io/) permite proyectos con volumen razonable y puede limitar solicitudes. Home View busca solo al pulsar el botón, bajo sesión, con caché y protección global. No enviar información confidencial. El endpoint Photon-compatible puede cambiarse por configuración administrativa.
- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) es dominio público; el archivo local y su generación se conservan.

El mapa público usa el punto autorizado por su precisión; una zona aproximada no garantiza anonimato si el anuncio o las fotos muestran direcciones. La cobertura real de Marroka y las calles nuevas requiere verificación en campo; no se ha comprobado conectividad real a estos proveedores desde este entorno restringido.
