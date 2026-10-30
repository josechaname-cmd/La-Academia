# La Academia · Mapa de archivos

**Revisión:** 29 de octubre de 2026. Inventario de archivos activos y auxiliares del proyecto, contrastado con el disco. [Manual técnico](DOCUMENTACION-TECNICA.md) · [Despliegue](DESPLIEGUE-Y-SUBDOMINIOS.md).

## Cómo usar este mapa

La tabla identifica el propietario de cada responsabilidad. Las rutas son relativas a la raíz del proyecto. No se enumeran cada imagen, archivo subido, dependencia descargada o copia histórica. Estos grupos se explican al final. Las plantillas no se activan automáticamente y los scripts de mantenimiento no son endpoints web.


El inventario incluye código, configuración, diseño, herramientas y pruebas; las evidencias operativas privadas permanecen excluidas de Git.


## Raíz del proyecto

| Archivo | Responsabilidad |
|---|---|
| [.gitignore](../.gitignore) | Excluye configuración/datos, respaldos, archivos retirados y dependencias locales. |
| [.htaccess](../.htaccess) | Reglas XAMPP: Require local, reescritura hacia public y bloqueo de privados. |
| [README.md](../README.md) | Entrada documental y comandos de trabajo del proyecto. |

## assets

| Archivo | Responsabilidad |
|---|---|
| learning.css (evidencia local excluida de Git) | Resto heredado de la raíz; el shell actual carga public/assets/learning.css. |

## backend

| Archivo | Responsabilidad |
|---|---|
| [.htaccess](../backend/.htaccess) | Defensa adicional que deniega acceso web al backend. |
| [bootstrap.php](../backend/bootstrap.php) | Registra autoload Academia, zona horaria y manejo global de errores. |

## backend/config

| Archivo | Responsabilidad |
|---|---|
| [application.php](../backend/config/application.php) | Combina predeterminados/entorno con el array de configuración privada. |
| [database-permissions.php](../backend/config/database-permissions.php) | Mapa de permisos DML por tabla para el usuario web. |
| [maintenance.php](../backend/config/maintenance.php) | Selecciona configuración CLI de mantenimiento; respeta ACADEMIA_CONFIG explícito. |

## backend/database

| Archivo | Responsabilidad |
|---|---|
| [schema.sql](../backend/database/schema.sql) | Crea el esquema base; necesita las migraciones complementarias de migrate.php. |

## backend/routes

| Archivo | Responsabilidad |
|---|---|
| [api.php](../backend/routes/api.php) | Fuente autoritativa de métodos, URLs, controlador, acción, rol y estado HTTP. |

## backend/scripts

| Archivo | Responsabilidad |
|---|---|
| [audit.php](../backend/scripts/audit.php) | Auditoría de metadatos/integridad/EXPLAIN en lectura; su plan de Top conserva límite histórico 3. |
| [import-personnel.php](../backend/scripts/import-personnel.php) | CLI que reemplaza el padrón desde JSON; puede desactivar ausentes. |
| [migrate.php](../backend/scripts/migrate.php) | CLI de esquema más ajustes/backfills; escribe con cuenta de mantenimiento. |
| [orphan-report.php](../backend/scripts/orphan-report.php) | Reporta archivos sin referencias para revisión; no los elimina. |
| [preview-worker.php](../backend/scripts/preview-worker.php) | CLI que procesa la cola de conversiones de una instancia y finaliza. |

## backend/src/Agents

| Archivo | Responsabilidad |
|---|---|
| [AdminAgent.php](../backend/src/Agents/AdminAgent.php) | Sesión, usuarios, sedes, personal, eventos, categorías y actividad administrativa. |
| [AgentInterface.php](../backend/src/Agents/AgentInterface.php) | Contrato execute para los controladores de acciones. |
| [ContentAgent.php](../backend/src/Agents/ContentAgent.php) | Catálogo, edición/publicación, materiales, portadas y acceso a derivados. |
| [ExamAgent.php](../backend/src/Agents/ExamAgent.php) | Configuración del examen, identificación previa, inicio y envío de intentos. |
| [HomePopupAgent.php](../backend/src/Agents/HomePopupAgent.php) | Acciones públicas y administrativas de la colección de popups. |
| [HomeSliderAgent.php](../backend/src/Agents/HomeSliderAgent.php) | Acciones públicas y administrativas del carrusel. |
| [ReportAgent.php](../backend/src/Agents/ReportAgent.php) | Consultas de resumen/resultados y exportación protegidas por acceso. |
| [ViewAgent.php](../backend/src/Agents/ViewAgent.php) | Entrada para registrar aperturas públicas de cursos/eventos. |

