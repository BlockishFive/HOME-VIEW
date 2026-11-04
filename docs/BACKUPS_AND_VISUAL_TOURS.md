# Respaldos portátiles y editor visual 360

## Descargar antes de una visita o de cambiar de dispositivo

- **Descargar captura actual**, en **Respaldar y restaurar**, conserva el formulario tal como está: campos incompletos, renta/venta por separado, condiciones, fotos y escenas con sus conexiones y orientación.
- **Descargar captura**, en una recuperación del dispositivo, exporta la versión automática que ya está confirmada en IndexedDB.
- **Descargar respaldo**, en la tarjeta de una propiedad, exporta el borrador confirmado. En el área privada descarga sus medios bajo sesión; no incluye una edición posterior que todavía esté en el formulario.

El archivo JSON contiene información privada, coordenadas completas y medios. No incluye contraseña, sesión, revisión del servidor ni estado de publicación. Conserva una copia privada fuera del Codespace y del navegador. En iPad busca la descarga en Archivos/Descargas; la interfaz exacta depende de Safari. La copia del archivo a otro dispositivo es manual.

## Revisar y restaurar

1. Abre `/alta`, o inicia sesión en `/privado` si vas a trabajar en el área privada. En ambos existe **Respaldar y restaurar**.
2. Pulsa **Seleccionar respaldo de Home View**. La aplicación lee y verifica el archivo antes de ofrecer la restauración. La vista previa muestra título, operación, zona, fotografías y escenas. Puedes cancelar sin escribir datos.
3. Marca **Revisé el respaldo y quiero restaurarlo como una copia nueva** y pulsa **Restaurar como captura nueva**.
4. Espera **Copia restaurada en este dispositivo**. Pulsa **Continuar captura** en la nueva recuperación. El formulario que estuvieras editando se conserva; no se sustituye al seleccionar o importar un archivo.
5. Revisa los datos y vuelve a confirmar autorización de las imágenes y ubicación. Los campos vacíos y «Por confirmar» se mantienen. Completa lo que falte y guarda.

Cada importación crea una copia nueva con identificadores nuevos para propiedad, fotos y escenas; las conexiones se remapean a las nuevas escenas. No reemplaza una propiedad o captura existente aunque el archivo proceda de ella. Guardar la copia crea otra propiedad: si querías editar la original, usa Editar en su tarjeta. No hay combinación o reemplazo automático entre versiones.

En `/privado`, importar **solo escribe la recuperación local**. Debes pulsar **Guardar borrador privado** para enviarla al servidor y verla en otro dispositivo. Publicar es otra acción explícita. Restaurar un archivo no restaura usuarios, permisos, publicaciones o la configuración del servidor.

## Formatos, validación y límites

Se admiten los JSON `home-view-local-draft` versiones 1 y 2 y `home-view-capture` versión 1. Las exportaciones de borradores confirmados conservan versión 2; los nuevos respaldos de capturas parciales usan un formato distinto para no presentar información incompleta como un borrador validado. Los antiguos se migran con las mismas reglas de venta/renta: no se infieren aval, póliza, servicios, exención de cuota ni inclusión del mantenimiento.

Límites: archivo de hasta 70 MiB, hasta 48 MiB de imágenes, 8 fotografías y 8 panoramas. Cada foto admite hasta 5 MiB y cada panorama hasta 12 MiB antes de decodificar. Solo JPEG/PNG/WebP embebidos en base64; se rechazan enlaces externos y SVG. Se verifican estructura, enums, tamaños, firma de imagen, topología, ángulos y orientación. En el navegador las imágenes se decodifican y reencodan secuencialmente sin metadatos; las dimensiones máximas se limitan como en la captura habitual. Un error no escribe una restauración parcial.

La restauración se confirma después de completar la transacción IndexedDB. Si falta espacio o falla, el archivo revisado queda disponible para reintentar. Siguen aplicando el límite de 20 recuperaciones y la cuota real del navegador. El límite de archivo no garantiza memoria suficiente en todos los iPad: prueba archivos pequeños y el dispositivo real. No hay cifrado de estos JSON ni garantía frente a limpieza/expulsión del almacenamiento local.

`npm run backup:private` sigue respaldando SQLite, sus medios y configuración por terminal. Es distinto de estos JSON por propiedad. La restauración operativa de SQLite y las copias externas automatizadas mantienen las instrucciones y pendientes de [PRIVATE_PILOT.md](PRIVATE_PILOT.md).

## Colocar conexiones visualmente

1. Exporta la captura de la cámara como JPEG equirectangular completo 2:1 y transfiérela al iPad. Añádela como panorama, separada de las fotografías normales. No hay conexión directa con la cámara ni conversión de una panorámica parcial de iPhone a esfera.
2. En una escena pulsa **Editar visualmente escena…**. El editor reutiliza Marzipano y carga un único visor. Puedes elegir otra escena desde el selector.
3. Elige **Destino de la flecha**, pulsa **Activar colocación por toque** y toca una puerta o referencia. La posición se proyecta a coordenadas esféricas; no depende del tamaño de pantalla. Arrastrar y los gestos con varios dedos no crean conexiones.
4. También puedes orientar la vista con los botones y pulsar **Colocar flecha en el centro de la vista**. Es una alternativa accesible al toque. Los campos numéricos anteriores siguen disponibles.
5. Si ya existe una flecha al destino, colocarla de nuevo actualiza su posición. No duplica la conexión. El regreso se coloca por separado en la otra escena; no se inventa un ángulo de retorno.
6. Ajusta la mirada y el zoom y pulsa **Usar esta vista al entrar**. Se guarda orientación/zoom por escena. **Empezar recorrido en escena…** mueve esa escena al inicio sin cambiar IDs ni conexiones.
7. Revisa **Abrir vista previa 360**, guarda el borrador y, si ya estaba publicado, actualiza la publicación explícitamente. La orientación y orden se conservan en recuperación, respaldo, servidor y snapshot público.

El panel **Revisar conexiones del recorrido** avisa de escenas sin camino desde el inicio o sin camino de regreso. Son advertencias de un grafo dirigido, no una reconstrucción de la casa: no bloquean un borrador incompleto. La lista de escenas sigue disponible aunque falten conexiones. Eliminar una escena elimina sus enlaces entrantes. Nombres vacíos pueden recuperarse como captura parcial, pero necesitan completarse antes de confirmar un borrador.

## Alcance de las pruebas

Pruebas automatizadas con datos y medios ficticios, Chromium, tamaño iPad y dos contextos de navegador. Se incluyen restauración sin sobrescritura, fallos de almacenamiento, contenido externo/malformado, toque/arrastre/multitouch, orientación, persistencia, validación de servidor y publicación. No equivalen a Safari/iPad físico, transferencia con cámara real, auditoría de seguridad o garantía de memoria. Abrir la app y verificar el acceso privado siguen requiriendo conexión; no se añade arranque offline completo ni envío en segundo plano.
