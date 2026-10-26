# Servicios y costos de Home View

El prototipo no requiere APIs de pago ni claves de facturación. No integra autenticación, correo, almacenamiento remoto de fotos ni una base de datos contratada. Esto no garantiza operación ilimitada gratuita: los recursos del alojamiento tienen límites.

| Componente                                                          | Uso actual                                                     | Límites y posibles costos                                                                                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js, React, TypeScript, Tailwind, Marzipano, MapLibre y PMTiles | Bibliotecas de código abierto                                  | Sin cuota por usarlas; conservar licencias. El servidor donde se ejecuten puede costar.                                                                      |
| Mapa propio                                                         | Archivo PMTiles local y datos Natural Earth de dominio público | Sin conexión a un servidor cartográfico externo. Consume transferencia y almacenamiento del hosting. Cobertura de referencia, sin callejero urbano completo. |
| Alta de inmueble                                                    | Fotos y borradores en IndexedDB del navegador                  | Sin servicio contratado. No se publican ni sincronizan. Pueden perderse al borrar datos; respaldo JSON descargable, importación aún pendiente.               |
| GitHub                                                              | Código fuente                                                  | Sujeto a condiciones y límites de la cuenta. GitHub Pages no ejecuta el servidor Next.js de esta configuración.                                              |
| Codespaces                                                          | Desarrollo, si el propietario lo utiliza                       | Tiene uso incluido y posible facturación según cuenta y configuración; no es hosting gratuito permanente.                                                    |
| Hosting, dominio y respaldos                                        | Se eligen al desplegar                                         | Revisar cuotas y uso comercial. Alojar Next.js en infraestructura propia también consume equipo, red y mantenimiento.                                        |

## Mapa local

El navegador solicita únicamente los rangos necesarios del archivo PMTiles de Home View. Los datos geográficos publicados pesan **304,117 bytes**, aproximadamente **297 KiB**; el motor MapLibre se descarga aparte. No se envían las zonas visualizadas a un proveedor cartográfico externo. El alojamiento del sitio sí recibe las solicitudes de los visitantes.

Los datos son reales y generalizados, procedentes de Natural Earth, dominio público. No se reutilizan imágenes de mapas comerciales ni las teselas bloqueadas de OpenStreetMap. Se muestran límites y vías principales, no todas las calles, colonias o parcelas de León. Para ampliar detalle con OSM o INEGI, verificar licencia, procedencia, atribución y proceso de actualización antes de incorporar el extracto.

El archivo local evita depender de las políticas o disponibilidad de un proveedor de teselas. No elimina los límites ni costos de almacenamiento y transferencia del alojamiento. Consultar condiciones vigentes:

- [Natural Earth: dominio público](https://www.naturalearthdata.com/about/terms-of-use/)
- [MapLibre](https://maplibre.org/)
- [PMTiles](https://docs.protomaps.com/pmtiles/)
- [Facturación de Codespaces](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [Planes de Vercel](https://vercel.com/pricing) y sus condiciones de uso comercial.

## Para publicar inmuebles reales de forma compartida

Se necesita un backend con control de acceso, almacenamiento persistente de imágenes y datos, validación en servidor, backups y una política de privacidad. Una opción sin licencias de pago es servidor propio con SQLite y archivos; requiere operar y mantener esa infraestructura. No añadir un proveedor de pago sin una decisión explícita del propietario. El formulario local prepara fichas y fotos, no es un catálogo compartido multiusuario.
