# Ensayo de campo con iPad y cámara 360

Este checklist está preparado para la visita; todavía requiere un iPad/Safari y una cámara reales. Las pruebas automatizadas usan Chromium, vistas de 820×1180 y archivos sintéticos autorizados. No sustituyen esos dispositivos, el GPS real ni la cobertura de Marroka.

## Antes de salir

1. Actualiza `feat/piloto-venta-renta`, instala con `npm ci` y arranca `NEXT_TELEMETRY_DISABLED=1 npm run dev`. Abre el puerto 3000 por HTTPS desde Safari. Mantén activo el Codespace y conserva su misma dirección en ambos equipos; no hace falta instalar GitHub en el iPad.
2. Entra al área privada desde iPad y PC con tu cuenta existente. Comprueba **Actualizar lista privada**. No crees usuarios públicos: el piloto tiene un único propietario administrador.
3. Crea un respaldo completo del servidor y guarda el `.sqlite` junto a su manifiesto en un lugar privado fuera del Codespace. Ensaya una restauración en carpeta/puerto separados según [HISTORY_AND_RECOVERY.md](HISTORY_AND_RECOVERY.md).
4. Prueba transferir una foto y un panorama desde la cámara a Archivos/Fotos del iPad. Exporta el panorama **ya unido, equirectangular 2:1**, JPEG/PNG/WebP, mínimo 1024×512, máximo 12 MiB y 60 millones de píxeles. Un archivo RAW/INSV/DNG o una panorámica parcial del iPhone necesita procesarse antes con la aplicación del fabricante; no se convierte automáticamente en esfera completa.

## Captura y publicación controlada

1. Crea una casa ficticia o usa exclusivamente datos/imágenes autorizados. Registra renta/venta, términos y mantenimiento con sus estados reales. Deja lo desconocido **Por confirmar**. No introduzcas datos de personas, códigos de portón o documentos en notas/fotos.
2. Registra el inmueble y, si hace falta, el acceso privado por separado. Comprueba GPS y el punto sobre calles; cambia entre mapa local y OpenFreeMap. Contrasta numeración/ubicación en campo. El mapa local conserva su cobertura limitada; no acredita calles actuales ni límites catastrales. No copies imágenes/teselas de Google.
3. Separa fotos normales y panoramas. Elige **Equilibrado · hasta 3072 px** para reducir memoria/transferencia o **Mayor detalle · hasta 4096 px** para escenas con más detalle. Los originales no se modifican. Si no hay panoramas, guarda y añádelos después.
4. Añade 2–8 escenas con nombres claros, flechas manuales de ida/regreso, escena inicial y mirada de entrada. Revisa una por una. Comprueba que el iPad responde al girar, ampliar, cambiar habitación, rotar la pantalla y volver desde otra app. Si falla el visor, **Volver a intentar** reinicia solo el visor.
5. Interrumpe brevemente la conexión mientras editas. Comprueba el estado **Guardado en este dispositivo**; no cierres ni borres Safari para forzar una recuperación. Restablece conexión, guarda explícitamente en el área privada y verifica la confirmación del servidor.
6. En PC pulsa **Actualizar lista privada** y abre esa misma casa. Comprueba términos, fotos, 360 y acceso privado. Edita una versión y confirma que la captura antigua del iPad devuelve conflicto sin sobrescribirla.
7. En **Historial y actividad**, revisa una versión anterior, restaúrala y comprueba que crea un borrador nuevo, conserva tu captura abierta, exige autorización otra vez y deja la publicación independiente. Prueba eliminar/recuperar únicamente registros ficticios; purgar historial es una acción explícita.
8. Revisa la ficha pública previa y la precisión elegida antes de confirmar una publicación ficticia. Desde una sesión sin autenticar, verifica fotos/360 publicados y que no se divulgan notas/acceso/coordenadas privadas. Retira la publicación al terminar la prueba. No publiques una dirección o fotografías reales sin autorización.
9. Descarga también el JSON de cualquier captura que siga solo en el iPad. Cierra sesión y comprueba que las pantallas privadas quedan ocultas; las recuperaciones locales siguen vinculadas a ese perfil/origen y no están cifradas.

## Qué registrar para revisar juntos

- Modelo de iPad, versión de iPadOS/Safari, navegador normal/PWA y dirección usada.
- Cámara/app/formato de exportación, dimensiones, bytes y número de fotos/escenas; no incluir archivos personales en issues públicos.
- Tiempo de preparación, guardado y apertura del recorrido; bloqueo visible, recarga de Safari, consumo de batería/calor y paso a otra app. No hay telemetría automática.
- Resultado de recuperación sin conexión, edición concurrente, revisión/restauración, publicación/retirada y respaldo completo.
- Calles/ubicaciones que requieren corrección y proveedor utilizado. La disponibilidad externa no se garantiza.

## Base de rendimiento implementada

`image-metadata.ts` lee cabeceras acotadas de JPEG/PNG/WebP y orientación EXIF antes de asignar píxeles. `browser-media.ts` verifica 60 MP y cuotas, usa `createImageBitmap` con reducción cuando existe y un fallback acotado para Safari. Reencoda JPEG sin los metadatos originales, procesa secuencialmente y libera bitmap, canvas y ObjectURL. El mismo camino prepara las imágenes importadas desde JSON.

El visor descarga una sola vez el panorama activo (máximo 12 MiB), comprueba dimensiones/decodificación y entrega una ObjectURL temporal a Marzipano. Cancela cargas al cambiar de escena y destruye la instancia/textura anterior. Reintentar no recarga la página ni el formulario. Las escenas guardadas siguen sin abrir un visor hasta pedirlo.

La prueba `history-performance.spec.ts` genera fotos de 6000×4000 con orientación y panoramas de 8192×4096, prepara ocho escenas en los dos tamaños, comprueba procesamiento secuencial, dimensiones y metadatos retirados, rechazo previo a decodificación de una cabecera de 200 MP y navegación de las ocho escenas. Produce `media-benchmark.json` en `test-results` con tamaños/tiempos y pausas del event loop. El resultado es una referencia reproducible de Chromium; no acredita memoria, GPU ni tiempos de Safari físico. Para ejecutarla después de compilar:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npx playwright test tests/browser/history-performance.spec.ts --workers=1
```

Pendientes: cámara/iPad físico, WebKit real, almacenamiento/evicción de iOS, multirresolución por mosaicos para imágenes de mayor calidad, trabajo de imagen aislado en worker, almacenamiento persistente/monitorizado del servidor y offline completo. No se alquila ni despliega hosting en este bloque.

La ejecución del 5 de noviembre queda registrada en [VALIDATION.md](VALIDATION.md) y su [JSON de referencia](benchmarks/media-chromium-2026-11-05.json). Incluye una pausa máxima observada de 2.353 s durante preparación/transferencia automatizada; sigue pendiente reducir y medir esas pausas en Safari físico antes de prometer una experiencia sin bloqueos.
