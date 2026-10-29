# La Academia

Plataforma de capacitación con materiales PDF/PowerPoint, evaluaciones, gestión
por sede, resultados y administración de contenido. Backend PHP y MySQL,
frontend JavaScript sin compilación obligatoria en producción.

**Instalación desde GitHub y protección de datos:**
[guía de publicación e instalación](docs/PUBLICACION-GITHUB.md) y
[tratamiento de información privada](SECURITY.md). El repositorio distribuye
el código; la base de datos, credenciales, personal y materiales se mantienen
fuera de Git. La configuración de ejemplo está en `storage/config.example.php`.

**Carpeta activa de la instalación de desarrollo: `C:\xampp\htdocs\la-academia`.**

**Documentación técnica:** [manual del sistema](docs/DOCUMENTACION-TECNICA.md), [mapa de archivos](docs/MAPA-ARCHIVOS.md) y [despliegue en hosting y subdominios por sede](docs/DESPLIEGUE-Y-SUBDOMINIOS.md). Describe la implementación actual y distingue las funciones pendientes para separar portales y lecturas identificadas.

Abrir <http://localhost/la-academia/> con Apache y MySQL iniciados en XAMPP. Se edita directamente esta carpeta; no hay copia de trabajo en Documentos ni paso de publicación/sincronización.

**Revisión de interfaz:** [correcciones y validación del frontend](docs/REVISION-FRONTEND-UX-2026-10-29.md).

## Organización

```text
la-academia/
├── .htaccess                 Entrada protegida: solo publica interfaz y API
├── public/
│   ├── index.php             Única entrada PHP
│   ├── frontend/             Páginas y componentes JavaScript
│   └── assets/               CSS, imágenes y logo
├── backend/
│   ├── routes/api.php        Rutas y permisos de la API
│   ├── src/                  Servicios, repositorios y lógica
│   ├── config/               Configuración de aplicación
│   ├── views/                HTML y footer
│   ├── database/             Esquema SQL
│   └── scripts/              Mantenimiento por consola
├── storage/                  Acceso web denegado
│   ├── config.php            Conexión privada, excluida de Git
│   ├── files/                Materiales originales
│   ├── cache/                Caché regenerable
│   ├── previews/             Portadas y PDF derivados regenerables
│   └── backups/              Recuperación e instalaciones retiradas
├── tools/                   Validación y lanzador de conversión
│   └── runtime/              LibreOffice y Poppler locales, excluidos de Git
├── tests/                    Pruebas
├── docs/                     Documentación
└── archive/                  Historial retirado, sin ejecución web
```

Apache reescribe la URL del portal y `/api/v1/` hacia `public/index.php`; `/frontend/` y `/assets/` hacia los recursos de `public/`. Las carpetas privadas y el acceso directo por `/public/` se bloquean. No se necesita modificar Apache ni cambiar la dirección del portal. Las rutas de sesión existentes se conservan.

Para un dominio, la raíz web recomendada es `public`, conservando `public/index.php` como única entrada PHP. La configuración local actual requiere adaptar sus reglas para ese modo: [validación del arranque y guía de hosting](docs/ARRANQUE-Y-HOSTING.md), con plantilla Apache probada sin alterar esta instalación.

La base `la_academia` continúa administrada por MySQL en su directorio propio de XAMPP. No mover sus archivos físicos dentro del proyecto.

## Logo e icono de la pestaña

- Logo principal: `public/assets/image/logo/Logotipo la academia.png`.
- Favicon de Chrome: **`public/assets/image/favicon/favicon.png`**.

Para cambiar el icono de la pestaña, reemplazar `favicon.png` por una imagen PNG cuadrada, recomendada de **256 × 256 píxeles**, con el mismo nombre. No basta con cambiar la extensión de un JPG o ICO: debe guardarse/exportarse realmente como PNG. El favicon es independiente del logo principal. Por ahora contiene una copia del logo existente hasta que se coloque el icono definitivo.

