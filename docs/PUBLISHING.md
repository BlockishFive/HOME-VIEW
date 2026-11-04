# Publicar una propiedad durante el piloto

1. Abre `/privado`, inicia sesión y guarda o copia tu propiedad. En otro dispositivo pulsa **Actualizar lista privada**.
2. Elige la precisión pública, marca que revisaste la ubicación y guarda. Revisa la tarjeta guardada completa: operación, importes, condiciones, ubicación, fotos y panoramas. No se publican ediciones que aún estén en el formulario sin guardar.
3. Pulsa **Publicar propiedad** y confirma que tienes autorización y que el contenido no contiene datos personales. La ubicación capturada también se hará pública: usa un punto aproximado autorizado si no quieres divulgar el domicilio.
4. Abre **Ver publicación**. Aparecerá también en Inicio y en Renta/Venta/Terrenos según corresponda. Actualiza el catálogo de otros dispositivos; no hay sincronización en tiempo real.
5. Guardar cambios conserva la publicación anterior. Pulsa **Actualizar publicación** para reemplazarla con la versión guardada revisada. Un aviso indica cambios pendientes; una revisión obsoleta devuelve conflicto.
6. **Retirar publicación** quita la ficha y medios públicos, conservando el borrador. Eliminar un borrador también elimina su publicación. Las copias descargadas por visitantes no se pueden revocar.

Solo la cuenta privada única puede publicar, actualizar o retirar. No hay registro público ni roles de cliente. Las publicaciones son accesibles sin sesión privada a cualquiera que pueda abrir el sitio; la visibilidad del puerto de Codespaces sigue siendo independiente. Esto no despliega la aplicación ni elimina las restricciones de GitHub.

Se publica una copia de descripción, título, datos de venta/renta, mantenimiento, tipo, superficie, cuartos, ubicación autorizada y medios. No se publican credenciales, sesiones, nombres originales de archivos ni notas de migración. Los campos no capturados no se inventan. La UI está en español e inglés; los textos del anunciante conservan su idioma.

El snapshot incluye medios independientes. El límite de medios privados sigue siendo 300 MiB y el total de privados + publicados es 600 MiB (más metadatos, WAL y respaldos). Respaldar SQLite incluye las publicaciones. El servidor necesita almacenamiento persistente; no se ha configurado hosting permanente. Las respuestas públicas no se cachean y el worker no las guarda. Una página ya abierta puede conservar lo que cargó hasta actualizar.

## Captura con cámara 360 e iPad

Flujo compatible: tomar escenas con cámara 360 → unir/exportar desde su app a **JPEG equirectangular completo 2:1** → guardar en Fotos/Archivos del iPad → editar el borrador privado y añadirlas como panoramas → colocar conexiones por toque o ángulos, elegir orientación/inicio y revisar → guardar → actualizar publicación. Se pueden añadir después de publicar las fotos normales. No se convierte automáticamente una panorámica parcial de iPhone en una esfera.

La app acepta JPEG/PNG/WebP de hasta 12 MiB por panorama, mínimo 1024×512 y relación exacta 2:1, máximo 8 escenas; el envío completo no supera 48 MiB. El servidor reencoda hasta 4096×2048. No admite RAW ni formatos propietarios de cámara ni los une automáticamente. No hay conexión directa por Bluetooth/Wi-Fi ni SDK de fabricantes. Probar exportaciones reales con el modelo de cámara y Safari del iPad antes de una visita; la prueba automática usa escenas sintéticas autorizadas.

## Próxima mejora de mapas

El mapa actual conserva Natural Earth/PMTiles local: sirve de referencia general y no tiene calles completas ni direcciones actualizadas. No confundir un marcador manual con geocodificación ni precisión catastral.

Ya hay una capa de calles raster de OpenStreetMap opcional y un buscador Photon bajo sesión, con selección manual y GPS. La ubicación privada se separa de la precisión pública. Véase [captura de ubicación](LOCATION_CAPTURE.md) para flujo, límites, permisos, atribución y validaciones pendientes. Se mantiene el mapa local de referencia; no garantiza cobertura completa de Marroka, ni numeración o precisión catastral. Un proveedor con SLA/cobertura verificada y las rutas siguen pendientes para un uso mayor.

El editor visual y los respaldos conservan orientación y conexiones en el borrador; no alteran una publicación hasta Guardar y Actualizar publicación. Una restauración JSON crea otra captura local, nunca reemplaza un snapshot. Véase [respaldos y editor visual](BACKUPS_AND_VISUAL_TOURS.md).
