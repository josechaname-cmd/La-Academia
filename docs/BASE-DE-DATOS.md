# Base de datos y backend

## Relaciones principales

| Datos | Relación | Uso del backend |
| --- | --- | --- |
| Sedes y trabajadores | `employees.site_id → sites.id` | Directorio, importación y validación de sede del examen. |
| Accesos administrativos | `admins.dni → employees.dni`, `admins.site_id → sites.id` | Un acceso por trabajador; permisos y sincronización del directorio. |
| Capacitaciones | `courses.site_id → sites.id`, `courses.created_by → admins.id` | Edición autorizada por sede y autor de la publicación. |
| Materiales | `files.course_id → courses.id`, `file_previews.file_id → files.id` | Documentos, videos y derivados privados. |
| Evaluaciones | `exams.course_id → courses.id` | Versiones únicas por capacitación, preguntas y configuración. |
| Participación | `enrollments.exam_id → exams.id`, `attempts.enrollment_id → enrollments.id` | Una inscripción por DNI y versión, intentos y resultados históricos. |
| Políticas | `policies.file_id` y `policies.cover_image_id → files.id` | PDF y portada; documentos generales sin filtro de sede. |
| Portadas y difusión | Referencias a `files.id` desde cursos, eventos, sliders y popup | Impiden eliminar imágenes que siguen en uso. |

El DNI y nombre de las inscripciones son datos históricos del examen. No se
agrega una cascada hacia el directorio de trabajadores: desactivar o modificar
un trabajador no debe borrar sus resultados anteriores. Las preguntas también
se conservan por versión. Las vistas se acumulan en `view_count`, con deduplicación
de sesión; no se crea un registro de datos personales por cada visualización.

`courses.cover_file_id` se valida en el backend para comprobar que el documento
pertenece a esa capacitación. El diagnóstico comprueba esa relación lógica,
además de las claves foráneas. La actividad utiliza referencias polimórficas
(`entity_type`, `entity_id`); la eliminación completa limpia su historial desde
[CourseDeletionTool.php](../backend/src/Services/CourseDeletionTool.php).

## Consultas, transacciones y permisos

[Database.php](../backend/src/Support/Database.php) usa PDO con parámetros reales,
UTF-8 y hora de Perú. Coordina transacciones anidadas y ejecuta la limpieza física
de archivos tras el commit. El flujo de exámenes bloquea capacitación,
inscripción e intento en el mismo orden; la suite de concurrencia comprueba los
envíos simultáneos. El resumen de resultados utiliza tres consultas para varios
cursos, en lugar de una consulta adicional por cada tarjeta.

La cuenta web utiliza los permisos DML por tabla de
[database-permissions.php](../backend/config/database-permissions.php). Los
cambios de esquema utilizan la cuenta privada de mantenimiento, solo por CLI.
La suite HTTP prueba el backend con una cuenta SQL de privilegios mínimos.

## Correcciones de integridad e índices

[DatabaseIntegrityMigration.php](../backend/src/Migrations/DatabaseIntegrityMigration.php)
comprueba las definiciones de índices, incluso si sus columnas ya existían:

- `admins(dni)` único: impide accesos duplicados para un trabajador. La migración
  se detiene ante duplicados existentes, sin eliminar ni fusionar registros.
- `employees(site_id, active, full_name)` y
  `courses(site_id, status, created_at)`: corrigen instalaciones que omitían
  estos índices cuando las columnas venían del esquema inicial.
- `activity_log(entity_type, entity_id, event_type, created_at)`: permite obtener
  la fecha de publicación sin revisar todos los cambios del curso.
- `file_previews(source_hash)`: facilita comprobar si un derivado todavía está
  compartido antes de eliminarlo.

La migración es aditiva y repetible. Reconoce índices equivalentes con otro
nombre y evita crearlos de nuevo. No cambia las filas ni los archivos.
En una prueba con 1.201 entradas sintéticas para un curso, `EXPLAIN` pasó de
estimar 1.201 filas a resolver el máximo mediante el índice (`Select tables
optimized away`). Es evidencia del plan de consulta, no una medición de tiempo
en producción.

## Diagnóstico y hosting

Después de desplegar y configurar la cuenta de mantenimiento:

```sh
php backend/scripts/migrate.php
php backend/scripts/check-database.php
php backend/scripts/check-database.php --json
```

[check-database.php](../backend/scripts/check-database.php) funciona en una
transacción de solo lectura. Revisa tablas InnoDB/utf8mb4, relaciones esperadas,
registros huérfanos, índices, portadas, materiales/exámenes de cursos publicados,
resultados y JSON de preguntas. Imprime nombres de comprobaciones y cantidades;
no muestra DNI, correos, contenido ni credenciales. Código de salida: `0` si
todo lo comprobado pasa, `1` si encuentra incidencias y `2` para argumentos
inválidos. Es un diagnóstico acotado, no una reparación automática de datos.

En Windows se puede sustituir `php` por `C:\xampp\php\php.exe`. En cada
subdominio con base independiente se ejecutan los comandos con la configuración
privada de esa instalación. `schema.sql` es la base inicial: también son
necesarias las migraciones; importar solamente ese archivo deja el esquema
incompleto. Las migraciones DDL deben ejecutarse en la ventana de despliegue,
con la copia de seguridad habitual del hosting.

[database-integrity.php](../tests/database-integrity.php) reconstruye una base
temporal desde cero, repite todas las migraciones y simula una actualización con
índices ausentes. Comprueba duplicados, conservación de filas, consultas con
índice y detección de portadas inválidas:

```sh
php tests/isolated.php database-integrity.php
```

El entorno aislado copia definiciones de tablas, nunca filas reales, y verifica
el nombre de la base temporal antes de reconstruirla.