Configuración: `backend/views/shell.php`. La URL incorpora automáticamente la fecha de modificación del archivo para renovar la caché al reemplazarlo. Después de sustituirlo, volver a cargar la página; si Chrome conserva el icono anterior, cerrar esa pestaña y abrirla de nuevo.

## Sistema de diseño

Tokens, componentes, fuentes CSS y comandos: [Guía de diseño](docs/DISENO.md). Las hojas en `public/assets/` son generadas; editar `public/frontend/design/` y ejecutar `node tools/build-design.mjs`.

## Popup de Inicio

El superadmin puede configurar imagen, enlace y activación en **Panel → Eventos → Popup de Inicio**. [Guía de uso y estructura](docs/POPUP-INICIO.md).

## Trabajo diario

Abrir esta carpeta en el editor. Los cambios PHP se aplican directamente; los recursos principales CSS/JS incorporan automáticamente su fecha de modificación para evitar caché antigua. Los imports internos conservan versiones explícitas hasta completar su migración controlada.

```powershell
& './tools/check-local.ps1'
```

Para migraciones de esquema explícitas:

```powershell
& 'C:\xampp\php\php.exe' './backend/scripts/migrate.php'
```

El antiguo sincronizador se conserva únicamente como historial en `archive/retired-tools/`; ya no se utiliza. Los respaldos son copias de recuperación, no instalaciones activas.

## Funciones y soporte

Exámenes con una o más preguntas, autor registrado, apertura en hora de Perú, cierre opcional y duración por intento. Nota proporcional sobre 20. Exportación Excel por examen/versión durante y después del periodo. Campana de actividad automática con actualización cada 30 segundos. Carrusel automático sin reproducción manual ni contador.

Soporte: **Área de TI**, con el correo autorizado en `support_email` dentro de la configuración privada o `ACADEMIA_SUPPORT_EMAIL`. Footer del portal sin logo, derechos reservados a ACEAPERU; oculto dentro del panel autenticado.

- [Arquitectura](docs/ARQUITECTURA.md).
- [Operación local](docs/OPERACION-LOCAL.md).
- [API](docs/API.md).
- [Validación](docs/VALIDACION.md).
- [Auditoría](docs/AUDITORIA.md).
- [Auditoría técnica y plan de arquitectura · 27-10-2026](docs/AUDITORIA-ARQUITECTURA-2026-10-27.md).
- [Procesos](docs/PROCESOS.md).
- [Datos y migraciones](docs/DATOS-Y-MIGRACION.md).
- [Materiales y portadas](docs/MATERIALES.md).


## Slider y popups de Inicio

El superadmin gestiona **Eventos → Slider de Inicio** desde el panel: imágenes, orden, visibilidad, encuadre y vista previa de escritorio/móvil antes de guardar. Las imágenes existentes se importan una sola vez; las nuevas se cargan desde el formulario, sin editar código. Rotación cada cinco segundos con puntos expandibles. [Guía del slider](docs/SLIDER-INICIO.md).

**Eventos → Popup de Inicio** contiene la lista de anuncios con CRUD, previsualización y activación exclusiva: solo uno activo. Título opcional, tamaño compacto/estándar, recorte opcional y destino guiado a evento, capacitación o modo informativo. [Guía de popups](docs/POPUP-INICIO.md).

La antigua gestión de Avisos y banners permanece retirada; la campana recibe actividad del sistema automáticamente.

## Navegación del panel

El encabezado, sidebar y campana permanecen montados al cambiar de sección. Los submenús se cierran al salir de su sección; abrir un destino hijo despliega su grupo. El Inicio muestra vistas acumuladas por publicación en barras, con filtros locales, métricas, evaluaciones y accesos rápidos. Solo las publicaciones activas contribuyen al alcance. El contenido anterior se conserva hasta que la siguiente vista esté lista. La caché vive solamente en memoria: capacitaciones administrativas y eventos por 30 segundos y categorías por 60 segundos (máximo 64 consultas). Se invalida antes y después de escrituras, al cambiar de usuario o sesión, y ante errores de autorización. Los detalles de edición, exámenes, resultados, usuarios, sedes y notificaciones consultan al servidor; no se guardan respuestas privadas en localStorage ni en la caché HTTP.

