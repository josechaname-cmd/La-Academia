# Correcciones de gravedad alta y permisos — 28 de octubre de 2026

Esta revisión actualiza el estado de B01–B04 de la auditoría inicial. El criterio funcional confirmado es: superadmin administra toda la aplicación; capacitador administra capacitaciones y eventos, con dashboard enfocado en su sede; el trabajador se identifica por DNI antes de recibir el examen, sin crear una cuenta ni añadir contraseña.

| Hallazgo | Estado actual | Evidencia |
|---|---|---|
| B01: control de acceso por recurso | Corregido y verificado | Se conservan controles por sede para capacitaciones, archivos, exámenes, resultados y campana. Rutas de usuarios, colaboradores, sedes, slider y popup siguen reservadas a superadmin. La interfaz no sustituye los permisos del servidor. |
| B02: errores internos expuestos | Corregido y verificado | ErrorHandler devuelve mensajes seguros; previews también sanea mensajes históricos. Las regresiones comprueban exclusión de mensajes SQL, contraseñas y tokens del diagnóstico público/log. |
| B03: PHP antiguo y conexión root | Corregido en la instalación activa | Apache y CLI usan PHP 8.2.35, compilación oficial Windows 8.2.35-1. La aplicación usa `la_academia_app@127.0.0.1`, con DML específico por tabla y sin administración del servidor/esquema. |
| B04: identificación previa | Implementado conforme al requisito confirmado | Consultar DNI y confirmar datos es obligatorio en el servidor. La identificación queda vinculada a navegador, curso y DNI durante 15 minutos. No se entregan preguntas si se omite ese paso. |

## Permisos funcionales

| Función | Superadmin | Capacitador |
|---|---|---|
| Capacitaciones, archivos, publicación y exámenes | Todas las sedes | Sede asignada |
| Resultados y exportación | Todas las sedes | Exámenes de su sede |
| Eventos, imágenes y categorías necesarias para crear contenido | Permitido | Permitido |
| Dashboard | Visión general, incluidas métricas de eventos | Capacitaciones, borradores, vistas y evaluaciones de su sede |
| Usuarios, colaboradores, sedes | Permitido | Denegado en API y navegación |
| Slider y popup de Inicio | Permitido | Denegado en API y navegación |

El dashboard del capacitador no consulta el listado global de eventos para calcular estadísticas. Mantiene acceso a Eventos para crearlos/gestionarlos. Los eventos continúan siendo una función compartida del portal: el esquema actual no les asigna sede ni propietario y no se añadió una relación nueva sin revisión. Resultados permanece como parte del seguimiento de capacitaciones.

## Identificación antes del examen

1. El trabajador introduce DNI y consulta sus datos del padrón.
2. El servidor comprueba colaborador activo, sede asignada coincidente, curso publicado y examen abierto. Devuelve nombre/cargo/sede, sin preguntas ni claves.
3. La sesión guarda solo un hash del DNI, curso y vencimiento; no se guarda DNI/token en localStorage ni en logs.
4. Al confirmar, el servidor exige esa identificación en la misma sesión y revalida padrón, sede, disponibilidad y límite de intentos antes de entregar preguntas.
5. Otra sesión, otro curso, otro DNI o una identificación vencida reciben 403 `identification_required`. La interfaz permite volver a consultar el DNI sin quedar bloqueada.

Se conservan los dos intentos, plazo e idempotencia de envío. No se incorpora contraseña, invitación ni cuenta de trabajador: el DNI identifica al registro según la decisión funcional, sin afirmar que pruebe documentalmente la identidad de quien lo escribe. La consulta tiene límite de 30 solicitudes por IP/minuto, también en loopback; usa un espacio de claves distinto del login y un bloqueo MySQL breve para coordinar concurrencia. Un fallo o exceso de consultas no entrega preguntas. No se añadieron tablas para estos controles.

Código: `Services/ParticipantAccess`, integración en `ExamAgent`/`AgentRegistry`, revalidación de sede en `AttemptTool`, recuperación de identificación vencida en `evaluation-dialog.js` y dashboard por rol en `admin-home.js`.

## PHP y cuenta técnica MySQL