## backend/src/Exceptions

| Archivo | Responsabilidad |
|---|---|
| [PreviewException.php](../backend/src/Exceptions/PreviewException.php) | Errores de conversión y traducción a mensajes públicos seguros. |

## backend/src/Http

| Archivo | Responsabilidad |
|---|---|
| [AgentRegistry.php](../backend/src/Http/AgentRegistry.php) | Construye y conecta servicios/repositorios/controladores por acción. |
| [ApiException.php](../backend/src/Http/ApiException.php) | Error HTTP de aplicación con estado, código y campos. |
| [ApiKernel.php](../backend/src/Http/ApiKernel.php) | Despacha API, valida acceso/CSRF, coordina caché, errores y respuestas. |
| [ErrorHandler.php](../backend/src/Http/ErrorHandler.php) | Convierte excepciones en respuesta pública segura y registra diagnóstico. |
| [RequestContext.php](../backend/src/Http/RequestContext.php) | Lee entrada HTTP y archivos y comprueba método esperado por el controlador. |
| [Router.php](../backend/src/Http/Router.php) | Resuelve método y ruta contra el contrato; extrae parámetros. |
| [WebKernel.php](../backend/src/Http/WebKernel.php) | Cabeceras y selección entre portal HTML y API; resuelve base pública. |

## backend/src/Middleware

| Archivo | Responsabilidad |
|---|---|
| [CourseAccess.php](../backend/src/Middleware/CourseAccess.php) | Comprueba pertenencia/acceso a cursos, exámenes, archivos y contenido derivado. |

## backend/src/Migrations

| Archivo | Responsabilidad |
|---|---|
| [AccessMigration.php](../backend/src/Migrations/AccessMigration.php) | Roles, sede, activo, auth_version y compatibilidad de cuentas administrativas. |
| [CatalogMigration.php](../backend/src/Migrations/CatalogMigration.php) | Duración nullable y catálogo inicial/histórico de categorías. |
| [ContentViewsMigration.php](../backend/src/Migrations/ContentViewsMigration.php) | Agrega los contadores de vistas requeridos por publicaciones. |
| [CourseExamMigration.php](../backend/src/Migrations/CourseExamMigration.php) | Configura el indicador de evaluación requerida en cursos. |
| [ExamPolicyMigration.php](../backend/src/Migrations/ExamPolicyMigration.php) | Agrega intentos por versión y nota mínima nullable para conservar exámenes anteriores. |
| [ExamScheduleMigration.php](../backend/src/Migrations/ExamScheduleMigration.php) | Agrega programación, duración y habilitación de exámenes. |
| [HomePopupCollectionMigration.php](../backend/src/Migrations/HomePopupCollectionMigration.php) | Convierte popup a colección y añade coordinación de activación exclusiva. |
| [OrganizationMigration.php](../backend/src/Migrations/OrganizationMigration.php) | Relaciones de sede/persona/autor; contiene asignaciones históricas a Breña cuando existe. |
| [PersonnelMigration.php](../backend/src/Migrations/PersonnelMigration.php) | Crea padrón y agrega cargo a matrículas. |
| [SliderContentMigration.php](../backend/src/Migrations/SliderContentMigration.php) | Agrega títulos, texto y enlaces opcionales al slider. |
| [PortalMediaMigration.php](../backend/src/Migrations/PortalMediaMigration.php) | Estructura/estilos de medios y primera importación del slider. |
| [PreviewMigration.php](../backend/src/Migrations/PreviewMigration.php) | Portadas y tabla/cola inicial de derivados de materiales. |
| [TrainingEditorMigration.php](../backend/src/Migrations/TrainingEditorMigration.php) | Portada personalizada, autor del examen y nota decimal. |

