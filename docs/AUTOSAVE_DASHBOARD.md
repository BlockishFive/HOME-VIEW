# Panel privado y recuperación automática

La ruta `/privado` muestra primero las propiedades guardadas en el servidor. Buscar por título, zona, ciudad u operación y filtrar por estado no cambia ni publica datos. **Nueva propiedad** abre el formulario; **Editar borrador** carga la versión guardada y sus medios. Las fotografías de portada se cargan al mostrarse; las galerías y panoramas se descargan solo al abrir detalles, editar o exportar. Cerrar los detalles desmonta las vistas de medios para liberar recursos.

Los estados del filtro corresponden a publicación: borrador, publicada y cambios guardados pendientes de publicar. Las capturas incompletas del dispositivo aparecen en una sección separada, con título, fecha y cantidad de fotos/escenas. No se presentan como propiedades confirmadas del servidor.

## Durante la captura

- El guardado automático conserva los campos tal como están, aunque falten datos o sean inválidos. Mantiene por separado venta/renta, importes vacíos, condiciones, precisión pública, revisión de ubicación, fotos preparadas y escenas/conexiones 360. No normaliza un importe vacío a cero.
- Tras unos 800 ms sin cambios comienza una escritura local. **Guardando en este dispositivo…** significa que todavía está pendiente. **Guardado en este dispositivo · Pendiente de enviar al servidor** aparece solo después de confirmar la transacción IndexedDB. Espera ese estado antes de cerrar la pestaña o cambiar de app.
- El guardado automático no hace solicitudes de subida ni publica nada. **Guardar borrador privado** valida y envía al servidor. **Confirmado en el servidor** requiere respuesta exitosa; entonces se retira la recuperación local correspondiente. Para `/alta`, el botón confirma un borrador en el almacenamiento local habitual, no en el servidor.
- Si se corta internet con el formulario ya abierto, puedes seguir capturando y esperar la confirmación local. Los fallos del servidor conservan campos, fotos y recuperación. Cuando vuelva la conexión, guarda explícitamente. No hay una cola de envíos en segundo plano.
- Una captura recuperada conserva el ID de destino y la revisión del servidor. Reintentar no crea otro ID. Si alguien modificó esa propiedad o una respuesta anterior se perdió después de que el servidor guardara, se informa el conflicto y se conserva la captura; no se sobrescribe automáticamente una versión más reciente.
- **Volver a mis propiedades** intenta confirmar la recuperación antes de ocultar el editor. **Cerrar sesión** también lo intenta. Si hay una operación en curso o falla la copia local, permite cancelar la salida; salir de todos modos puede perder cambios que aún no estaban confirmados.

## Recuperar o descartar

1. Abre la misma dirección, dispositivo y perfil de navegador. En `/privado` necesitas conexión para cargar la aplicación y verificar la sesión.
2. Busca **Capturas en este dispositivo**. **Actualizar capturas del dispositivo** vuelve a leer las recuperaciones, incluidas las de otra pestaña.
3. Pulsa **Continuar captura**. Revisa la información y termina los campos que falten antes de guardar el borrador.
4. Si dos pestañas recuperan el mismo registro, una no puede reemplazar silenciosamente la escritura de la otra: el número de versión se compara en la misma transacción. **Guardar copia de recuperación** conserva otra captura local si hay conflicto. No crea otra propiedad del servidor.
5. **Descartar captura local** requiere confirmación y solo borra esa recuperación; conserva la propiedad del servidor o el borrador confirmado. Si reviertes todos los campos a su estado inicial, se elimina la recuperación obsoleta para no recuperar después texto que habías quitado.

Se conservan hasta 20 recuperaciones entre ambos modos. No se descartan las antiguas por antigüedad. Si se alcanza el límite o la cuota real del navegador, se muestra error y no se anuncia éxito. Guarda los borradores que puedas confirmar o descarta recuperaciones que ya no necesites.

## Dónde viven y qué privacidad tienen

Las recuperaciones están en IndexedDB, base `home-view-captures`, separada de `home-view-listing-drafts` y de SQLite del servidor. Usan blobs del navegador, no base64 en localStorage. Cada registro incluye su contenido parcial, ID de destino, revisión y fecha; nunca contraseña o token de sesión. No modifica ni migra destructivamente los borradores existentes.

El contenido sigue en ese navegador incluso tras cerrar sesión. La interfaz privada exige iniciar sesión, pero IndexedDB no cifra los datos ni los protege de otra persona con acceso al mismo perfil del dispositivo. En un equipo compartido, confirma y descarta lo pendiente antes de terminar. El aviso aparece antes de capturar. Borrar datos del navegador, cambiar de origen/perfil, modo privado o la expulsión de almacenamiento por el sistema puede eliminar estas recuperaciones.

`npm run backup:private` respalda SQLite del servidor, no las recuperaciones de IndexedDB. Puedes descargar la captura actual, una recuperación automática o el borrador confirmado. Los JSON se revisan y restauran como copias nuevas, sin reemplazar originales; véase [respaldos y editor visual](BACKUPS_AND_VISUAL_TOURS.md).

## Alcance de conexión y límites

La aplicación todavía necesita conexión para abrir sus pantallas, comprobar la sesión y acceder al servidor. El worker no cachea páginas privadas ni datos de propiedades: sin conexión al abrir muestra el aviso offline. Esta entrega permite conservar la captura de una pantalla ya abierta; no implementa un arranque completo sin internet ni acceso privado offline.

Se intenta guardar al pasar la página a segundo plano o abandonarla, pero iOS/el navegador puede suspender el proceso antes de completar una escritura. El estado confirmado es la referencia: no se puede garantizar el último cambio si se cierra inmediatamente o el sistema termina la app. Prueba Safari/iPad físico y la cuota disponible antes de una visita. Los escenarios automatizados usan material ficticio y Chromium; no equivalen a auditoría o validación física.

## Comprobar en el Codespace actual

Actualizar la rama `feat/piloto-venta-renta` y reiniciar `NEXT_TELEMETRY_DISABLED=1 npm run dev`. No repetir la creación del usuario.

Para una prueba: entra al panel, pulsa Nueva propiedad, escribe un título y añade una foto autorizada, espera Guardado en este dispositivo, recarga y pulsa Continuar captura. Completa y guarda; comprueba Confirmado en el servidor y actualiza la lista en otro dispositivo. La captura parcial solo estará disponible donde se guardó automáticamente; después de confirmar en el servidor, la propiedad estará disponible bajo sesión desde ambos dispositivos.
