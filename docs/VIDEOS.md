# Videos como materiales de capacitación

Implementación: 30 de octubre de 2026. El video pertenece a una capacitación y a
su sede responsable, igual que los documentos. No crea otro catálogo ni otro
contador. Los resultados e intentos del examen mantienen sus reglas actuales.

## Ubicación y uso

En **Capacitaciones → Nueva**, el material inicial puede ser un documento o un
video. En una capacitación existente, usa **Materiales → Documentos y videos**.
Selecciona un archivo, revisa su vista previa local y confirma la carga. El
indicador distingue transferencia de validación/guardado; llegar a 100 % no
significa que el servidor haya aceptado el archivo.

- Videos: hasta **500 MB (524 288 000 bytes)** por archivo. PDF/PPT/PPTX conservan
  su máximo de 50 MB; imágenes, 8 MB. El editor consulta el límite efectivo del
  servidor, que puede ser menor si PHP o el hosting tienen otra configuración.
- MP4: H.264, video de 8 bits 4:2:0 y audio AAC opcional. Recomendado 1080p y
  exportación optimizada para web (`faststart`).
- WebM: VP8/VP9 de 8 bits 4:2:0, con audio Opus/Vorbis opcional.
- Máximo: 4096 px por lado, 24 horas, una pista de video y como máximo una de
  audio. Se rechazan contenedores dañados, solo audio, pistas adicionales y
  códecs incompatibles. No se hace conversión automática ni se garantiza que
  la inspección de metadatos detecte todo daño en fotogramas del archivo.
- Las portadas automáticas siguen usando documentos. Para una capacitación
  solo con video, carga una imagen personalizada en **Portada**.

El listado administrativo muestra nombre, tamaño, duración y resolución,
permite revisar el video, descargarlo y quitarlo con confirmación. Quitar el
último material devuelve la capacitación a borrador y conserva sus vistas,
exámenes y resultados. La publicación admite solo video con o sin examen.

El portal usa controles nativos: reproducción manual, pausa, volumen, adelanto,
pantalla completa y reproducción en línea en móviles compatibles. No hay
autoplay. Solo precarga metadatos; cambiar de material o salir detiene el video.
Si falla, ofrece reintento y conserva la descarga del original. La reproducción
final depende del soporte multimedia del navegador/dispositivo.

## Backend y almacenamiento

| Archivo | Responsabilidad |
|---|---|
| [FileTool.php](../backend/src/Services/FileTool.php) | Límites, validación, almacenamiento, relación con curso, borrado y streaming |
| [VideoInspector.php](../backend/src/Services/VideoInspector.php) | FFprobe local, MIME/códecs, duración y resolución, sin shell ni URLs remotas |
| [MaterialUploadPolicy.php](../backend/src/Services/MaterialUploadPolicy.php) | Capacidades y límites efectivos de PHP/aplicación |
| [ByteRange.php](../backend/src/Support/ByteRange.php) | Interpretación de un rango HTTP de bytes |
| [VideoMaterialsMigration.php](../backend/src/Migrations/VideoMaterialsMigration.php) | Nuevas columnas opcionales en `files` |
| [material-upload.js](../public/frontend/components/material-upload.js) | Selección, límites, vista previa local y progreso |
| [material-viewer.js](../public/frontend/components/material-viewer.js) | Reproductor integrado, cambio de material y apertura real |
| [ContentViews.php](../backend/src/Services/ContentViews.php) | Dedupe por curso/sesión y comprobación de pertenencia del material |

Los binarios van en el directorio privado configurado por `storage`, por defecto
`storage/files`. Se generan nombres aleatorios y se sirven exclusivamente por
API; nunca se guardan en `public/`, en SQL como BLOB ni en Git. Los metadatos se
obtienen en el servidor y no se aceptan valores declarados por el navegador.