## backend/src/Repositories

| Archivo | Responsabilidad |
|---|---|
| [AccessRepository.php](../backend/src/Repositories/AccessRepository.php) | Consultas de pertenencia y bloqueos para autorización por curso/sede. |
| [ActivityRepository.php](../backend/src/Repositories/ActivityRepository.php) | Registra actividad, sincroniza cierres y obtiene feed/revisiones. |
| [CategoryRepository.php](../backend/src/Repositories/CategoryRepository.php) | Lista y crea categorías por ámbito. |
| [CourseRepository.php](../backend/src/Repositories/CourseRepository.php) | Consulta y modifica capacitación, sede, publicación/archivo y portada. |
| [EventRepository.php](../backend/src/Repositories/EventRepository.php) | Persistencia y listado de eventos; coordina referencias a sus imágenes. |
| [ExamRepository.php](../backend/src/Repositories/ExamRepository.php) | Persistencia/versionado y habilitación del examen de una capacitación. |
| [HomePopupRepository.php](../backend/src/Repositories/HomePopupRepository.php) | CRUD de popups y exclusividad del anuncio activo. |
| [HomeSliderRepository.php](../backend/src/Repositories/HomeSliderRepository.php) | CRUD, orden, estado y listado público de imágenes del carrusel. |
| [PersonnelRepository.php](../backend/src/Repositories/PersonnelRepository.php) | Padrón, búsqueda, CRUD lógico, revisiones, importación y sincronización de matrículas/accesos. |
| [ReportRepository.php](../backend/src/Repositories/ReportRepository.php) | Consultas de exámenes, participantes y resumen con Top 10 de notas. |
| [SiteRepository.php](../backend/src/Repositories/SiteRepository.php) | Sedes y controles al editar/desactivar. |
| [UserRepository.php](../backend/src/Repositories/UserRepository.php) | Cuentas, hash de contraseña, roles/sede y protección del último superadmin. |

## backend/src/Services

| Archivo | Responsabilidad |
|---|---|
| [AttemptTool.php](../backend/src/Services/AttemptTool.php) | Validación del participante, sede/horario/intentos, creación, nota y envío idempotente. |
| [AuthTool.php](../backend/src/Services/AuthTool.php) | Sesiones, CSRF, login/setup/logout, limitación de intentos y roles. |
| [ContentViews.php](../backend/src/Services/ContentViews.php) | Contador público deduplicado por sesión/publicación; excluye administradores. |
| [CourseCreationTool.php](../backend/src/Services/CourseCreationTool.php) | Coordina creación con primer material y portadas con compensación de archivos. |
| [CoursePolicy.php](../backend/src/Services/CoursePolicy.php) | Regla administrativa de sede del actor; superadmin tiene alcance global. |
| [DocumentPreviewTool.php](../backend/src/Services/DocumentPreviewTool.php) | Cola, disparador Windows, conversión, lock/reintentos y streaming de derivados. |
| [EventGalleryTool.php](../backend/src/Services/EventGalleryTool.php) | Valida composición/orden y referencias de imágenes de evento. |
| [ExamPolicy.php](../backend/src/Services/ExamPolicy.php) | Valida intentos/nota mínima y calcula aprobación y umbral exacto del 90 %. |
| [ExamRules.php](../backend/src/Services/ExamRules.php) | Validación de preguntas, presentación pública y cálculo de calificación. |
| [ExamSchedule.php](../backend/src/Services/ExamSchedule.php) | Estado/ventanas del examen y fecha límite efectiva del intento. |
| [PublicLink.php](../backend/src/Services/PublicLink.php) | Valida destinos públicos internos y enlaces HTTP/HTTPS del slider. |
| [FileTool.php](../backend/src/Services/FileTool.php) | Valida, almacena, elimina y transmite archivos privados y metadatos. |
| [MediaUpload.php](../backend/src/Services/MediaUpload.php) | Carga compartida de medios para slider y popup. |
| [ParticipantAccess.php](../backend/src/Services/ParticipantAccess.php) | Vincula identificación previa por curso/DNI a la sesión antes de iniciar examen. |
| [PersonnelImportTool.php](../backend/src/Services/PersonnelImportTool.php) | Recibe CSV/XLSX, convierte Excel con LibreOffice, normaliza filas y gestiona temporales. |
| [ReportExport.php](../backend/src/Services/ReportExport.php) | Construye el reporte XLSX desde resultados, separado de la consulta SQL. |
| [SliderImages.php](../backend/src/Services/SliderImages.php) | Descubre imágenes heredadas del slider para su importación inicial. |