Validar la caché de navegación sin tocar la base de datos: `node tests/navigation-cache.mjs`.

## Capacitaciones y actividad automática — 3 de octubre de 2026

El panel abre en **Inicio**, con un resumen general. **Capacitaciones** abre el listado y su flecha despliega **Resultados**, también accesible desde la página de capacitaciones. La gestión manual de Avisos está retirada. La campana enlaza al contenido, evento o versión de examen correspondiente: resultados recibidos, cierre de examen y modificaciones de capacitaciones, materiales, periodos y eventos.

El historial persiste en `activity_log`; la caché solo acelera su lectura. Una nueva revisión limpia la caché de navegación y actualiza Resultados si está abierto, conservando sus filtros. Detalles del funcionamiento, tiempos y límites: [Actividad y notificaciones](docs/ACTIVIDAD.md).

Las notificaciones se abren pulsando toda la tarjeta y desaparecen al quedar leídas; no incluyen botones de detalle ni de marcado manual.


## Creación y publicación

Guardar el examen conduce al paso **Publicar**. Publicar devuelve al listado con confirmación destacada. El editor permite subir una portada propia o recuperar la primera página del PDF/PPT. Las tarjetas muestran títulos destacados sin descripción; el detalle conserva el texto completo. Véanse [Procesos](docs/PROCESOS.md) y [Materiales](docs/MATERIALES.md).

## Revisión del backend y MySQL — 28 de octubre de 2026

[Informe completo, hallazgos, correcciones y pendientes](docs/AUDITORIA-BACKEND-2026-10-27.md). Inventario de los 71 endpoints (evidencia local excluida de Git). La suite `tools/check-local.ps1` utiliza bases temporales con datos sintéticos; no ejecuta pruebas CRUD sobre la base activa.


[Correcciones de gravedad alta y permisos](docs/CORRECCIONES-ALTAS-2026-10-28.md): PHP actualizado, cuenta SQL limitada, identificación previa obligatoria por DNI y dashboard por rol.

## Gestión individual y carga de colaboradores — 28 de octubre de 2026

En **Usuarios → Colaboradores**, busca por DNI, nombre o cargo, o abre el directorio de una sede. Las acciones **Editar** y **Eliminar** aparecen como iconos con etiquetas; también se puede eliminar desde la ficha. Agregar, guardar, reactivar, eliminar y confirmar una carga solicitan verificar los datos antes de escribir. Eliminar desactiva al trabajador y su acceso de capacitador, cierra sus sesiones y conserva las evaluaciones. **Actualizar directorio** obtiene los datos actuales conservando el filtro. El DNI se mantiene como identificador del historial.

La sección se llama **Carga masiva** y acepta trabajadores de cualquier sede: **Validar archivo → revisar sedes y cambios → Confirmar carga**. La sede escrita en cada fila tiene prioridad; las filas vacías requieren una sede seleccionada expresamente. Se rechazan sedes desconocidas, inactivas o ambiguas y DNI duplicados. La revisión muestra altas, actualizaciones, traslados, reactivaciones y accesos vinculados; si hay cambios posteriores en los trabajadores o sus accesos, se exige validar de nuevo.

La gestión individual y la carga actualizan el mismo padrón, los datos de evaluaciones/reportes y los accesos de capacitador. Un traslado actualiza la sede del acceso y cierra sus sesiones, manteniendo la sede histórica de los cursos y resultados. Reactivar un trabajador no habilita automáticamente una cuenta administrativa desactivada; eso se realiza desde Usuarios. Pruebas con datos sintéticos: `node tests/personnel.mjs` y `php tests/isolated.php personnel-import.php`; contratos en [API](docs/API.md).