FFprobe se ejecuta con argumentos separados, demuxer restringido, protocolo
local `file`, referencias externas de MP4 desactivadas, límite de tiempo y
salida acotada. No se pasan comandos escritos por usuarios ni se descargan
videos desde enlaces. Validar no equivale a escanear con antivirus.

La creación de curso y material mantiene la transacción y compensación de
archivos existente. Los videos no se envían a la cola de LibreOffice/Poppler.
Los documentos conservan sus vistas previas. Se verifican sesión, CSRF y sede
antes de permitir una carga o eliminación; borradores son privados.

## Base de datos

Se reutiliza `files.course_id`. La migración aditiva e idempotente añade:

| Columna | Tipo | Uso |
|---|---|---|
| `duration_seconds` | DECIMAL(12,3), NULL | Duración medida |
| `video_width`, `video_height` | INT UNSIGNED, NULL | Resolución codificada |
| `video_codec`, `audio_codec` | VARCHAR(24), NULL | Códecs detectados; audio opcional |

Los documentos anteriores conservan NULL. `original_name`, `mime`, `extension`,
`size`, `storage_key` y `created_at` siguen siendo la fuente de sus datos. El
campo de respuesta `media_type` se deriva de la extensión, sin duplicarlo en SQL.
No se cambian sedes, notas, historial ni contadores existentes.

## API

| Método y ruta | Contrato |
|---|---|
| `GET /api/v1/admin/materials/options` | Administrador: extensiones, límites efectivos en bytes y `video_enabled`; sin rutas privadas |
| `POST /api/v1/admin/courses` | Multipart: información del curso y `file`, incluido video inicial |
| `POST /api/v1/admin/courses/{course_id}/files` | Multipart: un `file`; sede y CSRF como antes |
| `GET /api/v1/courses/{id}` | `materials` incluye `media_type`, MIME y metadatos de video, sin clave/ruta privada |
| `GET /api/v1/files/{id}` | Video inline, `Accept-Ranges: bytes`, lectura por bloques sin cargar 500 MB en memoria |
| `HEAD /api/v1/files/{id}` | Mismos permisos y cabeceras, sin cuerpo ni vista |
| `GET /api/v1/files/{id}?download=1` | Descarga original, mismos permisos |
| `POST /api/v1/courses/{id}/view` | JSON: `file_id` del material reproducido/abierto; CSRF requerido |
| `DELETE /api/v1/admin/files/{id}` | Elimina material y archivo conservando las reglas de publicación |

Se atienden rangos simples `bytes=a-b`, `bytes=a-` y `bytes=-n` con 206,
`Content-Range` y longitud exacta. Rangos válidos imposibles devuelven 416 con
`bytes */tamaño`. Rangos múltiples o malformados se ignoran y devuelven 200.
`If-Range` acepta el ETag actual o una fecha válida; si no coincide se entrega
el archivo completo. HEAD ignora Range. La sesión se libera antes de transmitir
el cuerpo. Cada petición vuelve a validar acceso, incluso si incluye Range.

Errores: 422 archivo/formato/códec/tamaño no válido; 413 cuerpo mayor que el
límite PHP; 503 inspector no disponible; 401/403 permisos o CSRF; 404 archivo
inexistente o no publicado para el visitante. El proxy puede rechazar 413 antes
de PHP: el frontend también reconoce esa respuesta aunque no contenga JSON.

## Regla de vistas

Para video, el frontend notifica al recibir `playing`, cuando comienza la
reproducción. `loadedmetadata`, `canplay`, `play` sin reproducción, solicitar
fragmentos, adelantar y descargar un video no generan vistas. En documentos se
conserva el conteo al abrir el visor o solicitar la descarga desde la interfaz.

La clave sigue siendo **capacitación + sesión**, compartida entre todos los
materiales. Repetir, cambiar de material, abrir otra pestaña con la misma sesión
o recargar no aumenta el total. Administradores quedan excluidos. Si se envía
`file_id`, el servidor exige que pertenezca al curso publicado; el parámetro
sigue siendo opcional para clientes anteriores. El contador compartido actualiza
el visor, catálogo, inicio y panel mediante la invalidación de caché existente.

