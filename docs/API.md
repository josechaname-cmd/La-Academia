# API v1

Base local: `http://localhost/la-academia/api/v1`. La única entrada pública es `public/index.php`; Apache reescribe `/api/v1` hacia ella. El contrato vive en `backend/routes/api.php` y se ejecuta en `backend/src/Http/ApiKernel.php`. Diagnóstico: `api/v1/health`. La antigua entrada `api.php` se bloquea. La interfaz usa rutas v1, ya no selecciona agentes por parámetros públicos.

## Contrato

Solicitud JSON con `Content-Type: application/json`. Cargas con `multipart/form-data`, campo `file`. Las peticiones con modificación requieren la cookie de sesión y `X-CSRF-Token`, incluso al comenzar una evaluación pública o iniciar sesión. Primero se obtiene `GET /session`.

Respuesta correcta:

```json
{"data":{"id":42},"meta":{"request_id":"identificador","api_version":"v1"}}
```

Error:

```json
{"error":{"code":"request_error","message":"Revisa el campo title.","fields":{"title":"Debe tener entre 5 y 160 caracteres."}},"meta":{"request_id":"identificador","api_version":"v1"}}
```

`X-Request-Id` repite el identificador de correlación. Los errores inesperados se registran sin cuerpos de solicitud, contraseñas ni datos personales; al cliente no se envían rutas internas, consultas SQL ni trazas. `fields` está presente en todas las respuestas de error, aunque algunas reglas de negocio utilizan un mensaje general y un objeto vacío.

| Estado | Significado |
|---|---|
| 200 | Consulta, actualización, borrado lógico o respuesta de sesión correcta |
| 201 | Creación correcta |
| 400 | JSON o ruta inválidos |
| 401 | Sin sesión válida o credenciales incorrectas |
| 403 | Rol insuficiente o CSRF inválido |
| 404 | Ruta o registro no disponible |
| 405 | Método incorrecto; incluye encabezado Allow |
| 410 | Gestión manual de avisos retirada |
| 409 | Duplicado, límite de intentos o conflicto de estado |
| 413 | JSON mayor de 1 MB |
| 415 | Tipo de contenido no admitido |
| 422 | Validación de datos |
| 429 | Límite de login para conexión no local |
| 500/503 | Error interno o servicio no disponible |

Los IDs de ruta son enteros positivos y tienen prioridad sobre el cuerpo. Un POST de creación con `id` es rechazado para evitar que se interprete como edición. DELETE no implica siempre borrado físico: los cursos se archivan; los eventos sí se eliminan de su tabla, conservando su registro de actividad.

## Rutas

Las listas de cursos incluyen `published_at`: fecha de la última publicación registrada en la actividad del curso. Si un curso histórico no tiene ese evento, se usa `created_at` como respaldo. El catálogo público se ordena por `published_at` descendente; la lista administrativa conserva el orden de creación. Las fechas SQL representan la hora de Perú (`-05:00`). En el inicio se muestran como «Hoy», «Hace un día» o «Hace N días», según el día calendario en `America/Lima`.

La tabla siguiente se genera a partir del archivo de rutas en esta entrega. La fuente de verdad ejecutable es `backend/routes/api.php`.

