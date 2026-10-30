# Datos, migración y cambio de nombre

Estado vigente: 27 de octubre de 2026. Las secciones históricas describen el traslado original, no pasos de operación diaria.

## Ubicaciones

| Elemento | Anterior | Actual |
|---|---|---|
| Producto | ACEA Perú / mockup | La Academia |
| Namespace PHP | Acea | Academia |
| Código servido | `C:\xampp\htdocs\acea\_ssoma\_mockup` | `C:\xampp\htdocs\la-academia` |
| Base | acea_capa | la_academia |
| Cookie | ACEACAPA | LAACADEMIA |
| Archivos | `C:\xampp\acea_capa_storage` | `C:\xampp\htdocs\la-academia\storage\files` |
| Configuración | Valores dentro del código servido | `storage/config.php`, protegido por Apache y excluido de Git |
| API | Parámetros agent/action | Rutas `/api/v1/...` |

Los correos, nombres personales, títulos introducidos por usuarios y documentos existentes **no se sustituyen masivamente**. Son datos, no nombres técnicos del proyecto. Las credenciales de entrada continúan funcionando; la sesión anterior no se reutiliza.

## Entidades

| Tabla | Propósito y vínculos |
|---|---|
| admins | Cuenta administrativa, rol, activo, sede opcional, hash, auth_version |
| sites | Nombre único, ubicación y activo |
| auth_attempts | Huella de IP y fecha para control de login |
| categories | Nombre único por ámbito course/event |
| courses | Título, categoría, descripción, draft/published/archived; duration legado nullable |
| files | Material o imagen, clave de almacenamiento aleatoria, MIME, extensión, tamaño y texto de diapositivas |
| announcements | Historial de banners/avisos retirados; sin gestión activa |
| events | Categoría, fecha, lugar, estado y portada |
| event_images | Relación ordenada evento–archivo; no duplicados dentro del evento |
| exams | Curso, versión y preguntas JSON; versión única por curso |
| employees | Maestro de colaboradores activos: DNI, nombre completo y cargo |
| enrollments | Participante por DNI y versión de examen; conserva una copia del nombre y cargo usados |
| attempts | Token con hash, pendiente/terminado, respuestas y nota |
| activity_log | Registro persistente de cambios y resultados; fuente de la campana |
| file_previews | Cola y estado de conversión por archivo, hash y errores |

Las categorías se referencian por nombre validado, no por FK de ID; esto simplifica la migración pero impide renombrarlas libremente sin actualizar referencias. La columna duration permanece únicamente para preservar historial. No se usa en formularios ni catálogo.

El esquema efectivo se obtiene ejecutando `backend/scripts/migrate.php`: combina `backend/database/schema.sql` y las clases de `backend/src/Migrations`. Importar solamente el SQL no completa la instalación. Las migraciones son idempotentes; no hay un registro de versiones de migración aplicado.

Las categorías se conservan por nombre y `courses.cover_file_id` se valida en aplicación, sin FK. Reforzar esas relaciones requeriría una migración de datos separada; no forma parte de la limpieza de código.

## Migración histórica del 1 de octubre

1. Leer la instalación original sin sustituir sus datos.
2. Crear la carpeta de trabajo y validar código/contrato antes de desplegar.
3. Copiar el proyecto histórico a una carpeta de respaldo fuera de htdocs.
4. Crear `la_academia`; abortar si ya existe para no sobrescribirla.
5. Copiar DDL y filas con lectura consistente; comparar cantidad de filas de cada tabla.
6. Copiar los archivos privados y comparar SHA-256 contra el origen.
7. Crear la configuración privada y ejecutar migraciones idempotentes de esquema.
8. Ejecutar pruebas PHP con reversión transaccional, pruebas HTTP y comprobar referencias de módulos.
9. Activar el acceso nuevo y dejar redirección local en el anterior.

El verificador histórico `archive/retired-tools/verify-migration.php` comprobaba igualdad de filas de las doce tablas y hashes de archivos inmediatamente después de migrar. Cuando ya se trabaje en la nueva instalación es normal que ambas bases diverjan: no usarlo como prueba diaria. También detecta cursos publicados incompletos y eventos heredados con menos de tres imágenes.

En aquel traslado, el respaldo quedó en `C:\xampp\la_academia_backups\20261001-094651\legacy-code`.

En aquel traslado, el resultado detallado de recuentos se guardó en `C:\xampp\la_academia_data\migration-20261001.json`. No contiene contraseñas. El despliegue no elimina la BD anterior ni los archivos originales. Durante el traspaso se bloquean temporalmente las escrituras de la API anterior para evitar nuevas filas después de la copia; los formularios deben recargarse en la URL nueva.

## Recuperación

Para la instalación vigente, respaldar y restaurar conjuntamente la exportación SQL, `storage/files`, `storage/config.php` y el código. `storage/backups` contiene copias de recuperación y no es una segunda instalación. Ver [operación local](OPERACION-LOCAL.md).

