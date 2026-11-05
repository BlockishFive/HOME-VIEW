# Historial y recuperación del servidor

## Versiones y actividad

En **Área privada → Historial y actividad**, pulsa **Actualizar historial y actividad**, elige la propiedad y revisa sus versiones. Se cargan metadatos al abrir el panel; las fotos y el recorrido se descargan al abrir su vista previa, bajo la misma sesión privada. La captura sin guardar y la versión confirmada del servidor siguen siendo independientes.

**Restaurar como borrador** crea una revisión nueva del mismo inmueble. Conserva fotos, escenas, conexiones, mirada inicial, condiciones por operación y referencias privadas de la versión elegida. Reinicia la autorización de imágenes y la revisión de ubicación: abre ese borrador, comprueba los datos, vuelve a autorizarlos y guarda antes de publicar. El formulario que ya tenías abierto permanece intacto y conserva su revisión original para detectar conflictos. La acción solicita primero un checkpoint local; si falla, bloquea la restauración y muestra el error.

La publicación que ya existe sigue siendo una copia independiente. Restaurar no publica ni actualiza esa copia. Eliminar un borrador retira su publicación y sus medios públicos, pero retiene versiones privadas para recuperar errores. También puedes restaurar un borrador eliminado, que reaparece sin publicación. Una operación con revisión o estado de eliminación antiguo devuelve conflicto; actualizar una lista nunca adopta silenciosamente la revisión de tu editor.

Límites del piloto:

- Hasta **10 revisiones por propiedad**, incluyendo la actual. La undécima elimina la más antigua y sus medios sin referencias.
- Hasta **200 propiedades con versiones retenidas** y **300 MiB de medios históricos**, adicionales a las cuotas de contenido vigente/publicado. Los bytes idénticos se comparten entre versiones mediante SHA-256. Al superar una cuota, se rechaza toda la escritura, sin sustituir datos vigentes ni registrar un éxito falso.
- **Eliminar versiones anteriores** conserva solo la actual de un borrador activo. **Eliminar historial definitivamente** quita las versiones recuperables de uno eliminado. Se conserva un identificador/revisión mínimo para rechazar escrituras antiguas; el registro de actividad y los respaldos externos son independientes.
- La actividad conserva hasta **5,000 eventos**: guardar, restaurar, eliminar, publicar, retirar, purgar historial, configurar/restablecer acceso, crear respaldo y restaurar servidor. Registra fecha, acción y UUID/revisiones, sin contraseñas, tokens, IP, nombres de archivos ni textos privados. No registra todas las lecturas ni intentos de autenticación; no es auditoría externa ni inalterable frente al operador.

La primera apertura de una base anterior crea una versión inicial a partir de cada registro disponible. No reconstruye cambios que nunca se guardaron. El esquema SQLite pasa de `user_version=0` a `1`; conserva los datos y las publicaciones. Una versión futura desconocida se rechaza.

## Respaldo completo verificado

Necesitas Node.js 24 con `node:sqlite`, las dependencias instaladas y el usuario privado ya configurado. No repitas `setup:private` para respaldar o recuperar. Los comandos no imprimen contraseñas ni tokens.

```bash
npm run backup:private
```

El resultado indica la ruta de un `.sqlite` y un `.sqlite.manifest.json`. Es una instantánea consistente por `VACUUM INTO`, aun cuando el sitio usa WAL. Se verifican integridad SQLite, referencias, esquema conocido, cuotas, campos, grafo, dimensiones, contenido JPEG y hashes de medios históricos. Las imágenes se comprueban una a una; no se descargan URLs del archivo. La base activa conserva sus sesiones y registros.

Guarda **ambos archivos juntos**, en una ubicación privada fuera del Codespace. Contienen datos privados, medios, versiones, publicaciones y verificadores de contraseña mediante hash. No tienen cifrado de archivo. El manifiesto SHA-256 detecta cambios accidentales; no autentica al autor ni sustituye un respaldo confiable.

Para verificar de nuevo una copia (sustituye la ruta por la real):

```bash
npm run verify:private -- /ruta/privada/respaldo.sqlite
```

Los respaldos anteriores sin manifiesto pueden comprobarse estructuralmente y restaurarse; la salida indica expresamente que no existe un checksum anterior con el cual comparar. No uses una copia directa de una base activa con sus archivos `-wal`/`-shm`: crea antes la instantánea mediante el comando.

## Ensayo de restauración sin reemplazar la base activa

Este ejemplo usa una carpeta nueva. Si ya existe y contiene archivos, el comando se detiene; no hay opción de sobrescritura.

```bash
npm run restore:private -- /ruta/privada/respaldo.sqlite .home-view/restore-check
```

La herramienta valida la copia original, verifica el checksum cuando existe, copia a una carpeta temporal privada, migra el esquema si corresponde, **revoca todas las sesiones** y los bloqueos de intentos, registra la recuperación, verifica otra vez y renombra la carpeta preparada. Conserva el usuario y el hash de contraseña originales. No cambia `.env.local`, no reemplaza la base activa, no arranca un servidor y no escribe en el respaldo original. Rechaza rutas versionadas, `public`, enlaces simbólicos directos, archivos auxiliares y destinos no vacíos.

Tras compilar, puedes arrancar esa copia en otro puerto y mantener el original en 3000:

```bash
NEXT_TELEMETRY_DISABLED=1 npm run build
HOME_VIEW_DATA_DIR="$PWD/.home-view/restore-check" NEXT_TELEMETRY_DISABLED=1 npm run start -- --port 3001
```

Mantén privado el puerto 3001 de Codespaces y abre su vista previa únicamente para la prueba. La copia contiene las publicaciones vigentes en el momento del respaldo: se verán al arrancarla. Inicia sesión otra vez con las credenciales que tenía ese respaldo; una cookie anterior no sirve. Comprueba una propiedad con fotos, 360, condiciones, historial y publicación. Detén esa terminal con `Ctrl+C` al terminar; el servidor original no cambia.

Restaurar una instantánea también recupera lo publicado entonces, incluso si después lo retiraste del servidor original. La herramienta no mezcla bases ni aplica eventos posteriores. Para una recuperación operativa real, detén el servicio, conserva un respaldo del estado actual y decide qué publicaciones siguen autorizadas antes de cambiar su configuración. No apuntes ambas instancias a una misma carpeta restaurada.

## Qué no incluye

La instantánea SQLite **no contiene** capturas automáticas o borradores que sigan exclusivamente en IndexedDB del iPad/PC, ni `.env.local`, secretos del despliegue o cartografía estática del repositorio. Para esos borradores usa **Descargar captura actual** o **Descargar respaldo** en su navegador. La recuperación ante pérdida completa del Codespace requiere conservar también código/configuración de forma privada, sin subir bases ni claves a GitHub.

La eliminación del historial es lógica en la aplicación, no una garantía de borrado físico seguro del volumen/WAL, copias del proveedor o respaldos externos. Quedan pendientes cifrado operativo, rotación automática y monitorización de respaldos, política de retención, auditoría independiente y pruebas periódicas en la infraestructura definitiva.
