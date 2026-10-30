# Edición y eliminación de capacitaciones

Actualizado: 30 de octubre de 2026.

## Edición

La modalidad **Con examen / Sin examen** se puede cambiar durante la creación,
incluido el borrador guardado después de cargar el primer material. La biblioteca
muestra **Continuar creación** y el editor **Completar creación** hasta la primera
publicación. Abrir **Configurar examen** guarda primero la información pendiente.

Después de publicar, el acceso se llama **Gestionar**: la modalidad se muestra
como información y la API rechaza cambiarla con 409. Esto también se aplica si
posteriormente vuelve a borrador por retirar el último material. Pueden
actualizarse título, categoría, descripción, materiales, portada y preguntas.
La sede conserva las restricciones de administración existentes.

**Configurar examen** permite corregir las preguntas. Los cambios crean una
versión nueva y mantienen los resultados e intentos de las versiones anteriores.
La imagen de portada se elige en **Elige la portada**: se comparte entre Inicio,
detalle y reproductor. No se extraen fotogramas del video.

## Eliminar por completo

En el editor: **Más → Eliminar definitivamente**. El diálogo enumera las
consecuencias y enfoca primero Cancelar. Cancelar no envía ninguna petición;
confirmar envía `DELETE /api/v1/admin/courses/{id}/permanent` con
`{"confirm_delete":true}`. Hay protección frente a doble envío y se conserva
el editor cuando el servidor devuelve un error.

- Se eliminan la capacitación y sus vistas, todas las versiones del examen,
  inscripciones, intentos, resultados, avisos antiguos y actividad asociada.
- Se eliminan los originales vinculados, la portada exclusiva y los derivados
  de documentos que no usa otra capacitación. También se limpian conversiones
  incompletas identificables. Los archivos se borran después del commit.
- Se conserva el directorio de trabajadores, las otras capacitaciones y los
  archivos compartidos con eventos, sliders, popups u otras capacitaciones.
  Las imágenes antiguas ya desvinculadas continúan bajo el procedimiento general
  de revisión de archivos huérfanos.
- Los listados, reportes y campana se actualizan mediante la invalidación común
  de caché. Slider y popup dejan de ofrecer destinos internos ya inexistentes.
- Se verifica la sede dentro de la misma transacción. Un bloqueo compartido con
  el procesador de documentos evita borrar durante una conversión; en ese caso
  se devuelve 409 para reintentar. Un rollback conserva filas y archivos.

**Archivar** sigue siendo otra opción: retira la publicación y conserva su
historial. La eliminación definitiva también acepta cursos archivados por API.

## Archivos responsables y despliegue

- [CourseRepository.php](../backend/src/Repositories/CourseRepository.php):
  bloqueo de cambios de modalidad y edición de información.
- [CourseDeletionTool.php](../backend/src/Services/CourseDeletionTool.php):
  transacción, referencias compartidas y limpieza de almacenamiento.
- [CourseAccess.php](../backend/src/Middleware/CourseAccess.php): autorización por sede.
- [admin-courses.js](../public/frontend/pages/admin-courses.js): formulario y confirmación.
- [database-permissions.php](../backend/config/database-permissions.php): permisos DML.

`CoursePublicationMigration` agrega `courses.first_published_at` y recupera el
estado de publicaciones previas desde su estado, actividad e intentos. Se debe
ejecutar `php backend/scripts/migrate.php` con la cuenta de mantenimiento antes
de activar el nuevo código. La migración es repetible. Una instalación existente necesita el permiso
DELETE en `courses`, `activity_log` y `announcements`, además de los permisos
previos. La cuenta de mantenimiento puede sincronizar la matriz con:

```powershell
& 'C:\xampp\php\php.exe' tools/sync-database-permissions.php --apply
```

En Linux, usar `php` y configurar la cuenta de mantenimiento. El comando no
cambia contraseñas ni otorga privilegios DDL/globales. En hosting sin GRANT,
el proveedor debe aplicar los permisos por tabla. Los fallos de limpieza física
se registran como `file.cleanup_failed` o `preview.cleanup_failed` para revisión.

## Validación

[course-management.php](../tests/course-management.php) verifica eliminación
real de archivos sintéticos, cascadas, rollback, bloqueo del procesador,
referencias compartidas, modalidad inmutable e historial de preguntas.
[course-editor.mjs](../tests/course-editor.mjs) comprueba edición, confirmación,
cancelación, errores y dobles clics. La suite HTTP verifica sesión, sede, CSRF,
confirmación explícita, privacidad de portada y lectura posterior al borrado,
usando una cuenta SQL con permisos mínimos y almacenamiento aislado.
