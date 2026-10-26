# Validación del piloto venta/renta

Comprobado el 26 de octubre de 2026 con Node.js 24.19.0, npm 11.9.0, Next.js 16.4.3 y Chromium del sistema (`/usr/bin/chromium`). Base revisada: `main` en `99ef514c69eb515d1a726e90bd318afec28e418f`. Se leyeron AGENTS.md, README y las guías instaladas de Next.js antes de modificar la aplicación.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| `npm ci --cache /workspace/.cache/npm` | Dependencias del lockfile instaladas |
| `npm test` | 26 pruebas aprobadas |
| `npm run typecheck` | Sin errores |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | Compilación de producción y generación de las 14 páginas completadas |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium NEXT_TELEMETRY_DISABLED=1 npx playwright test --workers=2` | 27 pruebas aprobadas sobre servidor de producción |
| `npm audit --json` | 0 vulnerabilidades conocidas reportadas en esta ejecución |
| `git diff --check` | Sin errores de espacios |
| Revisión visual en viewport de 390 px | Formulario, costos y ficha de renta legibles y sin desbordamiento horizontal |

`NEXT_TELEMETRY_DISABLED=1` evita escrituras de configuración en el directorio personal de solo lectura de este entorno. Las comprobaciones de red/servidor requieren que el entorno permita conexiones de npm y loopback. El proyecto no incluye un script de lint independiente.

## Cobertura

- Catálogo, panel del mapa y ficha de renta sin predial; venta con precio de compra, predial y mantenimiento sin requisitos de arrendamiento.
- Cuota adicional de $900 sobre renta de $18,000 → total de $18,900. Cuota incluida → $18,000, sin duplicar. Importes o inclusión pendientes no generan total ni cero ficticio. Servicios, depósito y póliza quedan fuera de la suma. Los centavos se conservan.
- Requisitos independientes y aval o póliza como alternativas, mascotas, amueblado, cuatro servicios y pertenencia a conjunto con estado desconocido explícito.
- Formulario por operación, error con foco accesible, guardado/edición sobre un único ID, recarga, exportación de fotografías, eliminación y errores de almacenamiento/imágenes.
- Migración IndexedDB v1 no destructiva al leer: precio conservado, cuota con inclusión pendiente, requisitos no inferidos y guardado explícito en v2.
- Fotos normales separadas de panoramas, rechazo de proporciones incorrectas, dos escenas procedurales, conexión manual y ángulo persistido, visor Marzipano real, limpieza de conexiones al eliminar escena y apertura guardada bajo demanda.
- Manifest e iconos PNG, registro del worker, caché limitada y aviso sin conexión.
- Pruebas previas de galería, teclado, compartir/imprimir, 404, WebGL, filtros y mapa. El archivo PMTiles real conserva HTTP Range/206; no se sustituyó por cartografía simulada ni se añadieron peticiones a proveedores externos.

## Comprobaciones pendientes

No se comprobó la instalación desde la interfaz del sistema operativo en teléfonos físicos iOS/Android, el rendimiento en móviles de poca memoria ni el uso con lectores de pantalla reales. El viewport automatizado no sustituye esas pruebas. La auditoría de dependencias no equivale a una auditoría de seguridad.

No existe todavía backend ni acceso privado, almacenamiento compartido, sincronización, importación de respaldos, resolución de conflictos entre pestañas, panoramas multirresolución ni edición offline completa. Se conserva un aviso offline, no las pantallas completas de Next.js. Las fotos/panoramas de pruebas son ilustraciones procedurales del repositorio; no se añadieron datos de inmuebles o personas reales.

Antes de un uso compartido consultar [seguridad](SECURITY.md), [arquitectura](ARCHITECTURE.md) y [PWA](PWA.md). No se implementaron pagos ni registro público; este cambio no despliega ni publica los borradores.
