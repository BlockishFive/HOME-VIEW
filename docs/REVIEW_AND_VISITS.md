# Revisar el anuncio y preparar la visita

## Revisar la captura y la versión guardada

**Revisar captura actual**, junto al botón Guardar, usa los campos y medios que están en el formulario. Puedes abrirlo aunque falte información: indica qué impide confirmar/publicar y qué permanece por confirmar. Abrir/cerrar no guarda ni sube la captura. Se conservan el formulario y su recuperación automática.

**Revisar anuncio guardado**, en una tarjeta, muestra el registro confirmado. En `/privado`, **Publicar propiedad** y **Actualizar publicación** abren la misma revisión, leyendo la versión actual del servidor. Las ediciones que aún están en el formulario no forman parte de ella. La versión del editor se conserva separada; revisar o publicar no envía silenciosamente esos cambios. En `/alta`, la revisión corresponde al borrador confirmado en ese navegador, con publicación desde el área privada después de copiarlo.

La lista distingue:

- **Antes de poder publicar:** datos obligatorios incompletos/incorrectos, falta de fotografías o derechos, ubicación sin revisar y errores de escenas. Hay que corregir y guardar. La referencia de acceso es opcional; si capturas una coordenada necesita la otra para confirmar el borrador.
- **Información por confirmar:** mantenimiento, pertenencia a conjunto y términos específicos de la operación. Se permite publicar estas condiciones como «Por confirmar». Una renta no lista predial; una venta no lista requisitos de arrendamiento. Aval o póliza no exige completar los requisitos independientes. Una cuota incluida no se suma otra vez, y un importe desconocido no se convierte en cero.
- **Recorrido opcional y conexiones:** el anuncio puede presentar solo fotos. Las advertencias de camino/retorno no inventan conexiones; la lista de escenas sigue siendo una alternativa.

**Ver ficha previa** reutiliza el contenido de la ficha pública: fotografías ampliables, descripción, importes, condiciones, recorrido si existe y mapa con la precisión pública seleccionada. La cabecera indica que es una vista previa. No tiene enlaces para compartir una publicación inexistente. La referencia privada de acceso puede consultarse en la revisión, en un panel separado de la ficha previa.

## Confirmar la publicación

1. En el área privada, guarda el borrador y abre **Publicar propiedad** o **Actualizar publicación**.
2. Revisa la lista y **Ver ficha previa**. Las imágenes, textos y ubicación también necesitan autorización y revisión visual.
3. Marca **Revisé la ficha, sus medios y los campos por confirmar; autorizo publicar esta versión guardada**.
4. Pulsa **Confirmar publicación** y acepta la confirmación final. Solo entonces se solicita publicar el snapshot.
5. Si el servidor rechaza una revisión antigua, la ventana y el formulario se conservan. Pulsa **Actualizar versión para revisar**; se carga la nueva versión y se reinicia la confirmación. Revísala otra vez. No se adopta automáticamente una revisión para sobrescribirla.

Cancelar, cerrar o ampliar una foto no publica. El cierre de la galería ampliada vuelve a la revisión principal. La revisión tiene foco modal y cierre visible; Escape la cierra cuando no hay una operación en curso. Retirar una publicación conserva su confirmación explícita y no borra el borrador.

## Separar vivienda y acceso para visitas

En Ubicación existen dos modos:

- **Ubicar inmueble** edita el punto privado que ya existía. La precisión pública se deriva solo de este punto.
- **Ubicar acceso para visitas** edita una referencia opcional, por ejemplo la entrada del fraccionamiento. No cambia las coordenadas de la vivienda ni su revisión de precisión pública. No se copia automáticamente el punto de la vivienda para llenar un acceso desconocido.

El marcador verde es el punto que estás editando. El amarillo muestra la otra referencia cuando existe. Búsqueda, GPS, toque y arrastre se aplican al modo activo. Cambiar de modo cancela una búsqueda pendiente; una respuesta GPS tardía de otro modo no sustituye el punto actual.

También puedes escribir **Latitud del acceso privado**, **Longitud del acceso privado** y **Referencia de llegada privada**. Las notas admiten hasta 600 caracteres. Usa referencias físicas: no registres códigos de acceso, contraseñas o datos personales. Puedes quitar la referencia antes de guardar; no borra ni mueve el inmueble.

**Ampliar mapa de captura** facilita trabajar en el iPad. **Centrar referencia de captura** vuelve al punto seleccionado, y **Ver inmueble y acceso** encuadra ambos. Estas acciones solo cambian la vista. Se conservan los dos marcadores al cambiar de proveedor o idioma. El PMTiles local y la capa opcional OpenFreeMap siguen disponibles; cambiar de fuente respeta el máximo de zoom de cada una.

## Comprobar cobertura y llegada

Los enlaces **Comparar en OpenStreetMap**, **Comparar en Google Maps** e **Indicaciones en Google Maps** abren otra página con las coordenadas del punto activo. En el panel de referencia de acceso corresponden a ese acceso. Solo el clic abre el proveedor; no hay consulta automática, SDK, clave o copia de sus datos. Se comparten esas coordenadas y la solicitud normal del navegador, no las notas privadas. El aviso aparece junto a los enlaces.

Para Marroka: compara las calles y el acceso en el iPad, verifica en campo cuál entrada corresponde y distingue esa entrada de la casa. Si un servicio no reconoce el fraccionamiento, usa una referencia pública conocida y corrige manualmente. La disponibilidad del proveedor y la observación en campo son las referencias; esta entrega no certifica que sus calles o numeración estén completas o actualizadas. Los enlaces externos no solucionan restricciones de una red.

## Dónde se conserva y qué se publica

El acceso usa el campo opcional `visitAccess`: strings de latitud/longitud y notas. Las capturas automáticas y los respaldos portátiles conservan también valores parciales. Para confirmar un borrador, ambas coordenadas deben estar vacías o formar un par válido dentro del rango aproximado de México. Notas sin coordenadas son válidas. El servidor valida estructura y límites otra vez.

Los borradores locales y recuperaciones están en IndexedDB; los privados confirmados se guardan en SQLite con sesión. Los JSON de respaldo incluyen esta referencia privada: protegerlos como el resto de las coordenadas y medios. Una importación sigue creando una copia local nueva, no una publicación. No se cambia la versión estructural de las bases ni se reescriben los registros antiguos al abrir; la ausencia del campo conserva una referencia vacía.

`visitAccess` nunca forma parte del DTO/snapshot público ni de sus mapas, HTML o RSC. La vista previa y la publicación comparten una lista explícita de campos públicos. Elegir punto exacto solo autoriza el punto del inmueble, no publica el acceso ni sus notas. Una descripción o foto puede revelar referencias por sí misma: revisarlas antes de confirmar.

## Comprobación pendiente en campo

Las pruebas usan coordenadas, calles y medios ficticios, GPS simulado, respuestas externas interceptadas y tamaños de iPad. Verifican revisión/modal/galería, versiones, exclusión de datos privados, parejas de coordenadas, gestos, marcadores y persistencia/respaldos. Falta Safari/iPad físico, GPS y cobertura real de Marroka, precisión de proveedores y recorrido de llegada. Se mantienen las limitaciones de red de [LOCATION_CAPTURE.md](LOCATION_CAPTURE.md), los pendientes de seguridad y la necesidad de conexión al abrir el área privada. No se añade alojamiento público ni arranque offline completo.