| Método | Ruta | Permiso | Éxito |
|---|---|---|---|
| GET | `/home-popup` | public | 200 |
| GET | `/admin/home-popup` | superadmin | 200 |
| POST | `/admin/home-popup` | superadmin | 201 |
| GET | `/admin/home-popup/{id}` | superadmin | 200 |
| POST | `/admin/home-popup/{id}` | superadmin | 200 |
| POST | `/admin/home-popup/{id}/status` | superadmin | 200 |
| DELETE | `/admin/home-popup/{id}` | superadmin | 200 |
| GET | `/health` | public | 200 |
| GET | `/slider` | public | 200 |
| GET | `/admin/slider` | superadmin | 200 |
| POST | `/admin/slider` | superadmin | 201 |
| GET | `/admin/slider/{id}` | superadmin | 200 |
| POST | `/admin/slider/{id}` | superadmin | 200 |
| POST | `/admin/slider/{id}/status` | superadmin | 200 |
| DELETE | `/admin/slider/{id}` | superadmin | 200 |
| GET | `/session` | public | 200 |
| POST | `/session` | public | 200 |
| DELETE | `/session` | admin | 200 |
| POST | `/setup` | public | 201 |
| GET | `/announcements` | public | 200 |
| GET | `/notifications` | admin | 200 |
| GET | `/events` | public | 200 |
| GET | `/courses` | public | 200 |
| GET | `/courses/{id}` | public | 200 |
| POST | `/courses/{id}/view` | public | 200 |
| POST | `/events/{id}/view` | public | 200 |
| GET | `/categories` | public | 200 |
| GET | `/files/{id}` | public | 200 |
| GET | `/files/{id}/thumbnail` | public | 200 |
| GET | `/files/{id}/preview` | public | 200 |
| GET | `/files/{id}/preview-status` | public | 200 |
| POST | `/admin/files/{id}/preview` | admin | 200 |
| POST | `/admin/courses/{id}/cover-image` | admin | 200 |
| POST | `/admin/courses/{id}/cover` | admin | 200 |
| GET | `/files/{id}/slides` | public | 200 |
| POST | `/attempts/participant` | public | 200 |
| POST | `/attempts` | public | 201 |
| POST | `/attempts/submit` | public | 200 |
| GET | `/admin/courses` | admin | 200 |
| GET | `/admin/courses/{id}` | admin | 200 |
| POST | `/admin/courses` | admin | 201 |
| PATCH | `/admin/courses/{id}` | admin | 200 |
| POST | `/admin/courses/{id}/publish` | admin | 200 |
| DELETE | `/admin/courses/{id}` | admin | 200 |
| POST | `/admin/courses/{course_id}/files` | admin | 201 |
| DELETE | `/admin/files/{id}` | admin | 200 |
| POST | `/admin/images` | admin | 201 |
| POST | `/admin/categories` | admin | 201 |
| GET | `/admin/courses/{course_id}/exam` | admin | 200 |
| POST | `/admin/courses/{course_id}/exam/status` | admin | 200 |
| PUT | `/admin/courses/{course_id}/exam` | admin | 200 |
| GET | `/admin/announcements` | admin | 200 |
| POST | `/admin/announcements` | admin | 201 |
| PATCH | `/admin/announcements/{id}` | admin | 200 |
| DELETE | `/admin/announcements/{id}` | admin | 200 |
| GET | `/admin/events` | admin | 200 |
| POST | `/admin/events` | admin | 201 |
| PATCH | `/admin/events/{id}` | admin | 200 |
| DELETE | `/admin/events/{id}` | admin | 200 |
| GET | `/admin/users` | superadmin | 200 |
| POST | `/admin/users` | superadmin | 201 |
| PATCH | `/admin/users/{id}` | superadmin | 200 |
| GET | `/admin/sites` | superadmin | 200 |
| POST | `/admin/sites` | superadmin | 201 |
| PATCH | `/admin/sites/{id}` | superadmin | 200 |
| GET | `/admin/personnel` | superadmin | 200 |
| POST | `/admin/personnel` | superadmin | 201 |
| POST | `/admin/personnel/update` | superadmin | 200 |
| POST | `/admin/personnel/delete` | superadmin | 200 |
| POST | `/admin/personnel/preview` | superadmin | 200 |
| POST | `/admin/personnel/import` | superadmin | 200 |
| GET | `/admin/reports/summary` | admin | 200 |
| GET | `/admin/reports/results` | admin | 200 |
| GET | `/admin/reports/exams` | admin | 200 |
| GET | `/admin/reports/exams/{id}/export` | admin | 200 |

Propósito, parámetros, respuestas, errores y consumidores de cada ruta: inventario completo (evidencia local excluida de Git). Los accesos administrativos a cursos, exámenes, resultados, archivos privados y notificaciones comprueban la sede; superadmin conserva acceso global.

## Datos de las operaciones

### Sesión y administración

- `POST /session`: `email`, `password`. Renueva sesión y CSRF al autenticar.
- `DELETE /session`: objeto vacío. Cierra sesión.
- `POST /setup`: `name`, `email`, `password`; únicamente si no hay cuentas y la conexión es local. Crea superadministración.
- Usuarios: `name`, `email`, `role` (`admin`/`superadmin`), `active` (0/1), `site_id`, `password`. En edición, contraseña vacía conserva la actual.
- Sedes: `name`, `address` (puede estar vacío), `active`.
- Categorías: `scope` (`course`/`event`), `name`. Devuelve ID y nombre normalizado.

