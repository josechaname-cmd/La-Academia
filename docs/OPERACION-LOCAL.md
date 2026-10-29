# Operación local unificada

## Arranque

1. Iniciar Apache y MySQL en XAMPP.
2. Abrir <http://localhost/la-academia/>.
3. Editar directamente `C:\xampp\htdocs\la-academia`.

No hay despliegue intermedio ni archivos activos en Documentos/ChatGPT. No se cambió la configuración global de Apache. Se requiere mod_rewrite y AllowOverride, ya usados por la instalación. El acceso sigue limitado al equipo con `Require local`.

## Configuración y almacenamiento

- `backend/config/application.php`: valores predeterminados y rutas relativas al proyecto.
- `storage/config.php`: configuración privada de MySQL, excluida de Git.
- `public/assets/slider/`: imágenes del slider, detectadas automáticamente al abrir Inicio. Orden por nombre, sin lista en código.
- `storage/files/`: originales de materiales e imágenes; acceso solo a través de la API y sus permisos.
- `storage/cache/`: caché regenerable; no guarda sesiones ni resultados.
- `storage/previews/`: portadas JPEG y PDF derivados, registros y bloqueo del conversor.
- `tools/runtime/`: dependencias locales de conversión; excluidas de Git. Ver [materiales](MATERIALES.md).
- `storage/backups/`: respaldos anteriores y recuperación de la unificación.

La base `la_academia` sigue en MySQL; no se importó ni reemplazó. Sesiones PHP conservan su almacenamiento de XAMPP y la cookie conserva `/la-academia/`.

## Validación

Desde la raíz activa:

```powershell
& './tools/check-local.ps1'
```

Este comando valida sintaxis, reglas, caché y HTTP; no sincroniza carpetas. Las pruebas de negocio revierten sus registros temporales. Para validar el generador XLSX puede ejecutarse `python tests/report_xlsx.py` si openpyxl está disponible.

Las migraciones se ejecutan explícitamente con `C:\xampp\php\php.exe backend/scripts/migrate.php`. Los importadores de la instalación antigua y el sincronizador retirado están en `archive/retired-tools`, solo como historial.

El maestro del examen se sincroniza con `backend/scripts/import-personnel.php`, que recibe por entrada estándar una lista JSON con `dni`, `name` y `job_title`. La operación es transaccional: valida toda la lista antes de activar los registros recibidos y desactivar los ausentes. La fuente de referencia actual permanece en `docs/DATA GENERAL OPERATIVO Y ADM.xlsx`; no se lee durante cada consulta del portal.

## Respaldo y recuperación

Respaldar código, `storage/files`, configuración privada y una exportación SQL de `la_academia`. No publicar respaldos por HTTP ni incluir credenciales en Git. Las copias de antes de la unificación están en `storage/backups/` y no se ejecutan.

Las validaciones HTTP deben confirmar 403 para `storage/config.php`, `backend/`, `public/index.php`, `docs/`, `tests/`, `tools/` y `.git/config`. Si se cambia la configuración de Apache, repetirlas antes de utilizar la plataforma.

Diagnóstico: `api/v1/health` verifica conexión y tablas. Errores internos se correlacionan por `request_id` con `C:\xampp\apache\logs\error.log`, sin exponer contraseñas ni consultas al navegador.

## Pruebas de interfaz sin navegador

Las pruebas DOM de evaluación y administración usan jsdom exclusivamente como dependencia de desarrollo. Instalación reproducible desde la raíz del proyecto: `npm ci --prefix tests --ignore-scripts`. Después ejecutar `powershell -ExecutionPolicy Bypass -File tools/check-local.ps1`.

`tests/evaluation-state.mjs` comprueba respuestas y reloj; `tests/evaluation-dialog.mjs` verifica consulta por DNI, presentación de nombre/cargo, registro mínimo, navegación, cierre/reanudación, revisión, envío, error/reintento y limpieza; `tests/admin-exam.mjs` verifica horario opcional, duración obligatoria, disponibilidad sin pérdida de edición y filtros locales de tarjetas. No realizan inspección visual ni requieren cuenta de usuario.

Las pruebas `tests/course-editor.mjs` y `tests/report-navigation.mjs` están incluidas en la comprobación estándar. Verifican cambios pendientes, examen opcional, pasos de preparación, transiciones de reportes y respuestas fuera de orden mediante DOM simulado, sin validación visual.