Como referencia del traslado original: la instalación original queda congelada como respaldo, no como segunda aplicación para seguir trabajando. Si se necesita regresar, retirar la redirección y restaurar el `.htaccess` respaldado. Si hubo nuevas notas/archivos en La Academia, respaldarlos y conciliarlos antes del regreso: no se sincronizan automáticamente ambas bases.

## Transacciones y concurrencia

- Creación de curso con material: transacción y compensación del archivo si falla el commit.
- Curso, versión de examen e intento: bloqueos por curso/participante para evitar límites inconsistentes.
- Reenvío de token terminado: devuelve la calificación original.
- Galería: actualización de evento y relaciones en una transacción.
- Usuarios: bloqueo de cuentas para impedir que se pierda el último superadministrador.
- Sedes: bloqueo coordinado antes de asignar usuarios o desactivar una sede.
- `Database::transaction` usa savepoints cuando existe una transacción exterior, lo que permite probar procesos completos y revertirlos.

## Archivos sin asociación

Subir una imagen y cancelar el evento puede dejarla sin relación. `backend/scripts/orphan-report.php` identifica archivos sin curso/banner/evento/galería y con más de un día de antigüedad. Solo informa: no borra. La eliminación automática requiere primero una política de retención y propietario de carga; queda pendiente.

## Disponibilidad de exámenes — 23 de octubre de 2026

`ExamScheduleMigration` añade `exams.enabled TINYINT(1) NOT NULL DEFAULT 1` si falta. La migración es idempotente; los registros existentes permanecen activados y conservan preguntas, fechas, duración y resultados. El esquema de instalaciones nuevas incluye la columna. Apertura y duración se exigen en la API al guardar; las columnas siguen aceptando nulos para conservar datos heredados. Cierre nulo indica disponibilidad sin fecha final. No se borran ni recalifican intentos.

## Maestro de colaboradores para evaluaciones — 27 de octubre de 2026

`PersonnelMigration` crea `employees` y agrega `enrollments.job_title` sin eliminar las columnas históricas de celular y área. La carga inicial sincronizó 220 DNI únicos desde el archivo maestro: un valor de nueve caracteres con cero inicial duplicado se normalizó a los ocho dígitos requeridos. El importador valida longitud, duplicados, nombre y cargo antes de escribir; marca inactivos los registros ausentes de una sincronización posterior. Los cuatro registros de examen anteriores se conservaron, aunque permanecen sin cargo cuando su DNI no existe en el maestro.

La consulta recibe el DNI y devuelve solo nombre completo y cargo. Al crear el intento, el servidor repite la búsqueda y copia nombre/cargo desde `employees`; no confía en valores enviados por el navegador. No existe clave foránea desde inscripciones porque el historial debe sobrevivir a la baja o actualización posterior de una persona.

## Contadores de visitas — 23 de octubre de 2026

`ContentViewsMigration` agrega `view_count BIGINT UNSIGNED NOT NULL DEFAULT 0` a `courses` y `events` si falta. Aplicada dos veces de forma idempotente; los contenidos y resultados permanecen intactos. El esquema de instalaciones nuevas incluye ambas columnas. Cada registro guarda solo un total; la deduplicación temporal usa identificadores de recursos en la sesión PHP. No se guardan IP, nombre, DNI ni huellas de navegador para esta métrica. Las marcas no se borran al entrar/salir de una cuenta dentro de la misma sesión PHP, evitando sumar una misma apertura repetida.

## Examen opcional — 23 de octubre de 2026

`CourseExamMigration` agrega `courses.exam_required TINYINT(1) NOT NULL DEFAULT 1`, también incluido en el esquema base. Los cursos existentes conservan su requisito de examen; nada se cambia a «sin examen» automáticamente. La migración es idempotente y no elimina preguntas, participantes ni intentos. Desde el 30 de octubre la modalidad se puede configurar en el borrador hasta la primera publicación. `CoursePublicationMigration` agrega `first_published_at`: después de publicar, el servidor conserva la modalidad bajo bloqueo del curso, incluso si vuelve a borrador. Las preguntas pueden actualizarse sin eliminar el examen ni sus resultados históricos.


## Migración del editor de capacitaciones — 26 de octubre de 2026

`TrainingEditorMigration`, ejecutada por `backend/scripts/migrate.php`, añade `courses.custom_cover_id` con clave foránea a `files`, y `exams.created_by/creator_name` como registro del creador. Las versiones anteriores conservan autor nulo; no se inventan atribuciones. `attempts.score` cambia a `DECIMAL(5,2)` para conservar notas proporcionales de exámenes de cualquier longitud. Los valores anteriores se conservan; Excel exporta los decimales como números. La migración es repetible, sin recrear tablas ni eliminar datos.
