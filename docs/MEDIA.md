# Procedencia de medios

Los seis JPEG en `public/panoramas/` se han creado específicamente para Home View mediante `scripts/generate-demo-images.py`. No contienen imágenes de terceros, personas ni ubicaciones reales. La geometría, los materiales y la composición se definen en el script con primitivas matemáticas; son ilustraciones sintéticas de una sala, una cocina y una recámara.

- `sala.jpg`, `cocina.jpg`, `recamara.jpg`: panoramas equirectangulares 2048×1024 (2:1) para Marzipano.
- `*-cover.jpg`: vistas de perspectiva 1200×850 de las mismas escenas para el catálogo.

Las propiedades comparten estos medios para demostrar navegación. Los atributos comerciales ficticios no describen estas escenas. Los planos son esquemas originales sin escala.

La aplicación sirve los archivos incluidos; no requiere Python. Para regenerarlos opcionalmente:

```sh
python -m pip install numpy Pillow
python scripts/generate-demo-images.py
```

Al sustituirlos por fotografías se debe documentar autor, licencia, consentimiento, atribución cuando corresponda y revisión de privacidad. No descargar imágenes de resultados de búsqueda sin autorización.

El terreno de demostración utiliza `public/illustrations/terreno.svg`, un esquema original sin validez topográfica. La cartografía real de OpenStreetMap tiene atribución/licencia independiente y se carga desde el proveedor; no forma parte de las imágenes sintéticas. Las fotos aportadas al formulario de alta permanecen en el navegador hasta que el propietario las exporta; no se añaden automáticamente al repositorio.