Son aperturas/inicios de reproducción, no trabajadores únicos ni evidencia de
visionado completo. No se identifica al visitante por DNI, no se mide porcentaje
visto y no se condiciona el examen a terminar el video. La API no certifica que
un navegador haya reproducido realmente; el evento de reproducción lo comunica
el cliente. No se mezclan estos datos con resultados del examen.

## Instalación y hosting

1. Respaldar base y almacenamiento; ejecutar `php backend/scripts/migrate.php`
   con la cuenta de mantenimiento. La cuenta web conserva sus permisos actuales.
2. Instalar FFprobe y configurar `ffprobe` con su ruta absoluta en la configuración
   privada, o `ACADEMIA_FFPROBE`. En Linux suele ser `/usr/bin/ffprobe`.
   En Windows, `python tools/install-video-runtime.py` instala el runtime local
   desde la distribución enlazada por FFmpeg, con versión y SHA-256 fijados.
   Requiere `curl.exe` y un `tar` con soporte 7z. Los ejecutables quedan ignorados
   por Git; revisar periódicamente sus actualizaciones.
3. Configurar PHP: `upload_max_filesize=500M`, `post_max_size=512M`,
   `max_input_time=900`. No hace falta cargar el archivo completo en RAM.
   El `.htaccess` local y el ejemplo de VirtualHost configuran estos valores
   para mod_php. En PHP-FPM/hosting se ajustan en el panel, pool o configuración
   permitida por el proveedor; no se supone que `.htaccess` modifique PHP-FPM.
4. Configurar el límite de cuerpo y tiempos del proxy/servidor para al menos
   512 MB; comprobar el espacio de temporales y almacenamiento. Durante una
   carga puede coexistir el temporal con el archivo final. HTTPS y permisos de
   carpetas privados siguen siendo obligatorios para producción.
5. Verificar subida, reproducción, adelanto, permisos y vistas en el hosting real.
   PHP entrega video progresivo; no implementa HLS, CDN ni carga reanudable.
   Para muchas reproducciones simultáneas conviene almacenamiento de objetos
   o streaming dedicado con autorización equivalente.

## Validación

`tests/video-materials.mjs` comprueba DOM, eventos, vistas, tamaños, progreso y
limpieza; `tests/video-policy.php`, rangos y límite de archivo real. La suite
HTTP aislada genera MP4/WebM sintéticos con FFmpeg y prueba carga, metadatos,
formatos falsos, códec incompatible, sedes, CSRF, HEAD/Range, vistas y borrado.
No introduce archivos ni trabajadores de prueba en la instalación real. No se
ha realizado verificación visual o decodificación en un navegador real.

Para probar el límite con archivos reales, activar `ACADEMIA_TEST_LARGE_VIDEO=1`
y ejecutar `php tests/isolated.php http-isolated.php`. En Windows/XAMPP este modo
levanta Apache temporal en loopback, con base, sesiones y archivos aislados;
requiere 2 GB libres. Genera un MP4 sintético de 500 MB, comprueba su aceptación
y luego rechaza 500 MB más un byte. El servidor PHP de desarrollo no se utiliza
para esta prueba de gran tamaño porque almacena el cuerpo de la petición en
memoria. El Apache activo no se reinicia ni se modifica.

Resultado local: 22 suites de frontend, pruebas PHP de políticas/negocio,
contratos HTTP y medios, y carga real del límite en Apache aprobados. La migración
se ejecutó dos veces conservando los 27 archivos previos. Los valores efectivos
500M/512M y la política CSP de medios se verificaron en los dos modos de arranque
Apache. Las pruebas grandes y sus archivos fueron eliminados del entorno aislado.

Referencias: [FFprobe](https://ffmpeg.org/ffprobe.html),
[descargas oficiales de FFmpeg](https://ffmpeg.org/download.html),
[rangos HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests).
