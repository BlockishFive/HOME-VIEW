# Área privada y captura compartida del piloto

La ruta `/privado` permite crear, revisar, editar, descargar y eliminar borradores compartidos entre iPad y PC. Usa una cuenta privada única, creada por la persona administradora mediante terminal. No hay registro público, correo de recuperación ni pagos. Los anuncios e imágenes privados no aparecen en el catálogo de demostración.

## Activar en el Codespace

Actualiza la rama y detén primero el servidor de desarrollo con Ctrl+C:

```sh
git pull --ff-only origin feat/piloto-venta-renta
npm ci
npm run setup:private
NEXT_TELEMETRY_DISABLED=1 npm run dev
```

`setup:private` pide un usuario (3–80 caracteres, sin espacios), una contraseña nueva de al menos 14 caracteres y su confirmación. La contraseña no se muestra ni se escribe en archivos de configuración: se guarda un hash scrypt con sal aleatoria. Elige tus credenciales en esa terminal, no las envíes al chat ni las subas a GitHub.

Abre la **misma dirección HTTPS del puerto 3000** en ambos dispositivos y entra en **Área privada**. Inicia sesión con esa cuenta en cada uno. Después de guardar desde un dispositivo, pulsa **Actualizar lista privada** en el otro. No es edición colaborativa en tiempo real.

El formulario conserva la captura tras guardar. Una actualización antigua no puede sobrescribir una más reciente: el servidor devuelve conflicto y conserva la versión vigente. Ante un conflicto, conserva tu captura antes de recargar; revisa la versión del servidor y reconcilia los cambios manualmente. Descargar respaldo en la tarjeta exporta la versión guardada, no una edición que todavía no hayas podido guardar.

## Pasar la casa existente del iPad

1. En el navegador y dirección donde la capturaste, abre **Borradores locales** (`/alta#saved-title`).
2. Descarga un respaldo antes de transferir.
3. Inicia sesión en `/privado` en otra pestaña del mismo navegador, conservando la pestaña del borrador local.
4. Regresa a la tarjeta local y pulsa **Copiar al área privada**. Debe confirmar que la copia se guardó en el servidor. El original sigue en IndexedDB y no se elimina.
5. En la PC abre `/privado`, inicia sesión y actualiza la lista. Verás datos, fotos y escenas guardadas.

La copia es explícita y crea el registro privado si no existe. Intentar copiar de nuevo el mismo ID devuelve conflicto; usa el registro existente del área privada para editarlo. No se suben todas las capturas locales automáticamente.

## Dónde viven los datos

Por defecto, el servidor guarda `.home-view/private.sqlite` en el directorio del proyecto. Incluye metadatos, imágenes, panoramas, hash de acceso y sesiones. `.home-view/` está excluido de Git y fuera de `public`. `git pull`, `npm ci` y reiniciar Next.js no deben eliminarlo. No borrar esa carpeta, el Codespace o su volumen sin respaldo.

Para un volumen persistente externo se admite `HOME_VIEW_DATA_DIR=/ruta/privada/absoluta`. Puede definirse en `.env.local` (ignorado por Git) o en el entorno del proceso. Los comandos de configuración y respaldo leen `.env.local`, igual que Next.js. En un proxy propio fija también `HOME_VIEW_PUBLIC_ORIGIN=https://tu-dominio` para validar el origen público exacto. Codespaces usa automáticamente su hostname HTTPS exacto, no cualquier subdominio de GitHub. No usar `public`, `.next` ni una carpeta que se publique como archivos estáticos.

Esto es almacenamiento compartido **en un único servidor Node.js**, no una conexión a Supabase ni una base gestionada. Si el Codespace se suspende no responde; si se elimina y no tienes respaldo, se pierden los datos. Ambos dispositivos deben apuntar a ese mismo servidor. No desplegar esta base SQLite en funciones efímeras, múltiples instancias sin disco compartido o un sistema de archivos de solo lectura.

