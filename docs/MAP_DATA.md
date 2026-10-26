# Mapa vectorial propio de Home View

MapLibre dibuja el estilo oscuro y PMTiles lee fragmentos del archivo estático del mismo sitio. No se consultan servicios de teselas, geocodificación, fuentes o sprites externos. No hay claves de API.

## Tamaño y cobertura medidos

- Archivo geográfico publicado: **304,117 bytes**, aproximadamente 297 KiB.
- Fragmentos MVT comprimidos con gzip: **478**.
- México: 85 fragmentos, niveles 3–7, contexto nacional y 32 entidades.
- Guanajuato: 82 fragmentos, niveles8–10, recorte regional.
- León: 311 fragmentos, niveles11–14, huella urbana y 5 geometrías de vías principales que intersectan la cobertura.
- GeoJSON base sin comprimir: 1,536,902 bytes. El paquete ocupa aproximadamente 80% menos que esas entradas; esto no es una comparación con un mapa raster equivalente.

Estas cifras no incluyen JavaScript, CSS, imágenes inmobiliarias ni el motor MapLibre. El navegador pide rangos del PMTiles según la vista; no necesita descargarlo entero. `public/maps/manifest.json` contiene métricas y SHA256 del archivo publicado.

**No es un callejero urbano completo**. Natural Earth ofrece cartografía generalizada: no contiene todas las calles, colonias, edificios, parques ni numeración de León. Tampoco sirve para rutas, medidas, catastro o límites legales. Las etiquetas de ciudades son referencias aproximadas. La paleta puede personalizarse sin regenerar las geometrías.

## Procedencia y licencia

Datos Natural Earth, dominio público. Fuentes originales, SHA256, filtros y snapshots están en `scripts/map-data/sources.json`; licencia en `scripts/map-data/LICENSE-Natural-Earth.md`. Las geometrías de entrada son reales, no calles inventadas ni fotografías de mapas ajenos.

Se usaron países a escala 1:50 millones, estados a escala 1:10 millones, vías principales a escala 1:10 millones y huellas urbanas a escala 1:10 millones del repositorio oficial de los datos Natural Earth (`nvkelso/natural-earth-vector`). El admin1 a escala 1:50 millones no contiene México y no se utilizó para sus estados. Los originales globales solo se descargaron para preparar el extracto y no se publican con la aplicación.

Una consulta de calles OSM a Overpass fue bloqueada por la política de red de este entorno antes de llegar al servicio. No se usaron servidores alternativos para evadir esa restricción. Un siguiente nivel de detalle requiere un extracto autorizado accesible de OSM/INEGI, revisar licencia y atribución y regenerar el archivo; no prometer detalle que no está incluido.

## Regenerar sin conexión

La aplicación ya incluye el archivo listo. Solo los desarrolladores que cambien datos necesitan Python y las herramientas de generación:

```sh
python3 -m venv /tmp/home-view-map-tools
/tmp/home-view-map-tools/bin/python -m pip install -r scripts/requirements-maps.txt
/tmp/home-view-map-tools/bin/python scripts/build-vector-map.py
```

Los snapshots gzip incluidos permiten regenerar sin solicitudes a proveedores. Se validan sus hashes antes de leerlos y se crea un nuevo manifest. Para actualizar fuentes, revisar procedencia y licencia, extraer únicamente la cobertura requerida y registrar los nuevos hashes después de verificar el contenido. No alterar hashes solo para omitir un fallo de integridad.

## Requisitos del alojamiento y validación

Servir `/maps/home-view.pmtiles` como archivo estático con HTTP Range/206 y Content-Range correcto. Next.js lo soporta en el servidor probado. Si se mueve a otro origen, configurar CORS para Range y ETag; actualmente no hace falta porque se sirve desde Home View.

Las pruebas verifican hash, encabezado PMTiles v3, tipo vectorial, geometría en León y lecturas parciales menores que el archivo entero. El navegador carga el archivo real, cambia de alcance, selecciona marcadores y recupera un fallo; además se comprueba que no hay solicitudes cartográficas externas. La revisión visual no certifica exactitud topográfica.

## Motor de dibujo y worker

MapLibre necesita un worker local de 519,372 bytes sin comprimir, además de su biblioteca principal y CSS. `predev`, `prebuild` y `prestart` ejecutan `scripts/prepare-map-worker.mjs`, que copia el worker y su licencia BSD desde la versión exacta instalada por npm. Conserva el archivo original y no descarga código de un CDN. Estos archivos generados no se guardan en Git: aparecen al ejecutar los scripts documentados. Usar `npm run dev/build/start`; invocar `next` directamente omite esa preparación.

El worker se comparte y se limita a uno para este mapa pequeño. La atribución de los datos Natural Earth es independiente de la licencia del motor MapLibre. Las cifras de 304 KB corresponden solo a datos geográficos; medir el total del visor por separado al planear presupuestos de transferencia.