### Cursos y archivos

- Crear curso: multipart con `title`, `category`, `description`, `file`. PDF/PPT/PPTX hasta 50 MB.
- Crear/editar curso: `title`, `category`, `description` y `exam_required` (0 o 1). En creación viaja como campo multipart junto al archivo; en edición como JSON. Si se omite, conserva el modo existente o usa 1 para cursos nuevos. No existe duración obligatoria para el material.
- Agregar material: multipart `file` a `/admin/courses/{course_id}/files`.
- Publicar: POST con `{}` a `/admin/courses/{id}/publish`.
- `GET /files/{id}`: respuesta binaria, no envelope JSON. `?download=1` solicita descarga. Comprueba publicación o sesión administrativa.
- `GET /files/{id}/slides`: devuelve nombre y arreglo de diapositivas de lectura.
- Subir imagen: multipart `file`, hasta 8 MB, devuelve referencia para evento.

### Eventos y compatibilidad

- Eventos: `title`, `description`, `category`, `location`, `starts_at` (`YYYY-MM-DDTHH:mm`, Lima), `active`, `image_ids` (arreglo ordenado).
- Publicación de evento: entre 3 y 12 referencias a imágenes admitidas. Borrador puede usar menos. Guardado de registro y relaciones en transacción.
- La gestión manual de banners/avisos está retirada: las rutas administrativas heredadas responden 410.
- `GET /announcements` devuelve una lista vacía por compatibilidad; no alimenta la campana ni el slider.

### Colaboradores, sedes y capacitadores

- `GET /admin/personnel`: listado de DNI, nombre completo, cargo, estado, sede y `revision` para edición concurrente. Solo superadministración.
- `POST /admin/personnel`: alta individual con `dni` (texto de 8 dígitos), `name`, `job_title`, `site_id` y `active` (0/1). Rechaza DNI duplicados, incluso inactivos.
- `POST /admin/personnel/update`: mismos campos más `revision` obtenida del listado. El DNI identifica el registro y no se modifica. Un conflicto concurrente devuelve 409; una sede inexistente o inactiva devuelve 422 (se permite conservar la sede inactiva de un trabajador que sigue inactivo).
- `POST /admin/personnel/delete`: `dni` y `revision`; eliminación lógica (`active=0`) que conserva las evaluaciones, desactiva el acceso de capacitador vinculado y revoca sus sesiones. Se reactiva al trabajador mediante edición; el acceso administrativo se habilita expresamente desde Usuarios.
- `POST /admin/personnel/preview`: multipart con `file` CSV/XLSX y `site_id` opcional, usado exclusivamente para filas sin sede. No guarda trabajadores. Valida todo el archivo y devuelve totales por sede, altas, actualizaciones, reactivaciones, cambios de sede, cantidad de accesos de capacitador vinculados (`linked_accounts`), una muestra de hasta 100 filas y `preview_token`. No hay sede predeterminada. Ignora diferencias de mayúsculas, tildes y espacios; rechaza nombres desconocidos, inactivos o ambiguos.
- `POST /admin/personnel/import`: el mismo archivo y sede de la revisión, más `preview_token` obligatorio. Revalida dentro de una transacción; si cambió el archivo, la sede, algún trabajador o su acceso vinculado desde la revisión, devuelve 409 sin guardar parcialmente. Solo modifica los DNI incluidos en el archivo. Todos los endpoints de colaboradores requieren superadministración y las escrituras requieren CSRF.
- Altas, ediciones e importaciones usan la misma sincronización de nombre/cargo con inscripciones y reportes, y nombre/cargo/sede con accesos de capacitador. Cambiar de sede revoca las sesiones del capacitador; desactivar al trabajador desactiva su acceso. Las cuentas desactivadas no se reactivan automáticamente. Los cursos, notas y sedes históricas de las evaluaciones permanecen. Los intentos pendientes vuelven a validar estado y sede al enviarse.
- La interfaz solicita confirmación antes de agregar, editar, reactivar, eliminar o confirmar una carga masiva; cancelar no envía escrituras. Las acciones por trabajador son iconos con etiquetas accesibles.
- Los accesos operativos usan el rol `capacitador`. Su DNI debe pertenecer a un colaborador activo de la misma sede; nombre y cargo se toman de esa base.
- Las capacitaciones guardan sede y creador. El capacitador utiliza obligatoriamente su sede; el superadministrador selecciona una sede activa.

