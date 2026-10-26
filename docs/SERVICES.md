# Servicios y costos de Home View

La aplicación no requiere contratar Google Maps, Mapbox, servicios de inteligencia artificial, autenticación, correo, almacenamiento de fotos o una base de datos para el prototipo actual. No contiene claves de facturación ni activa servicios de pago. Esto no equivale a garantizar operación ilimitada gratuita.

| Componente                                               | Uso actual                                                                              | Límites y posible costo futuro                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js, React, TypeScript, Tailwind, Marzipano, Leaflet | Bibliotecas de código abierto instaladas con npm                                        | Sin cuota por usarlas; conservar sus licencias. El servidor donde se ejecuten puede costar.                                                                                                                                                                                  |
| OpenStreetMap                                            | Datos abiertos y teselas públicas HTTPS de `tile.openstreetmap.org`; atribución visible | Sin clave ni cobro automático en este prototipo. Los servidores públicos son comunitarios, tienen política de uso, capacidad limitada y no ofrecen SLA. Para tráfico elevado puede necesitarse otro proveedor o alojar teselas: habrá consumo de recursos y posibles costos. |
| Alta de inmueble                                         | Borradores con fotos en IndexedDB del navegador                                         | Sin servidor ni cuota de almacenamiento contratada. Son locales, pueden perderse al borrar los datos y no se publican ni sincronizan. Hay respaldo JSON descargable; todavía no hay importación de respaldos en la interfaz.                                                 |
| GitHub                                                   | Código fuente                                                                           | Sujeto a límites y condiciones de la cuenta. GitHub Pages no ejecuta un servidor Next.js tal como está configurado el proyecto.                                                                                                                                              |
| GitHub Codespaces                                        | Desarrollo, si el propietario lo usa                                                    | Tiene límites de uso incluidos y puede generar cargos según la cuenta y la configuración de facturación. No es un hosting gratuito permanente.                                                                                                                               |
| Hosting, dominio y respaldos                             | Se eligen al desplegar                                                                  | Vercel u otros servicios tienen términos, cuotas y planes; no asumir que un plan gratuito admite actividad comercial inmobiliaria. Se puede alojar Next.js en infraestructura propia, cuyo costo de equipo, red y mantenimiento sigue existiendo.                            |

## Configuración del mapa

El navegador solicita las teselas directamente a OpenStreetMap: el servicio recibe su IP y los rangos del mapa visualizados. No se pide la ubicación GPS del visitante ni se usa geocodificación de domicilios. Los marcadores del catálogo son ficticios y aproximados, ubicados en la geografía real de León. Los botones de alcance cambian entre León, Guanajuato y México.

Mantener atribución y enlace a la licencia. No hacer descargas masivas, precarga para uso sin conexión ni eliminar las cabeceras que identifican normalmente al navegador. Respetar la caché del servicio. No se implementó un proxy de teselas. Si la red bloquea la cartografía, la aplicación muestra un aviso; la lista de propiedades y el alta local siguen funcionando.

Consultar las condiciones vigentes antes de publicar o aumentar tráfico:

- [Política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
- [Atribución y licencia de los datos](https://www.openstreetmap.org/copyright)
- [Facturación de GitHub Codespaces](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [Planes de Vercel](https://vercel.com/pricing) y sus condiciones de uso para actividad comercial.

## Para publicar inmuebles reales de forma compartida

Hace falta un backend con control de acceso, almacenamiento persistente de imágenes y datos, validación en servidor, backups y una política de privacidad. Una opción sin licencias de pago es servidor propio con SQLite y archivos; requiere operar y mantener esa infraestructura. No añadir un proveedor de pago sin una decisión explícita del propietario. El formulario local es el primer paso para preparar una casa en renta y revisar sus fotos, no un sistema público de anuncios multiusuario.

### Identificación de las solicitudes

Las imágenes del mapa usan una política explícita de referencia que comparte con OpenStreetMap solo el origen de Home View (esquema, hostname y puerto), sin ruta ni parámetros. Esta identificación permite respetar los requisitos del servidor comunitario desde vistas de desarrollo con políticas restrictivas. El botón de actualización reintenta las teselas visibles; no añade parámetros para eludir caché ni cambia de endpoint para sortear bloqueos. Un 403 del proveedor debe diagnosticarse en el navegador real; no se resuelve contratando una clave de API para este servidor público.