## backend/src/Support

| Archivo | Responsabilidad |
|---|---|
| [CompoundDocumentTool.php](../backend/src/Support/CompoundDocumentTool.php) | Lectura de contenedores binarios OLE usados por PPT antiguo. |
| [Database.php](../backend/src/Support/Database.php) | PDO, consultas preparadas, transacciones/savepoints y efectos tras commit/rollback. |
| [FileCache.php](../backend/src/Support/FileCache.php) | Caché de archivos y mecanismo de invalidación. |
| [Http.php](../backend/src/Support/Http.php) | Normaliza entryScript, genera errores de API y respuestas JSON. |
| [Logger.php](../backend/src/Support/Logger.php) | Log estructurado y registro de fallos con campos controlados. |
| [PresentationTool.php](../backend/src/Support/PresentationTool.php) | Extrae texto/diapositivas de PPT/PPTX. |
| [Validation.php](../backend/src/Support/Validation.php) | Validaciones reutilizables de texto, números, opciones y otros campos. |
| [XlsxWriter.php](../backend/src/Support/XlsxWriter.php) | Genera el libro Excel exportable sin requerir LibreOffice. |
| [ZipTool.php](../backend/src/Support/ZipTool.php) | Lee las entradas de diapositivas PPTX con límites de tamaño/cantidad. |

## backend/src/Validators

| Archivo | Responsabilidad |
|---|---|
| [Password.php](../backend/src/Validators/Password.php) | Reglas para contraseña nueva conservando su contenido intencional. |
| [PersonnelRows.php](../backend/src/Validators/PersonnelRows.php) | Validación/normalización de filas del padrón y detección de duplicados. |

## backend/views

| Archivo | Responsabilidad |
|---|---|
| [footer.php](../backend/views/footer.php) | Footer público y contacto de soporte tomado de la configuración. |
| [shell.php](../backend/views/shell.php) | HTML inicial, referencias a assets versionados, app.js, modales y navegación base. |

## public

| Archivo | Responsabilidad |
|---|---|
| [.htaccess](../public/.htaccess) | Solo desactiva listado de directorios; depende de las reglas locales de la raíz. |
| [index.php](../public/index.php) | Única entrada PHP del portal y API; carga el backend privado. |

## public/assets

| Archivo | Responsabilidad |
|---|---|
| [design-system.css](../public/assets/design-system.css) | Tokens/componentes CSS generados y delimitados a academy-ui. |
| [learning.css](../public/assets/learning.css) | CSS generado por build-design; no editar directamente. |
| [styles.css](../public/assets/styles.css) | CSS generado por build-design; no editar directamente. |

## public/frontend

| Archivo | Responsabilidad |
|---|---|
| [api.js](../public/frontend/api.js) | Mapeo cliente de acciones a endpoints, CSRF, archivos, errores e invalidación de cachés. |
| [app.js](../public/frontend/app.js) | Router de interfaz por hash, sesión, shell administrativo y montaje/limpieza de páginas. |
| [read-cache.js](../public/frontend/read-cache.js) | Caché de lecturas en memoria con TTL, deduplicación y protección contra respuestas tardías. |

## public/frontend/components