### Exámenes e intentos

```json
{"questions":[{"prompt":"Enunciado de la pregunta","choices":["Opción A","Opción B","Opción C"],"correct":0,"explanation":"Opcional"}]}
```

El arreglo debe tener al menos una pregunta; la cantidad es flexible. `correct` usa índices 0, 1 y 2. El servidor rechaza enunciados u opciones repetidos.

- `POST /attempts/participant`: `course_id`, `dni` de ocho dígitos. Verifica que el examen esté disponible y que el DNI pertenezca al personal activo. Devuelve `name`, `job_title`, `site_id` y `site_name`.
- `POST /attempts`: `course_id`, `dni`. El servidor vuelve a consultar nombre completo y cargo en la tabla maestra; ignora cualquier identidad proporcionada por el cliente. Devuelve esos datos dentro de `participant`, además de `token`, número de intento, versión y preguntas sin clave de respuesta.
- `POST /attempts/submit`: `token`, `answers` (un entero 0–2 por pregunta de la versión). Devuelve nota, revisión y oportunidades restantes. Repetir un token terminado devuelve el resultado guardado sin consumir otro intento.

## Idempotencia, paginación y compatibilidad

- El envío de evaluación es idempotente por token. Las demás creaciones no tienen claves de idempotencia: el cliente deshabilita el botón mientras espera y **no reintenta escrituras automáticamente**.
- Las páginas públicas muestran seis registros por página; por ahora el filtro y paginación se realizan en el navegador. No se afirma que la API esté paginada en servidor. Reportes están limitados a los 1 000 resultados recientes.
- Los métodos de agentes conservan una interfaz interna GET/POST; el router HTTP valida los verbos REST y adapta el contexto. Esa adaptación no permite cambiar el permiso requerido.
- No se conserva la antigua API de `?agent=...&action=...` en la instalación nueva. El cliente incluido ya usa v1. El proyecto anterior queda como copia histórica y redirección del portal.


## Periodos, exportación y caché — actualizado el 23 de octubre de 2026

- Guardar examen exige `opens_at` (fecha y hora de Perú) y `duration_minutes` (entero de 1 a 1440). Fechas en formato `YYYY-MM-DDTHH:mm` o `YYYY-MM-DD HH:mm:ss`. `closes_at` es opcional: omitido, vacío o null significa sin fecha de cierre. Si se indica, debe ser posterior a la apertura.
- `POST /admin/courses/{course_id}/exam/status`: administrador con CSRF; cuerpo `{"enabled":0}` o `{"enabled":1}`. Cambia disponibilidad de todas las versiones de la capacitación y registra actividad solo si cambia. Desactivar bloquea nuevos intentos y envíos pendientes; conserva notas y reenvíos de tokens completados. Reactivar respeta el horario y los minutos transcurridos, sin reiniciar relojes. Las versiones nuevas heredan el estado actual.
- Apertura inclusiva y cierre exclusivo. Inicio y envío validan el periodo en servidor; el envío también valida los minutos desde el comienzo del intento. La respuesta de inicio incluye `expires_at` (Unix o null) y `server_time`.
- Las fechas nulas heredadas conservan acceso sin plazo. Cambiar únicamente periodo/minutos actualiza la misma versión y aplica a intentos pendientes; cambiar preguntas, `max_attempts` o `passing_score` genera una nueva versión. Los resultados completados no cambian.
- `GET /admin/reports/exams` lista todas las versiones, incluidas las de cursos archivados. Estado temporal: `scheduled`, `open`, `closed`, `disabled`, `not_required`; `course_status` informa publicación/archivo por separado.
- `GET /admin/reports/results?exam_id=ID` incluye participantes con y sin envío, hasta 1000 filas. Sin parámetro conserva resultados completados recientes.
- `GET /admin/reports/exams/{id}/export`: descarga XLSX sin límite de 1000 filas. Requiere administrador; incluye última nota enviada, envíos completados y estado del intento pendiente. Disponible antes, durante y después del periodo. Identificadores como texto, notas y fechas tipadas, sin fórmulas provenientes de datos.
- API JSON y Excel: `Cache-Control: no-store`. Caché privada del servidor de 60 segundos para catálogo/categorías/eventos y 15 segundos para el feed de actividad; modificaciones de contenido y envíos de resultados invalidan la generación. Sesiones, permisos, exámenes, archivos y resultados se consultan en vivo. Encabezado de diagnóstico `X-App-Cache: HIT|MISS|BYPASS` para JSON normal.
- `GET /notifications?background=1`: devuelve `{items, revision}` a administradores sin prolongar su sesión. Cada actividad incluye un `href` interno al recurso o examen correspondiente. Sondeo visible cada 30 segundos, pausa en pestañas ocultas y retroceso hasta 120 segundos si falla. Lecturas almacenadas por usuario en este navegador, sin textos ni tokens; no son comprobantes de lectura del servidor.
- Cookie de sesión HttpOnly/SameSite Strict y Secure con HTTPS. ID y CSRF se renuevan al login, logout y caducidad. Inactividad predeterminada: 3600 segundos. El cliente comparte solicitudes simultáneas y reutiliza identidad hasta 15 segundos; cada operación administrativa sigue validando la cuenta en el servidor.