Antes de ofrecer una dirección estable independiente de Codespaces hace falta alojamiento Node.js con volumen persistente, HTTPS, copias externas y administración de la cuenta. La configuración actual es portable a ese servidor, pero este cambio no contrata ni despliega alojamiento externo.

## Respaldo y contraseña

```sh
npm run backup:private
npm run setup:private -- --reset
```

El respaldo es una instantánea consistente SQLite creada con `VACUUM INTO`. Incluye todos los medios y la configuración de acceso. La ruta se muestra en la terminal; conserva una copia en un lugar privado fuera del Codespace. No la subas al repositorio. El JSON descargado desde una tarjeta es útil para conservar una propiedad, pero su importación sigue pendiente.

`--reset` cambia la cuenta/contraseña mediante acceso a la terminal y revoca las sesiones, conservando las propiedades. No existe recuperación por correo. Para restaurar una instantánea: detén el servidor, conserva aparte la base actual y sus archivos `-wal`/`-shm`, coloca la instantánea como `private.sqlite` en un directorio privado vacío, ejecuta `setup:private -- --reset` y arranca con ese mismo HOME_VIEW_DATA_DIR. No mezcles una base restaurada con archivos WAL de otra base. Probar la restauración y los respaldos externos antes de operar de forma permanente.

## Controles y límites

- Sesiones aleatorias de siete días; en la base solo se conserva su hash. Cookie HttpOnly, SameSite=Strict y Secure con HTTPS. Cerrar sesión revoca el token; la cuenta puede tener sesiones independientes en iPad y PC.
- Escrituras exigen origen coincidente, sin CORS abierto. HTTP se admite solo para localhost/loopback; fuera de ahí se requiere HTTPS. No se aceptan tokens en URLs ni localStorage.
- Diez accesos fallidos bloquean durante 15 minutos. La limitación es global para la cuenta única del piloto, por lo que un atacante puede provocar un bloqueo temporal; no es un sistema de identidad multiusuario.
- Todas las lecturas/escrituras de datos y medios requieren sesión. API y medios usan `Cache-Control: private, no-store`; el service worker v3 sigue guardando solo aviso offline e iconos. El HTML del área privada no contiene propiedades: se descargan tras comprobar sesión.
- Validación independiente en servidor, sentencias SQL parametrizadas, actualización con revisión y transacciones atómicas para registro/medios. No se sustituyen datos ante una revisión antigua, incluida la eliminación.
- JPEG/PNG/WebP se decodifican y reencodan a JPEG mediante Sharp, con límite de 60 millones de píxeles y sin metadatos originales. Panoramas: esfera 2:1 de al menos 1024×512; fotos hasta 1920 px y panoramas hasta 4096 px. No se deduce una esfera de fotos normales.
- Máximo 8 fotos y 8 escenas, 48 MiB por solicitud, 50 registros y 300 MiB de medios activos en el piloto. Los límites por archivo se conservan: 5 MiB para fotos y 12 MiB para panoramas de entrada. Los archivos SQLite pueden ocupar más que los medios activos por índices, WAL y páginas libres.
- El servidor valida autorización declarada sobre medios. Esa casilla no sustituye revisión de rostros, documentos, interiores privados ni derechos reales. No se publica automáticamente.

## Validación y pendientes

Las pruebas de navegador se ejecutan con una base temporal aislada y credenciales ficticias. El puerto 3000 debe estar libre; se desactiva reutilizar servidores existentes para no probar contra datos reales. La prueba de dos contextos representa iPad/PC; falta validación en Safari y dispositivos físicos.

Continúan pendientes identidad multiusuario/roles, segundo factor, recuperación gestionada, almacenamiento cifrado/servicio de objetos, supervisión, backups externos automatizados, pruebas de restauración operativa, administración de disco y alojamiento estable. La base contiene material privado: proteger el volumen y las copias. Las sesiones y contraseña tienen hash, pero fotos y descripciones no están cifradas por la aplicación en reposo. Véase [seguridad](SECURITY.md).