| Archivo | Responsabilidad |
|---|---|
| [activity-read-state.js](../public/frontend/components/activity-read-state.js) | Estado local de notificaciones leídas por usuario y contenido. |
| [admin-layout.js](../public/frontend/components/admin-layout.js) | Menú lateral: apertura móvil, contracción en escritorio, foco y preferencias. |
| [admin-shell.js](../public/frontend/components/admin-shell.js) | Marcado y navegación del menú administrativo y sus submenús. |
| [brand.js](../public/frontend/components/brand.js) | Marcado compartido del logo. |
| [carousel-indicators.js](../public/frontend/components/carousel-indicators.js) | Indicadores y control temporal reutilizable del carrusel. |
| [category-picker.js](../public/frontend/components/category-picker.js) | Selector de categorías y creación según el contexto autorizado. |
| [common.js](../public/frontend/components/common.js) | Reexporta UI común y proporciona encabezados, campos, estados y formatos. |
| [content-views.js](../public/frontend/components/content-views.js) | Disparos de conteo de aperturas desde la interfaz. |
| [course-cards.js](../public/frontend/components/course-cards.js) | Tarjetas de capacitación reutilizadas por los catálogos. |
| [course-cover.js](../public/frontend/components/course-cover.js) | Composición/selección visual de portada de capacitación. |
| [course-progress.js](../public/frontend/components/course-progress.js) | Presentación de pasos de preparación de la capacitación. |
| [evaluation-dialog.js](../public/frontend/components/evaluation-dialog.js) | Diálogo completo de identificación, respuestas, revisión y envío. |
| [evaluation-state.js](../public/frontend/components/evaluation-state.js) | Estado de respuestas, navegación y tiempo del intento en el cliente. |
| [event-gallery.js](../public/frontend/components/event-gallery.js) | Visor de publicaciones e imágenes de eventos. |
| [event-photo-picker.js](../public/frontend/components/event-photo-picker.js) | Selección, orden y edición de imágenes para eventos. |
| [events.js](../public/frontend/components/events.js) | Marcado de tarjetas/publicaciones de eventos. |
| [form-validation.js](../public/frontend/components/form-validation.js) | Conecta errores de API con campos y resumen del formulario. |
| [gallery-icons.js](../public/frontend/components/gallery-icons.js) | Iconos compartidos de navegación/cierre de galerías. |
| [home-carousel.js](../public/frontend/components/home-carousel.js) | Carrusel del portal, imágenes y conexión de indicadores. |
| [public-link.js](../public/frontend/components/public-link.js) | Comprueba enlaces públicos antes de renderizar sliders y popups. |
| [home-popup.js](../public/frontend/components/home-popup.js) | Popup público y vista previa usando la misma composición. |
| [list-controls.js](../public/frontend/components/list-controls.js) | Paginación local, búsqueda sin tildes y filtrado de tablas administrativas. |
| [material-viewer.js](../public/frontend/components/material-viewer.js) | Visor de materiales, vista previa y descargas autorizadas. |
| [notification-center.js](../public/frontend/components/notification-center.js) | Campana, sondeo, revisiones y navegación a elementos de actividad. |
| [public-header.js](../public/frontend/components/public-header.js) | Cabecera pública y búsqueda de publicaciones. |
| [ui.js](../public/frontend/components/ui.js) | Iconos, modales, confirmaciones, toast, carga y elementos UI accesibles. |

## public/frontend/design

| Archivo | Responsabilidad |
|---|---|
| [carousel.css](../public/frontend/design/carousel.css) | Presentación de carrusel e indicadores. |
| [components.css](../public/frontend/design/components.css) | Botones, campos, tablas, diálogos, alertas y componentes compartidos. |
| [foundation.css](../public/frontend/design/foundation.css) | Fundación visual y reglas base del sistema de diseño. |
| [home-popup.css](../public/frontend/design/home-popup.css) | Presentación del popup público y sus variantes. |
| [navigation.css](../public/frontend/design/navigation.css) | Cabecera, sidebar y campana; reglas de navegación adaptable. |
| [public-shell.css](../public/frontend/design/public-shell.css) | Cabecera/pie públicos y elementos propios del portal. |
| [runtime.js](../public/frontend/design/runtime.js) | Salida generada para constantes de diseño usadas desde JavaScript. |
| [tokens.json](../public/frontend/design/tokens.json) | Fuente de colores, tamaños, tipografía, movimiento y breakpoints. |

## public/frontend/design/layouts