Se descargó el paquete Thread Safe x64 VS16 para mantener compatibilidad con Apache/XAMPP y la rama instalada. Fuente oficial: [publicaciones Windows de PHP](https://downloads.php.net/~windows/releases/releases.json), [historial de correcciones](https://www.php.net/ChangeLog-8.php#8.2.35).

- Paquete: `php-8.2.35-1-Win32-vs16-x64.zip`.
- SHA-256 verificado: `811d13185e401ef6ec286b21a58dc004ab6d4e04494923d88add19551faa1117`.
- Instalación activa: `C:\xampp\php`; ambos procesos Apache cargan `php8ts.dll` versión 8.2.35.
- Respaldo del runtime anterior: `C:\xampp\php-backup-20261028-8.2.12`.
- Se conservaron configuración PHP, extensiones utilizadas y datos auxiliares de XAMPP. El portal y health respondieron después de reiniciar Apache.

La matriz SQL está en `backend/config/database-permissions.php`. La cuenta web tiene SELECT y únicamente los INSERT/UPDATE/DELETE usados por cada tabla; no tiene GRANT OPTION, DDL, acceso a cuentas MySQL ni privilegios globales de administración. Se verificó que leer `mysql.user` devuelve permiso denegado. Las contraseñas no aparecen en código versionable, documentación ni salida de comandos.

La configuración original de mantenimiento se preservó fuera del document root, en `%LOCALAPPDATA%\LaAcademia\private\maintenance.php`, con ACL NTFS limitada al usuario actual y SYSTEM. `backend/config/maintenance.php` solo se carga por CLI, para migraciones explícitas y creación de bases de pruebas. La aplicación web carga exclusivamente su configuración de runtime. Esta separación reduce privilegios SQL de las solicitudes; no pretende aislar un compromiso completo de la cuenta Windows que ejecuta ambos procesos.

Los tests HTTP ahora crean además una cuenta SQL temporal con **la misma matriz limitada**, mientras la preparación/limpieza de fixtures utiliza la configuración CLI. Así, el éxito de los endpoints ya no depende de usar root en el servidor de pruebas. No se ejecutó migrate.php sobre la base real.

PHP 8.2 recibe soporte de seguridad hasta el 31 de diciembre de 2026 según [PHP](https://www.php.net/supported-versions.php). Este cambio aplica el parche actual; la migración de rama puede planificarse con tiempo y pruebas de compatibilidad.

## Validación y datos

Salida completa (evidencia local excluida de Git): 355 verificaciones PHP, 60 regresiones, 45 comprobaciones concurrentes, 117 contratos HTTP y 21 pruebas de medios; importación sintética CSV/XLSX, exportación de 1200 filas, suites DOM/diseño/caché y protecciones Apache. Las pruebas del dashboard comprueban que un capacitador no consulta estadísticas de eventos globales. Las pruebas de identificación cubren ausencia/vencimiento/cambio de curso o DNI, distinta sesión, padrón inactivo, falta de sede, sede ajena, límite de consultas y preguntas sin clave.

Metadatos posteriores (evidencia local excluida de Git): mismas 19 tablas, 142 columnas, 53 índices y 18 FKs que antes. Evidencia de privilegios (evidencia local excluida de Git): usuario técnico y permisos sin secretos. No se modificaron colaboradores, cursos, notas, cuentas administrativas ni relaciones reales. Se creó una cuenta técnica MySQL y se cambió la configuración de conexión.

La inconsistencia histórica de una cuenta capacitadora con el padrón/sede, clasificada anteriormente como B09, permanece documentada; no se asignaron datos personales por inferencia. No bloquea el cierre de B04 bajo el requisito de identificación del trabajador, que ahora exige padrón y sede válidos.

## Revisión y reversión

Copia de código previa a esta revisión: `storage/backups/high-findings-20261028`. Diff de esta revisión (evidencia local excluida de Git). La copia excluye configuración privada y documentos de personas.

Para revertir código, restaurar únicamente los archivos modificados desde esa copia después de conservar cambios posteriores. No restaurar el esquema: no cambió. Para revertir la conexión, en una ventana de mantenimiento restaurar `storage/config.php` desde la configuración privada CLI; luego retirar la cuenta técnica solo cuando ninguna solicitud/worker la utilice. No imprimir contraseñas durante el procedimiento.

La reversión del runtime requiere detener únicamente los procesos Apache de esta instalación, verificar que no queden DLL cargadas, conservar el directorio PHP nuevo y restaurar el directorio del respaldo a `C:\xampp\php`; validar `httpd -t` y health al iniciar. Volver a PHP 8.2.12 reintroduce B03 y solo sirve como recuperación temporal. `tools/update-php-runtime.ps1` contiene el procedimiento aplicado y recuperación automática si falla la activación; no se debe volver a ejecutar sobre una actualización ya completada.

Reproducir verificación: `powershell -File tools/check-local.ps1`. El runner mantiene bases/almacenamiento/sesiones de prueba independientes y elimina únicamente sus recursos temporales verificados.
