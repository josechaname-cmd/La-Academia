# Materiales y portadas

Estado vigente: 30 de octubre de 2026.

También se admiten videos MP4/WebM de hasta 500 MB dentro de la capacitación.
La validación, API, reproductor, hosting y regla de vistas están en [Videos](VIDEOS.md).
El flujo siguiente corresponde a los documentos PDF/PowerPoint.

## Flujo

1. El administrador carga un PDF, PPT o PPTX (máximo 50 MB).
2. `FileTool` valida y guarda el original en `storage/files`, con una clave aleatoria, y añade su fila a `file_previews` dentro de la transacción.
3. `DocumentPreviewTool` procesa la cola mediante `backend/scripts/preview-worker.php`. Windows lo inicia en segundo plano con `tools/start-preview-worker.ps1`.
4. PDF se rasteriza con Poppler; PowerPoint se convierte primero a PDF con LibreOffice. La primera página se convierte a JPEG de hasta 1200 px.
5. Los derivados se guardan por SHA-256 del original en `storage/previews`. Se reutilizan si ya existen. El catálogo recibe estado y hash, no rutas físicas.
6. La portada elegida debe pertenecer a la capacitación. Sin selección explícita se usa el primer documento compatible; los videos no generan portada automática.

Estados: `queued`, `processing`, `ready`, `failed`. Un bloqueo de archivo evita procesadores concurrentes. Los trabajos interrumpidos durante más de diez minutos se recuperan en la siguiente ejecución, hasta tres intentos. El reintento de un fallo es administrativo. El frontend consulta pendientes cada cinco segundos durante un periodo limitado; una pestaña cerrada no sigue consultando.

## Dependencias locales

Las rutas se declaran en `backend/config/application.php` y pueden sobreescribirse en `storage/config.php`:

- `pdftoppm`: `tools/runtime/poppler/bin/pdftoppm.exe`.
- `soffice`: `tools/runtime/libreoffice/program/soffice.com`.
- `preview_directory`: `storage/previews`.

Estas dependencias permanecen en la instalación XAMPP, pero no deben entrar en Git. Al copiar solamente el código a otro equipo hay que provisionarlas y conservar sus licencias. Se utiliza un perfil separado de LibreOffice con seguridad de macros alta. La conversión conserva el diseño estático; no animaciones, audio o video.

Para vaciar la cola manualmente desde la raíz:

```powershell
& 'C:\xampp\php\php.exe' './backend/scripts/preview-worker.php'
```

El lanzador automático es específico de Windows; otro sistema necesita adaptar los ejecutables y programar el comando CLI. Los archivos protegidos, dañados o que superan el tiempo de conversión quedan como fallidos. Los errores figuran en la cola y `storage/previews/conversion.log`. El original no se reemplaza.

## Acceso y mantenimiento

La API comprueba visibilidad o sesión antes de servir derivados, incluso ante una petición condicional ETag. Las miniaturas y PDF usan `Cache-Control: private, no-cache`; los originales usan `private, no-store`. No se publican directorios de almacenamiento.

Los derivados sin referencia no se purgan automáticamente. No borrar el directorio mientras haya conversiones en curso. Un estado `ready` con un derivado borrado requiere reparación del estado antes de regenerarlo; el reintento ordinario solo restablece estados `failed`.

No existe generación automática de preguntas ni proveedor de IA instalado por este módulo.


## Portada personalizada

En el editor de una capacitación guardada, **Portada de la capacitación → Imagen de portada personalizada** permite cargar JPG, PNG o WEBP (hasta 8 MB). Se muestra una vista previa local antes de guardar. El material original permanece intacto. Para publicar se requiere al menos un documento o video, además del examen cuando corresponda.

`courses.custom_cover_id` referencia un archivo de imagen independiente, sin `course_id` en `files`, para no mezclarlo con los materiales ni contarlo como PDF/PPT. La carga por `POST /api/v1/admin/courses/{id}/cover-image` usa `multipart/form-data`, campo `file`, sesión administrativa y CSRF. `CourseCreationTool::uploadCover` coordina la transacción y elimina el archivo nuevo si falla el guardado.

Al seleccionar un material y pulsar **Usar como portada**, se retira la referencia personalizada y vuelve la portada automática. Las imágenes propias solo son públicas mientras estén vinculadas a una capacitación publicada. No se eliminan por la ruta genérica mientras estén vinculadas; las reemplazadas se conservan para revisión de archivos sin vínculo.