## Slider por carpeta — actualizado el 23 de octubre

`GET /slider` devuelve las imágenes visibles de `home_slides`, ordenadas por posición e ID, con `image`, `alt`, `fit` y `focal`. El superadmin carga y administra imágenes en `/admin/slider`; la carpeta anterior solo se importa una vez durante la migración. El listado público utiliza caché de servidor invalidada por escrituras, con respuesta HTTP `no-store`. La gestión antigua de anuncios devuelve 410 y no alimenta el carrusel ni las notificaciones. Consulta [Slider de Inicio](SLIDER-INICIO.md).

## Actividad automática — 3 de octubre de 2026

`GET /notifications` devuelve `{items: [...], revision: "huella"}` dentro de `data`. Cada actividad contiene `id`, `kind=activity`, `event_type`, `entity_type`, `entity_id`, `title`, `body`, `created_at`, `course_id`, `exam_id` y `href`. Máximo 60 elementos recientes; permisos verificados antes de leer la caché. El registro de actividad y sus límites se describen en [ACTIVIDAD.md](ACTIVIDAD.md).


## Portadas y vistas previas

| Método y ruta (bajo `/api/v1`) | Acceso y resultado |
|---|---|
| `GET /files/{id}/thumbnail` | JPEG de primera página; misma visibilidad que el original |
| `GET /files/{id}/preview` | PDF derivado; misma visibilidad que el original |
| `GET /files/{id}/preview-status` | Estado, hash y error de conversión; misma visibilidad |
| `POST /admin/files/{id}/preview` | Administrador + CSRF; reencola un material fallido |
| `POST /admin/courses/{id}/cover` | Administrador + CSRF; cuerpo `file_id` perteneciente al curso |

Los derivados no disponibles devuelven 409 mientras no están listos, o 404 si falta el archivo generado. JPEG/PDF permiten revalidación privada mediante ETag, después de comprobar permisos. Detalles operativos en [materiales](MATERIALES.md).

## Visitas públicas — 23 de octubre de 2026

- `POST /courses/{id}/view` y `POST /events/{id}/view`, cuerpo `{}`, sesión y CSRF obligatorios. El registro de cursos devuelve `{"recorded":true|false,"view_count":N}` con el total público actual. Un curso no publicado no expone el total. Los eventos conservan la respuesta `{"recorded":true|false}`.
- Una apertura por recurso y sesión PHP. Repetir la petición no suma; abrir otra sesión sí puede sumar. No es una métrica de personas únicas ni de lectura completada. Hasta 2048 recursos distintos por sesión; al alcanzar el límite se dejan de contar recursos nuevos en esa sesión.
- Solo capacitaciones publicadas y eventos activos; borradores, archivados e inexistentes devuelven 404. Administradores autenticados están excluidos. La interfaz pública registra el curso cuando carga el PDF/presentación en el visor (normal o ampliado), o cuando se solicita descargar el original. Entrar a la página, ver su portada, esperar una conversión o encontrar un curso vacío no registra una apertura. Se ignoran cargas de documentos reemplazados o de una ruta abandonada. Los eventos registran al abrir su publicación, no al listar tarjetas. Fallos de métricas no bloquean la vista ni se reintentan automáticamente.
- `view_count` aparece en listas y detalles públicos de cursos, en las tarjetas y junto al visor, además del panel administrativo. El visor actualiza su cifra con la respuesta del servidor. Los eventos mantienen el contador solo en administración. Se conservan los totales históricos; no se recalculan ni se reinician con este cambio.
- Incremento atómico sin cambiar `updated_at`, con actividad agrupada cada 10 visitas. Una nueva vista de curso invalida la caché pública para mostrar el total al regresar al inicio; duplicados y revisiones administrativas conservan la caché. Los eventos mantienen su comportamiento previo. Duplicados se descartan desde la sesión antes del UPDATE. Los listados administrativos conservan su caché de navegación de 30 segundos.

