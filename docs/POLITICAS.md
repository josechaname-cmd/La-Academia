# Políticas con portada y PDF

Implementación: 30 de octubre de 2026.

## Interfaz

**Políticas** es una biblioteca general para esta instalación, sin selector ni
filtro de sede. Todos los administradores y capacitadores pueden gestionarla.
La navegación pública y la búsqueda general muestran los documentos publicados.
Los borradores solo son accesibles para las cuentas administrativas.

La biblioteca presenta seis tarjetas por página, con portada, título,
descripción, fecha y descarga directa. La imagen y el título abren el documento.
El detalle coloca la portada y la información a un lado y el PDF al otro;
en pantallas pequeñas se apilan. Debajo de la descripción se ubican los controles
para ampliar y descargar, sin los datos de formato y actualización en el detalle.
Al ampliar, los controles acompañan al visor para poder restaurar la vista.
También se ofrece apertura en otra pestaña.

En **Políticas → Nueva política** se adjuntan el PDF y una imagen elegida por el
usuario; la portada nunca se extrae del documento. El título y la descripción
actualizan una tarjeta de vista previa mientras se escribe. Límites:

- PDF: hasta 50 MB, respetando un límite menor si el servidor lo configura.
- Portada: JPG, PNG o WEBP, hasta 8 MB y 8000 píxeles por dimensión.

La gestión permite cambiar texto, portada o PDF por separado. No elegir un
archivo nuevo conserva el anterior. Las políticas previas a esta actualización
pueden seguir sin portada y muestran una presentación alternativa hasta que se
cargue una imagen. Se puede ocultar una política o eliminarla con sus archivos.
Guardar y eliminar requieren confirmación; se muestran progreso y errores sin
perder el formulario ni permitir dobles envíos. El PDF guardado se consulta
mediante **Revisar PDF guardado**, debajo del formulario.

Consultar políticas no registra vistas de capacitación ni crea exámenes.

## Backend y datos

- [PolicyMigration.php](../backend/src/Migrations/PolicyMigration.php) crea o
  actualiza `policies`: creador, título, descripción, `file_id`,
  `cover_image_id`, visibilidad y fechas. Las referencias de archivos son únicas.
  La columna histórica `site_id` permanece nullable por compatibilidad; no se
  consulta, expone ni escribe en este módulo. Las nuevas políticas tienen NULL.
- [PolicyTool.php](../backend/src/Services/PolicyTool.php) controla consultas,
  transacciones, sustitución y eliminación de PDF y portada.
- [PolicyAgent.php](../backend/src/Agents/PolicyAgent.php) exige autorización
  administrativa para gestionar el contenido a través de la API.
- [policies.js](../public/frontend/pages/policies.js) implementa biblioteca,
  detalle y editor. [policy-document.js](../public/frontend/components/policy-document.js)
  implementa el visor sin modificar métricas de capacitación.
- `FileTool` mantiene ambos archivos en almacenamiento privado. Solo entrega
  archivos publicados o autorizados a una cuenta administrativa. El borrado
  genérico de un archivo vinculado queda bloqueado: se gestiona desde Políticas.
  La revisión de huérfanos y la eliminación de cursos respetan estas referencias.

Rutas bajo `/api/v1`:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/policies` | Biblioteca pública de documentos visibles |
| GET | `/policies/{id}` | Detalle visible |
| GET | `/admin/policies` | Gestión general, sin sede |
| GET | `/admin/policies/{id}` | Detalle administrativo |
| POST | `/admin/policies` | Multipart: `file`, `cover_image`, `title`, `description`, `active` |
| POST | `/admin/policies/{id}` | JSON para texto/estado; multipart para reemplazar uno o ambos archivos |
| DELETE | `/admin/policies/{id}` | Elimina política, PDF y portada |
| GET | `/files/{file_id}` | PDF o imagen autorizados en línea |
| GET | `/files/{file_id}?download=1` | Descarga del archivo autorizado |

Las respuestas incluyen `cover_image_id` y omiten sede y rutas de almacenamiento.
Todas las escrituras exigen sesión y CSRF. La validación comprueba extensión,
contenido real, MIME y tamaño. El PDF y la imagen se reciben en una única petición
y se guardan en una transacción: si uno falla, se conservan los anteriores y
se retiran los nuevos archivos. En reemplazos y eliminaciones, el archivo anterior
se retira físicamente después del commit. Ambos archivos de un borrador quedan
inaccesibles públicamente.

La política publicada es pública en esta instalación, igual que las
capacitaciones. General significa compartida dentro de esta instalación;
no sincroniza instalaciones independientes ni bases de otros subdominios.
Consultar [hosting y sedes](DESPLIEGUE-Y-SUBDOMINIOS.md).

## Despliegue y pruebas

Ejecutar `php backend/scripts/migrate.php` antes de habilitar el nuevo código y
luego `php tools/sync-database-permissions.php --apply` con acceso de mantenimiento.
La migración es repetible y conserva las políticas existentes. La cuenta web
necesita SELECT/INSERT/UPDATE/DELETE en `policies`. No se almacenan PDF, imágenes
cargadas, credenciales ni datos operativos en Git.

[policies.mjs](../tests/policies.mjs) verifica búsqueda, paginación, portadas,
vista previa, visor, validación, confirmaciones, progreso y recuperación de errores.
[policies-http.py](../tests/policies-http.py), ejecutado por la suite HTTP aislada,
verifica archivos reales, permisos generales, CSRF, privacidad de borradores,
reemplazos independientes, rollback, descarga y conservación de las métricas.
La suite compara los archivos SQL y físicos antes y después para detectar huérfanos.
