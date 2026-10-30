# Políticas en PDF

Implementación: 30 de octubre de 2026.

## Interfaz

La navegación pública incorpora **Políticas** y la búsqueda general encuentra
sus títulos y descripciones. La biblioteca tiene búsqueda sin recarga y seis
documentos por página, con tamaño, fecha de actualización, acceso al visor y
descarga directa. Cada documento dispone de una página con descripción completa,
visor PDF, ampliación y descarga alternativa para dispositivos sin visor integrado.

En el panel, **Políticas → Nueva política** permite cargar un PDF de hasta 50 MB,
título y descripción, y decidir si será visible o borrador. El límite mostrado
respeta la configuración efectiva del servidor. Un capacitador administra su
sede; superadministración selecciona la sede al crear y puede gestionar todas.
La sede de una política existente no cambia desde este formulario.

La gestión permite editar el texto sin cargar de nuevo el documento, sustituir
el PDF, ocultarlo o eliminarlo. Guardar y eliminar requieren confirmación.
Los errores conservan el formulario y la selección para reintentar; las cargas
muestran progreso y evitan dobles envíos. El PDF guardado se puede revisar en
la misma pantalla de gestión. No se registran vistas de capacitación al consultar
políticas ni se crean exámenes para ellas.

## Backend y datos

- [PolicyMigration.php](../backend/src/Migrations/PolicyMigration.php) crea
  `policies`: sede, creador, título, descripción, archivo único, visibilidad y fechas.
- [PolicyTool.php](../backend/src/Services/PolicyTool.php) controla consultas,
  permisos, transacciones, sustitución y eliminación.
- [PolicyAgent.php](../backend/src/Agents/PolicyAgent.php) atiende la API.
- [policies.js](../public/frontend/pages/policies.js) implementa biblioteca,
  detalle y editor usando el visor y paginador compartidos.
- `FileTool` conserva los PDF en almacenamiento privado y solo entrega documentos
  publicados o autorizados por sede. El borrado genérico de un archivo vinculado
  queda bloqueado: se gestiona desde Políticas. La revisión de huérfanos excluye
  archivos de políticas.

Rutas bajo `/api/v1`:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/policies` | Biblioteca pública de documentos visibles |
| GET | `/policies/{id}` | Detalle visible |
| GET | `/admin/policies` | Gestión filtrada por sede |
| GET | `/admin/policies/{id}` | Detalle administrativo autorizado |
| POST | `/admin/policies` | Multipart: `file`, `title`, `description`, `active`, `site_id` para superadmin |
| POST | `/admin/policies/{id}` | JSON para texto/estado; multipart si cambia el PDF |
| DELETE | `/admin/policies/{id}` | Elimina documento y PDF después de confirmar en la interfaz |
| GET | `/files/{file_id}` | PDF autorizado en línea |
| GET | `/files/{file_id}?download=1` | Descarga del PDF autorizado |

Todas las escrituras exigen sesión y CSRF. La validación comprueba extensión PDF,
MIME, firma y límite real del archivo. Un reemplazo fallido conserva el documento
anterior; una sustitución exitosa retira su archivo después del commit. El PDF de
un borrador no es accesible públicamente. La política publicada es pública en esta
instalación, igual que las capacitaciones; la separación por subdominio depende
del despliegue descrito en [hosting y sedes](DESPLIEGUE-Y-SUBDOMINIOS.md).

## Despliegue y pruebas

Ejecutar `php backend/scripts/migrate.php` y después
`php tools/sync-database-permissions.php --apply` con acceso de mantenimiento.
La cuenta web necesita SELECT/INSERT/UPDATE/DELETE en `policies`. No se almacenan
PDF, credenciales ni datos operativos en Git.

[policies.mjs](../tests/policies.mjs) verifica los flujos DOM, búsqueda, paginación,
visor, validación, confirmaciones y recuperación de errores.
[policies-http.py](../tests/policies-http.py), ejecutado por la suite HTTP aislada,
verifica PDF real por HTTP, permisos, CSRF, borradores, sustitución, eliminación,
descarga y conservación de las métricas de capacitación.