### Capacitación sin examen

`exam_required=0` permite publicar con material aunque no haya examen. El detalle público devuelve `exam:null`; el detalle administrativo conserva el examen histórico si existe. Inicio y envío de intentos pendientes rechazan el modo sin examen con 409. Las notas ya guardadas y las exportaciones permanecen disponibles. Los reportes identifican estos exámenes como `not_required` («No requerido»).

`exam_required=1` vuelve a exigir evaluación. Si el curso estaba publicado y no tiene examen, el guardado lo deja en borrador para no publicar una capacitación incompleta. Si existe, respeta su horario y activación. Valores distintos de los enteros 0/1 se rechazan con 422. Guardar el mismo estado no actualiza fechas ni genera actividad.

### Avisos por grupos de visitas

Desde el 23 de octubre de 2026, cada publicación registra un aviso `content.views` al alcanzar 10, 20, 30… visitas. El incremento y el aviso se confirman en una transacción con bloqueo de la fila; la clave `content.views:{tipo}:{id}:{total}` impide duplicados. El aviso muestra título y total alcanzado, sin datos personales, y enlaza al recurso administrativo. No se crean avisos por visitas individuales ni se reconstruyen hitos anteriores a esta mejora. Se entregan mediante el sondeo existente de la campana y su caché de 15 segundos.

Inicio del panel muestra totales de publicaciones vigentes y visitas por publicación, con filtro de tipo y orden descendente. «Actualizar» consulta datos actuales. Cuando cambia la actividad de la campana, también actualiza el resumen sin reiniciar la página ni perder el filtro.


## Medios del Inicio — 26 de octubre de 2026

- Slider público: `GET /slider`. Administración exclusiva superadmin: `GET/POST /admin/slider`, `GET/POST/DELETE /admin/slider/{id}`, `POST /admin/slider/{id}/status`.
- Popups: `GET /home-popup` devuelve el activo o `null`; `GET/POST /admin/home-popup` lista/crea, `GET/POST/DELETE /admin/home-popup/{id}` consulta/edita/elimina y `POST /admin/home-popup/{id}/status` cambia el activo exclusivo.
- Cargas con archivo: `multipart/form-data`, campo `file`. Ediciones sin reemplazo: JSON. Todas las escrituras requieren CSRF. Crear no acepta ID en el cuerpo; la ruta determina el ID al editar.
- Campos y comportamiento: [slider](SLIDER-INICIO.md) y [popups](POPUP-INICIO.md). Listas administrativas sin caché; lecturas públicas cacheadas e invalidadas al modificar.


## Capacitación y examen flexible — 26 de octubre de 2026

- `POST /admin/courses/{id}/cover-image`: imagen propia en campo multipart `file`. Devuelve la capacitación con `custom_cover_id`. Requiere administrador y CSRF; JPG/PNG/WEBP hasta 8 MB. `POST /admin/courses/{id}/cover` con `file_id` vuelve a la portada de un material propio.
- `PUT /admin/courses/{course_id}/exam`: `questions` admite cualquier lista no vacía. Tres alternativas por pregunta; enunciados y opciones no duplicados. El autor se obtiene de la sesión, nunca de `creator_name` enviado en el cuerpo.
- La consulta administrativa del examen incluye `created_by`, `creator_name` y `created_at`. El detalle del curso incluye `exam.question_count` para mostrar la cantidad sin exponer las respuestas correctas.
- Calificación proporcional sobre 20, redondeada a dos decimales; la cantidad de respuestas debe coincidir con la versión rendida. La exportación XLSX conserva decimales.


## Identificación previa de participantes — 28 de octubre de 2026