| Archivo | Responsabilidad |
|---|---|
| [base.css](../public/frontend/design/layouts/base.css) | Composiciones base heredadas y organización general de pantallas. |
| [learning.css](../public/frontend/design/layouts/learning.css) | Composiciones de portal, capacitación, catálogo y administración. |

## public/frontend/design/pages

| Archivo | Responsabilidad |
|---|---|
| [admin-dashboard.css](../public/frontend/design/pages/admin-dashboard.css) | Distribución del Inicio, gráficos horizontales, rangos y rankings compactos. |

## public/frontend/pages

| Archivo | Responsabilidad |
|---|---|
| [admin-access.js](../public/frontend/pages/admin-access.js) | Pantallas de usuarios/sedes y exportación de la pantalla de colaboradores. |
| [admin-courses.js](../public/frontend/pages/admin-courses.js) | Listado administrativo y editor por pasos de capacitaciones/materiales. |
| [admin-events.js](../public/frontend/pages/admin-events.js) | Listado y formulario administrativo de eventos/galerías. |
| [admin-exam.js](../public/frontend/pages/admin-exam.js) | Editor y programación del examen. |
| [admin-home-popup.js](../public/frontend/pages/admin-home-popup.js) | Gestión y previsualización de la colección de popups. |
| [admin-home.js](../public/frontend/pages/admin-home.js) | Dashboard de gráficos, detalle, Top 3/5/10, filtros y paginación. |
| [admin-personnel.js](../public/frontend/pages/admin-personnel.js) | Búsqueda/CRUD de trabajadores y carga masiva con vista previa/confirmaciones. |
| [admin-reports.js](../public/frontend/pages/admin-reports.js) | Selección de examen, resultados, estados y exportación. |
| [admin-slider.js](../public/frontend/pages/admin-slider.js) | Gestión del carrusel: imágenes, orden, visibilidad y encuadre. |
| [auth.js](../public/frontend/pages/auth.js) | Login y configuración inicial cuando el servidor la permite. |
| [catalog.js](../public/frontend/pages/catalog.js) | Catálogos públicos, filtros y navegación de publicaciones. |
| [course.js](../public/frontend/pages/course.js) | Detalle de capacitación, materiales e integración del flujo de evaluación. |
| [portal.js](../public/frontend/pages/portal.js) | Composición del Inicio público con medios y accesos al catálogo. |

## storage

| Archivo | Responsabilidad |
|---|---|
| [.htaccess](../storage/.htaccess) | Defensa adicional que deniega acceso web a configuración/archivos privados. |

## tests

