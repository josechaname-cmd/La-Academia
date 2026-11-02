# Validaciones y autenticación

Revisión del 2 de noviembre de 2026. Describe el código implementado y las pruebas locales; todavía no verifica un hosting real.

## Qué autentica al usuario

El panel **usa sesiones PHP, no JWT**. El navegador recibe la cookie `LAACADEMIA`; la identidad se conserva en el servidor. `GET /api/v1/session` devuelve el usuario autorizado y un token CSRF. El CSRF no es un JWT ni sustituye la autenticación.

- Cookie `HttpOnly`, `SameSite=Strict`, sin dominio compartido y con duración de sesión del navegador. En `environment=production` siempre lleva `Secure`; en local lo lleva cuando PHP reconoce HTTPS.
- PHP acepta el identificador únicamente por cookie y usa modo estricto. El identificador y el CSRF cambian al ingresar, salir y caducar.
- Caducidad de 3600 segundos de inactividad y 43200 segundos desde el ingreso, configurables con `session_idle_seconds` y `session_absolute_seconds`. Consultar notificaciones en segundo plano no cuenta como actividad.
- El servidor consulta rol, sede, estado y `auth_version`. Cambiar contraseña, desactivar o cambiar rol, sede o trabajador vinculado revoca las sesiones anteriores. La autorización por sede también se comprueba en la API.
- El login admite cinco intentos por IP en quince minutos. Un bloqueo SQL serializa la reserva de intentos para evitar que solicitudes simultáneas excedan el límite. La exención de desarrollo y `/setup` solo funcionan por loopback en entorno `local` o `test`; nunca en `production`.
- Cada modificación exige `X-CSRF-Token`, incluso login y evaluación pública. No se guardan tokens de autenticación en `localStorage`.