`POST /attempts/participant` identifica al colaborador activo de la misma sede y registra la identificación en la sesión durante 15 minutos. Máximo 30 consultas por IP/minuto (429). `POST /attempts` requiere esa consulta previa para el mismo curso/DNI y revalida el padrón: sin ella responde 403 `identification_required`. Se conservan cuerpos y respuestas existentes. El cliente vuelve a mostrar la consulta si vence. Ver [estado de seguridad y permisos](CORRECCIONES-ALTAS-2026-10-28.md).

## Intentos y aprobación — actualizado el 29 de octubre de 2026

- `PUT /admin/courses/{course_id}/exam` requiere también `max_attempts` (entero 1–10) y `passing_score` (entero 1–20). Sin estos campos o fuera de rango retorna 422 con errores por campo. Los permisos por sede y CSRF se mantienen.
- Preguntas o criterios diferentes crean una versión nueva con cupo independiente. El horario/duración se puede actualizar sin crear versión. Los intentos pendientes conservan los criterios de su versión, al igual que los resultados completados.
- El máximo cuenta envíos completados. Un inicio nuevo reemplaza el único pendiente, como antes; no consume otro envío por abandonar una ventana.
- Desde 90 % de aciertos, inclusive, el servidor rechaza nuevos intentos con 409 y código `target_reached`. Agotar el cupo usa `attempt_limit`. Se comparan cantidades de respuestas correctas, sin redondear previamente la nota. Un histórico sin respuestas usa su nota guardada (18/20 equivale al umbral).
- La consulta de DNI incorpora `exam_policy`: `max_attempts`, `passing_score`, `attempts_used`, `remaining`, `retry_allowed` y `retry_block_reason`. Evita ofrecer un inicio imposible después de recargar. El inicio vuelve a verificar bajo bloqueo transaccional.
- El inicio devuelve `max_attempts` y `passing_score` junto con las preguntas, sin claves de respuesta. El envío agrega `passed`, `total`, `accuracy` y la política actual. `remaining=0` al alcanzar 90 % aunque sobre cupo. `retry_allowed=false` también si la versión dejó de estar disponible; no interpretar `remaining` como permiso suficiente.
- `passed` compara la nota de ese intento con el mínimo configurado; aprobar y poder reintentar son condiciones independientes. Por ejemplo, con mínimo 14, un 16 aprueba y puede reintentar si tiene cupo; un 18 ya no puede. Con mínimo 20, un 18 no aprueba y tampoco reintenta por la regla solicitada del 90 %.
- `passing_score=null` y `passed=null` identifican versiones anteriores sin mínimo definido; no equivalen a desaprobación. Los reportes y Excel muestran el criterio correspondiente a cada versión, incluso después de cambiar la configuración.
- Reportes incorporan `max_attempts`, `passing_score` y `passed`; el Excel agrega nota mínima, máximo de intentos y resultado, con filtros hasta la última columna. La selección de página no recorta la exportación.


## Títulos y enlaces del slider · 29 de octubre de 2026

Las rutas de crear/editar slider aceptan `title` (opcional, hasta 160 caracteres),
`subtitle` (opcional, hasta 300) y `link_url` (opcional, hasta 1000). Si se omiten
al editar, se conserva el valor anterior. En creación parten vacíos. La lista
pública y la administrativa los incluyen. No hay configuración de animaciones.

También aceptan `font_family` (`default`, `arial`, `georgia`, `trebuchet`),
`title_color` y `text_color` (hexadecimal `#RRGGBB`, normalizado a minúsculas),
`title_size` (entero 20–72), `text_size` (entero 12–36) y `text_align`
(`left`, `center`, `right`). Al omitirlos en edición, conservan su valor anterior.
En creación usan institucional, blanco, 36/17 px e izquierda. Valores inválidos
retornan 422. El orden manual usa `position`, como antes.

Los destinos admitidos son HTTP/HTTPS sin usuario/contraseña, `#inicio`,
`#capacitaciones`, `#eventos` y cursos/eventos publicados. Se revalidan al guardar
o activar; la respuesta pública retira enlaces a destinos internos no disponibles.
La carga múltiple del editor usa las rutas existentes por imagen, con confirmación
única y recuperación de fallos parciales, no un nuevo endpoint de lote.

En popups, `link_label` queda opcional y se genera si falta. Se conserva por
compatibilidad como etiqueta accesible; el enlace público envuelve la imagen,
sin un botón adicional. El esquema SQL de `home_popup` no cambia.