| Archivo | Responsabilidad |
|---|---|
| [activity-ui.mjs](../tests/activity-ui.mjs) | Navegación, actividad, selección de resultados y estados del panel. |
| [admin-exam.mjs](../tests/admin-exam.mjs) | Configuración y estados UI del examen. |
| [admin-slider.mjs](../tests/admin-slider.mjs) | CRUD/UI administrativa del carrusel. |
| [apache-access.py](../tests/apache-access.py) | Comprobación de rutas privadas y entradas de Apache local activo; solo lectura. |
| [architecture.mjs](../tests/architecture.mjs) | Alcance/imports JS, estilos y reglas arquitectónicas del frontend. |
| [backend-regression.php](../tests/backend-regression.php) | Regresiones de sedes, archivos, reportes, errores e integración; usar aislador. |
| [cache.php](../tests/cache.php) | Comportamiento de la caché PHP. |
| [catalog.mjs](../tests/catalog.mjs) | Filtros, tarjetas y transiciones de catálogo. |
| [check_source.py](../tests/check_source.py) | Sintaxis PHP/JS, imports, fuentes y enlaces documentales. |
| [concurrency.php](../tests/concurrency.php) | Operaciones concurrentes y bloqueos en base aislada. |
| [content-views.mjs](../tests/content-views.mjs) | Conteo de aperturas desde componentes públicos. |
| [course-editor.mjs](../tests/course-editor.mjs) | Flujo de edición/materiales y manejo de cambios pendientes. |
| [dashboard-browser.mjs](../tests/dashboard-browser.mjs) | Servidor sintético para validación manual de píxeles/CSP; no consulta MySQL. |
| [dashboard.mjs](../tests/dashboard.mjs) | Geometría/DOM, paginación, selección y rankings del Inicio. |
| [design-system.mjs](../tests/design-system.mjs) | Tokens, selectores, contraste y comportamiento de componentes UI. |
| [entrypoint-apache.py](../tests/entrypoint-apache.py) | Arranque y protección de raíz local/public con Apache temporal en loopback. |
| [evaluation-dialog.mjs](../tests/evaluation-dialog.mjs) | Flujo del diálogo de evaluación y recuperación de errores. |
| [exam-policy.php](../tests/exam-policy.php) | Reglas de intentos, umbral del 90 %, versiones, aprobación, reportes y compatibilidad histórica en base aislada. |
| [evaluation-state.mjs](../tests/evaluation-state.mjs) | Estado de respuestas, reloj y navegación del intento. |
| [home-popup.mjs](../tests/home-popup.mjs) | Popup público/administrativo, estado y presentación compartida. |
| [http-contract.py](../tests/http-contract.py) | Contrato HTTP de rutas, autorización y operaciones contra entorno de prueba. |
| [http-isolated.php](../tests/http-isolated.php) | Inicia servidor HTTP con base/configuración sintéticas y ejecuta pruebas. |
| [http-router.php](../tests/http-router.php) | Router exclusivo del servidor PHP de pruebas, protegido por entorno aislado. |
| [http_smoke.py](../tests/http_smoke.py) | Pruebas rápidas HTTP; revisar destino/configuración antes de ejecutar. |
| [isolated.php](../tests/isolated.php) | Crea esquema temporal sin copiar filas reales; ejecuta suites y limpia el entorno. |
| [media-http.py](../tests/media-http.py) | Contratos de carga y administración de medios vía HTTP en pruebas. |
| [navigation-cache.mjs](../tests/navigation-cache.mjs) | TTL, deduplicación, invalidaciones y sesiones de la caché del cliente. |
| [package-lock.json](../tests/package-lock.json) | Versiones resueltas de dependencias de desarrollo. |
| [package.json](../tests/package.json) | Dependencias de desarrollo jsdom/PostCSS y scripts de pruebas. |
| [personnel-import.php](../tests/personnel-import.php) | CRUD/carga de padrón y coherencia de sedes/accesos en entorno aislado. |
| [personnel.mjs](../tests/personnel.mjs) | DOM de búsqueda, ficha y carga masiva con confirmaciones. |
| [public-header.mjs](../tests/public-header.mjs) | Cabecera pública y comportamiento de búsqueda/navegación. |
| [frontend-ux.mjs](../tests/frontend-ux.mjs) | Validación, contraseñas, ingreso duplicado, botones externos y visor accesible con errores recuperables. |
| [list-controls.mjs](../tests/list-controls.mjs) | Últimas páginas, filtros, trabajadores posteriores al registro 100, eventos seleccionados y exportación sin recortes. |
| [report-navigation.mjs](../tests/report-navigation.mjs) | Navegación y respuestas tardías al cambiar de reportes. |
| [report_xlsx.py](../tests/report_xlsx.py) | Valida estructura/contenido de Excel sintético con openpyxl. |
| [requirements.txt](../tests/requirements.txt) | Dependencia Python de validación XLSX. |
| [run.php](../tests/run.php) | Suite principal PHP de reglas/negocio; ejecutar mediante isolated.php. |
| [session-routing.mjs](../tests/session-routing.mjs) | Entrada/salida de sesión y rutas apropiadas por identidad. |
| [slider-files.php](../tests/slider-files.php) | Descubrimiento y orden de imágenes del slider. |
| [slider.mjs](../tests/slider.mjs) | Carrusel/indicadores, movimiento reducido y temporizadores. |
| [training-enhancements.mjs](../tests/training-enhancements.mjs) | Mejoras y flujos de capacitación en interfaz. |
| [xlsx_fixture.php](../tests/xlsx_fixture.php) | Construye datos/libro sintéticos para pruebas de exportación. |

## tools