Estas decisiones siguen los controles de [sesiones de PHP](https://www.php.net/manual/en/session.security.ini.php) y [caducidad de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). Para este portal y su API en el mismo origen, se mantiene la autenticación existente; [PLAN-JWT.md](PLAN-JWT.md) sigue siendo una propuesta sin implementar.

El trabajador se identifica por DNI antes del examen; ese flujo no equivale a una cuenta con contraseña. Las visitas a capacitaciones se cuentan al entrar, una por sesión, sin exigir examen ni reproducción del video.

## Formularios revisados

La interfaz usa [form-validation.js](../public/frontend/components/form-validation.js) para errores por campo, foco, accesibilidad, longitudes, formatos, enteros y archivos. El backend vuelve a comprobar los datos mediante [Validation.php](../backend/src/Support/Validation.php) y las reglas de cada servicio. Ocultar controles o desactivar JavaScript no evita estas comprobaciones.

| Formulario | Validación del servidor y reglas adicionales |
|---|---|
| Ingreso y configuración inicial | Correo válido, contraseña sin NUL y hasta 72 bytes; al crear, mínimo 12 caracteres; restricciones de configuración inicial y límite de acceso |
| Accesos | Correo, rol, estado, sede, trabajador existente; vínculo activo para capacitadores; protección de la propia cuenta y del último superadministrador |
| Sedes y categorías | Longitud, estado, nombre normalizado y unicidad; una sede con colaboradores/accesos activos no se desactiva |
| Trabajador individual | DNI de ocho dígitos, nombre, cargo, sede y estado; revisión de cambios concurrentes antes de editar o desactivar |
| Importación de trabajadores | CSV/XLSX hasta 8 MB, filas y DNI repetidos, sedes explícitas, vista previa y comprobación de que el archivo/datos no cambiaron al confirmar |
| Capacitación, portada y materiales | Título, categoría registrada, descripción, sede autorizada; modalidad fija tras publicar; imagen elegida y validación real del archivo; videos hasta el límite efectivo de 500 MB |
| Examen y participación | Fechas reales entre 1000 y 9999, cierre posterior, duración, intentos y nota mínima; preguntas/alternativas diferentes; respuesta correcta válida; DNI identificado, sede, horario y límite de intentos |
| Eventos | Título, descripción, ubicación, fecha, categoría, imágenes válidas y distintas, portada perteneciente a la galería; de 3 a 12 imágenes para publicar |
| Slider y popup | Imagen, textos, tamaños, colores, encuadre y enlaces permitidos; referencias publicadas; un único popup activo |
| Políticas | Título, descripción, estado, PDF y portada al crear; reemplazos opcionales al editar, con validación de contenido y tamaño |
| Búsquedas y filtros | Filtros locales; cuando hay consulta HTTP, parámetros simples, identificadores válidos, permisos y rechazo de claves repetidas |

Los textos rechazan tipos incorrectos, UTF-8 inválido y caracteres de control. Las contraseñas conservan espacios intencionales; su máximo se mide en bytes por el uso actual de bcrypt. Las cargas múltiples validan cada archivo, no solo el primero. Los errores de preguntas usan nombres como `questions.0.prompt` para señalar el campo preciso.

## Duplicados y métodos

- La base conserva las restricciones únicas de correo, DNI de trabajador, DNI vinculado a acceso, sede y categoría por ámbito. La API devuelve `409` y el campo afectado. Un mismo nombre de categoría puede existir en ámbitos distintos.
- Las versiones de examen sin cambios no se duplican. Las preguntas y alternativas repetidas se detectan ignorando mayúsculas y espacios repetidos. El envío de un intento ya completado devuelve el resultado existente.
- La interfaz bloquea dobles acciones y [api.js](../public/frontend/api.js) comparte solicitudes de escritura simultáneas con la misma sesión, acción, datos y archivo. Las consultas también comparten solicitudes pendientes. Una respuesta de escritura no se conserva como caché ni se reintenta automáticamente.
- **Alcance:** no se ha impuesto unicidad de títulos de cursos, eventos o políticas, porque pueden repetirse legítimamente. Tampoco se añadió una clave de idempotencia persistente para altas: si se pierde la respuesta después de guardar, se debe consultar el listado antes de repetir la creación. El bloqueo de interfaz no sustituye las restricciones de la base.
- Las [rutas](../backend/routes/api.php) fijan método y permiso. Métodos incorrectos reciben `405` con `Allow`. El identificador de la ruta prevalece sobre el cuerpo.
- JSON exige un objeto y un máximo de 1 MB leído de forma acotada. Cargas multipart solo mediante POST. Tipos de contenido no admitidos reciben `415`; consultas con claves repetidas o arrays reciben `400`; los indicadores `download` y `background` solo admiten `0` o `1`.

## Configuración para hosting

Usar [config.example.php](../storage/config.example.php), `environment=production`, HTTPS y `public/` como DocumentRoot. Cada subdominio independiente necesita su propia base, almacenamiento, caché y `session.save_path` privado. El modo de producción exige que el navegador acceda mediante HTTPS para enviar la cookie.

Preparar la primera cuenta antes de abrir el servicio: usar una instancia local controlada en entorno `local`, o inicializar temporalmente por loopback con el acceso externo bloqueado; volver a `production` antes de habilitarlo. `/setup` permanece deshabilitado en producción, aunque un proxy haga aparecer la IP como loopback. No hay un comando CLI para crear cuentas.

Si hay proxy, configurar la IP real en el servidor con una lista de proxies confiables. La aplicación no confía directamente en cabeceras `X-Forwarded-*`. Verificar HTTPS, cookie, límites por IP, permisos, archivos privados y sesión en el hosting real. El procedimiento completo está en [Hosting y subdominios](DESPLIEGUE-Y-SUBDOMINIOS.md).

## Evidencia reproducible

- [validation-security.php](../tests/validation-security.php): datos mal formados en todos los editores, duplicados, errores por campo, revocación, expiración, CSRF y cookies de producción.
- [concurrency.php](../tests/concurrency.php): procesos simultáneos para intentos de examen, popup, límite de login y correo único.
- [http-contract.py](../tests/http-contract.py): métodos de todas las rutas, consultas ambiguas, tipo/tamaño de cuerpo, sesiones, permisos y respuestas HTTP reales.
- [frontend-ux.mjs](../tests/frontend-ux.mjs) y [navigation-cache.mjs](../tests/navigation-cache.mjs): validación DOM, archivos múltiples, contraseñas, errores de examen, consultas y escrituras simultáneas.

Ejecutar `powershell -NoProfile -File tools/check-local.ps1`. Las suites de base se ejecutan a través de `tests/isolated.php`: crean esquemas y almacenamiento temporales con datos sintéticos, sin copiar registros reales. Las pruebas DOM no sustituyen una revisión visual en navegador ni una prueba del despliegue HTTPS.