| Archivo | Responsabilidad |
|---|---|
| [audit-backend.py](../tools/audit-backend.py) | Herramienta de inventario y análisis de código/backend para auditoría. |
| [build-design.mjs](../tools/build-design.mjs) | Compila fuentes/tokens a CSS público y runtime JS; soporta --check. |
| [check-local.ps1](../tools/check-local.ps1) | Suite integrada local; usa bases temporales para pruebas de negocio. |
| [configure-database-user.php](../tools/configure-database-user.php) | Procedimiento local de privilegios mínimos; modifica cuenta/configuración solo con --apply. |
| [start-preview-worker.ps1](../tools/start-preview-worker.ps1) | Lanza PHP/worker oculto con rutas de XAMPP; específico de Windows. |
| [update-php-runtime.ps1](../tools/update-php-runtime.ps1) | Mantenimiento del PHP local; no es un paso de publicación del sitio. |

## tools/apache

| Archivo | Responsabilidad |
|---|---|
| [public-directory.conf.example](../tools/apache/public-directory.conf.example) | Plantilla Apache para servir public como raíz y excluir directorios privados. |

## Directorios y documentos que no deben confundirse con código activo

| Ubicación | Tratamiento |
|---|---|
| `public/assets/image`, fuentes e imágenes públicas | Recursos de identidad/interfaz; conservar los referenciados por el shell y módulos |
| `public/assets/slider` | Imágenes heredadas que pueden seguir referenciadas por home_slides; no borrar por asumir que toda imagen está en storage |
| `storage/config.php` y configuraciones privadas externas | Secretos de la instalación; no se copian ni se enlazan a su contenido desde el manual |
| `storage/files` | Materiales/imágenes originales vinculados a files; respaldar junto con SQL |
| `storage/previews` | Derivados, lock y perfil/log del conversor; específico de cada instancia |
| `storage/cache` | Regenerable; no compartir entre bases/sedes |
| `storage/backups` | Recuperación e instalaciones retiradas; nunca usar como raíz pública |
| `tools/runtime` | LibreOffice/Poppler de Windows locales; sustituir por binarios del hosting |
| `tests/node_modules` | Dependencias de desarrollo; no forman parte del servidor de producción |
| `archive` | Historial de proyectos/sincronizadores retirados; no ejecutar ni publicar |
| `docs/DATA GENERAL OPERATIVO Y ADM.xlsx` | Fuente administrativa con datos; no es un recurso público ni se carga en cada petición |
| `docs/auditoria-backend` | Evidencia de una revisión con fecha; no sustituye el código/configuración actuales |
| `docs/multisede/propuesta-esquema.sql` | Borrador de diseño, no migración aplicada ni lista para ejecutar |

## Documentación relacionada

- [Manual técnico vigente](DOCUMENTACION-TECNICA.md): configuración, datos, arquitectura y operación.
- [Hosting y subdominios](DESPLIEGUE-Y-SUBDOMINIOS.md): procedimientos, ejemplos y alcance pendiente.
- [Arranque y Apache](ARRANQUE-Y-HOSTING.md): evidencia de los dos perfiles de entrada.
- [API](API.md), [diseño](DISENO.md), [materiales](MATERIALES.md), [actividad](ACTIVIDAD.md), [procesos](PROCESOS.md).
- [Auditoría de backend](AUDITORIA-BACKEND-2026-10-27.md) y [correcciones](CORRECCIONES-ALTAS-2026-10-28.md): evidencia histórica.
- [Plan multisede](PLAN-MULTISEDE-2026-10-28.md) y [plan JWT](PLAN-JWT.md): propuestas; no describen funciones enteramente implementadas.

Al agregar, retirar o cambiar la responsabilidad de un archivo, actualizar este mapa y el apartado correspondiente del manual. Los cambios de API deben reflejarse también en sus contratos y pruebas.

## Materiales de video · 30 de octubre de 2026

[Videos](VIDEOS.md) detalla las responsabilidades de `VideoMaterialsMigration`, `VideoInspector`, `MaterialUploadPolicy`, `ByteRange`, el selector `material-upload.js` y las pruebas `video-materials.mjs`, `video-policy.php` y `video-http.py`. El instalador `tools/install-video-runtime.py` guarda dependencias verificadas fuera de Git.
