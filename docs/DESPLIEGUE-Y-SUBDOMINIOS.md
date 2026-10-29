# La Academia · Hosting y subdominios por sede

**Fecha:** 29 de octubre de 2026. **Estado:** procedimiento y ejemplos; no ejecutados en un hosting.
Complementa el [manual técnico](DOCUMENTACION-TECNICA.md) y el [mapa de archivos](MAPA-ARCHIVOS.md).

Los dominios `brena.capacitaciones.example.com` y `norte.capacitaciones.example.com` son ilustrativos. Deben sustituirse por dominios propios, con proveedor, rutas, certificados y usuarios reales.

## 1. Decisión de arquitectura

Para publicar pronto con el código actual y separar datos de los portales, la opción disponible es **una instalación por sede, con la misma versión del código y recursos privados independientes**. Si se requiere un padrón único, traslados centralizados y consolidación inmediata, conviene desarrollar el modelo de aplicación compartida con contexto de sede antes de publicar varios portales sobre una misma base.

| Alternativa | Qué se comparte | Separación | Trabajo pendiente |
|---|---|---|---|
| A. Instancias independientes | Versión del código, diseño y procedimiento de actualización | Base/usuario SQL, archivos, previews, caché, sesiones y procesos por sede | Preparar instalaciones y verificar pertenencia si las lecturas deben ser nominales |
| B. Una aplicación con contexto por dominio | Código, servicios y eventualmente base central | El backend debe filtrar cada consulta/archivo/operación por sede | Desarrollo y migraciones; no basta DNS ni un filtro visual |
| C. Varios alias hacia la instalación actual | Código, base, archivos y contadores actuales | No hay separación funcional por dominio | No satisface la separación de métricas entre sedes |

La opción A tiene más despliegues y no ofrece traslados/consolidación automáticos entre bases. No se deben presentar esas funciones como existentes. La opción B mantiene una sola aplicación, pero necesita validación transversal de aislamiento. [Referencia de diseño para aplicaciones con varias organizaciones: OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html).

### Qué se separa realmente

Un subdominio y una base independiente separan **las aperturas registradas en ese portal**. El catálogo actual sigue siendo público: un trabajador de Norte podría abrir el dominio de Breña y esa visita se contaría allí.

Para cumplir «solo trabajadores de esa sede» hay que identificar y validar al visitante **antes de servir/contar el material**, no únicamente antes del examen. Ver la sección 8. Este punto aplica tanto a A como a B.

## 2. Qué pedir al proveedor

| Capacidad | Motivo |
|---|---|
| PHP mantenido y extensiones del manual | Ejecución de aplicación, PDO y lectura de documentos |
| MySQL compatible con la instalación 8.0.46 | Restauración, consultas, bloqueos, JSON y funciones de ventana |
| DocumentRoot configurable a `.../public` | Backend/configuración fuera del árbol publicado |
| HTTPS por cada nombre | Cookies seguras y tráfico protegido |
| Bases/usuarios separados | Aislamiento entre instalaciones |
| Directorio privado escribible y sesiones separadas | Originales, cachés, conversores y sesiones de cada sede |
| PHP CLI y tareas programadas | Migraciones controladas y worker de conversión |
| LibreOffice, Poppler y `proc_open` | PPT/PPTX, portadas y carga XLSX de personal |
| Acceso a logs, copias y restauración | Operación y diagnóstico |

Un VPS administrado o plataforma que admita esos procesos encaja con la funcionalidad completa. Un hosting compartido puede servir si confirma esas capacidades; un plan que bloquea ejecutables/CLI no conserva automáticamente todas las funciones. CSV no requiere LibreOffice, pero reemplazar XLSX por CSV no resuelve la conversión de PowerPoint.

PHP 8.2 es la rama probada localmente y se acerca al fin de soporte de seguridad. Ensayar una rama mantenida antes de elegirla como runtime definitivo. [Versiones soportadas de PHP](https://www.php.net/supported-versions.php).

Si solo permiten `public_html`, confirmar que el dominio pueda apuntar a `public_html/la-academia/public` con el resto fuera del alcance web. Si la raíz no puede cambiarse, se necesita adaptar rutas y reglas de forma específica: no copiar backend/storage dentro de la carpeta pública sin protección ni renombrar `public` suponiendo que todas las rutas se ajustarán solas.

## 3. Preparar una instalación

### 3.1 Paquete de código

Preparar una entrega identificada por fecha/versión con `public/`, `backend/` y las herramientas de operación que se requieran. Construir CSS antes de empaquetar. Puede conservarse el manual fuera de la raíz pública.

No distribuir el entorno completo de XAMPP, `archive/`, `storage/backups/`, `tests/node_modules/`, credenciales locales, sesiones o caché local como parte del paquete de producción. `tools/runtime` contiene binarios Windows: instalar los equivalentes para el sistema del hosting.

Copiar los originales necesarios de `storage/files` por separado cuando se migren datos existentes. No renombrar sus claves: la base los referencia. El slider heredado puede referenciar imágenes de `public/assets/slider`, que deben acompañar a esos registros.

### 3.2 Directorios por sede

```text
/srv/academia/
├── brena/
│   ├── public/                 DocumentRoot de Breña
│   ├── backend/
│   ├── tools/                  Solo herramientas necesarias
│   ├── private/
│   │   ├── application.php     Credenciales web de Breña
│   │   └── maintenance.php     Credenciales CLI de mantenimiento
│   └── storage/
│       ├── files/
│       ├── previews/
│       ├── cache/
│       ├── sessions/
│       └── logs/
└── norte/                     Misma estructura, recursos propios
```

El proceso web necesita lectura de código y lectura/escritura de sus directorios de datos, temporales y sesiones. No necesita escritura sobre todo el proyecto. Configurar propietarios/grupos según el hosting; no resolver permisos con `777`. El usuario del worker debe poder leer la misma configuración y escribir los derivados de su sede.

### 3.3 Configuración privada de ejemplo

Guardar fuera de `public`. Los valores `REEMPLAZAR_...` son marcadores, no credenciales utilizables:

```php
<?php
declare(strict_types=1);
return [
    'environment' => 'production',
    'db_host' => '127.0.0.1',
    'db_name' => 'academia_brena',
    'db_user' => 'academia_brena_app',
    'db_password' => 'REEMPLAZAR_EN_SERVIDOR',
    'storage' => '/srv/academia/brena/storage/files',
    'preview_directory' => '/srv/academia/brena/storage/previews',
    'cache_directory' => '/srv/academia/brena/storage/cache',
    'soffice' => '/usr/bin/libreoffice',
    'pdftoppm' => '/usr/bin/pdftoppm',
    'local_unlimited_login' => false,
    'session_idle_seconds' => 3600,
    'preview_worker_enabled' => false,
];
```

Las rutas de los binarios son ejemplos; comprobarlas en el servidor. Definir `ACADEMIA_CONFIG=/srv/academia/brena/private/application.php` para el proceso PHP de Breña y para su worker. Alternativamente, usar `storage/config.php` propio de cada copia manteniéndolo privado.

El archivo de mantenimiento puede cargar ese array y reemplazar únicamente usuario/contraseña por la cuenta con permisos de migración. **No conceder DDL a la cuenta web.** El mapa de DML requerido está en `backend/config/database-permissions.php`; el script `tools/configure-database-user.php` está especializado para el XAMPP local y no debe ejecutarse sin adaptar sus precondiciones a un hosting.

Con PHP-FPM, estas directivas son un fragmento que se integra en el pool de cada instancia, no un pool completo:

```ini
; Pool de Breña: rutas distintas de las del pool de Norte
env[ACADEMIA_CONFIG] = /srv/academia/brena/private/application.php
php_admin_value[session.save_path] = /srv/academia/brena/storage/sessions
php_admin_value[error_log] = /srv/academia/brena/storage/logs/php-error.log
php_admin_flag[display_errors] = off
php_admin_flag[log_errors] = on
php_admin_value[upload_max_filesize] = 50M
php_admin_value[post_max_size] = 56M
php_admin_value[memory_limit] = 256M
```

El administrador completa usuario/grupo, socket, capacidad del pool y conexión con Apache. FPM limpia variables de entorno por defecto; declararlas explícitamente evita que web y CLI lean configuraciones distintas. [Manual de FPM](https://www.php.net/manual/en/install.fpm.configuration.php).

## 4. Base de datos y primera cuenta

### Instalación nueva de otra sede

1. Crear una base vacía y sus usuarios en el proveedor, con nombres distintos de las otras sedes.
2. Configurar su archivo privado y comprobar que apunta a esa base.
3. Ejecutar las migraciones con la cuenta CLI de mantenimiento. Ejemplo para Bash en Linux:

   ```bash
   ACADEMIA_CONFIG=/srv/academia/brena/private/maintenance.php \
     /usr/bin/php /srv/academia/brena/backend/scripts/migrate.php
   ```

4. Inicializar la primera cuenta de superadmin desde el servidor por loopback o mediante una base inicial preparada y revisada. El endpoint `/setup` exige dirección de origen local y que no exista un administrador. No hay actualmente un comando CLI de creación de superadmin ni se debe abrir indiscriminadamente ese endpoint a Internet.
5. Si se usa el endpoint, obtener primero cookie y CSRF de `/api/v1/session` y enviarlos al POST `/api/v1/setup`. El operador puede acceder desde el propio servidor usando el nombre del VirtualHost y resolución a loopback, respetando su certificado. El payload contiene nombre, email y contraseña; mantenerlo fuera de logs/historial de comandos. Después verificar que `setup_required` sea false.
6. Crear la sede, importar solo su padrón validado, crear sus capacitadores y publicar su contenido. Una instalación nueva de Norte no debe recibir un clon con todos los trabajadores y resultados de Breña.
7. Habilitar acceso público después de comprobar cuenta inicial, rutas y separación. Si hay proxy, revisar cómo llega `REMOTE_ADDR`: no interpretar a todos los clientes como loopback.

`OrganizationMigration` incluye asignaciones de compatibilidad a Breña cuando existe y encuentra registros sin sede. Revisar ese comportamiento al importar historia; no usarlo como mecanismo para distribuir trabajadores entre instalaciones.

### Migrar una instalación existente

Preparar una copia coherente de SQL y originales, ensayarla y definir una ventana que evite escrituras durante la copia final de datos/archivos. No copiar los archivos físicos de MySQL desde XAMPP al hosting.

Ejemplo de exportación con cliente MySQL compatible y credenciales previamente configuradas en un login-path privado:

```bash
mysqldump --login-path=academia-origen --single-transaction \
  --no-tablespaces --set-gtid-purged=OFF \
  --result-file=/ruta/privada/academia.sql la_academia

mysql --login-path=academia-destino academia_brena < /ruta/privada/academia.sql
```

Son comandos de ejemplo para Bash; el segundo importa y escribe en el destino. `--result-file` evita depender de la codificación de una redirección de salida. Ajustar privilegios/opciones a la versión y al proveedor. La consistencia transaccional del dump no sustituye coordinar la copia de archivos ni permite DDL concurrente sin revisión. [Manual de mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html).

Comprobar migraciones pendientes en una copia antes de aplicarlas. Si el origen contiene varias sedes y el destino debe recibir una sola, hace falta una extracción coherente de todas las relaciones y medios. No basta exportar `employees WHERE site_id=...` ni borrar filas de otras sedes después de copiar la base completa a producción.

## 5. Dominio, Apache y HTTPS

### Una sede

1. Crear el registro DNS del nombre hacia la IP o destino indicado por el hosting.
2. Crear su VirtualHost/sitio y configurar PHP.
3. Establecer DocumentRoot en `/srv/academia/brena/public`.
4. Integrar las reglas de [public-directory.conf.example](../tools/apache/public-directory.conf.example). Desactivar la lectura del `.htaccess` local en la raíz del proyecto y en `public`, como hace la plantilla; sus reglas actuales no son las de hosting.
5. Configurar HTTPS para ese nombre y renovación del certificado.
6. Verificar `/`, `/api/v1/health`, `/frontend/app.js` y recursos con espacios en el nombre. Confirmar que backend/storage no se descargan.

En la plantilla, `Require all granted` corresponde únicamente al árbol público; el privado permanece denegado. PHP debe estar configurado: un servidor que descargue el contenido de `index.php` no está listo para publicar.

### Repetirlo para dos subdominios

Los nombres pueden compartir una IP. DNS lleva al servidor; el VirtualHost decide qué instalación atiende cada nombre. [Funcionamiento oficial de VirtualHosts por nombre](https://httpd.apache.org/docs/2.4/vhosts/name-based.html).

| Recurso | Breña | Norte |
|---|---|---|
| Nombre | `brena.capacitaciones.example.com` | `norte.capacitaciones.example.com` |
| DocumentRoot | `/srv/academia/brena/public` | `/srv/academia/norte/public` |
| Base | `academia_brena` | `academia_norte` |
| Usuario web SQL | `academia_brena_app` | `academia_norte_app` |
| Configuración | `brena/private/application.php` | `norte/private/application.php` |
| Archivos/previews/caché | Bajo `brena/storage` | Bajo `norte/storage` |
| Sesiones y pool PHP | Propios de Breña | Propios de Norte |
| Worker | Configuración de Breña | Configuración de Norte |

Para evitar confundir variables globales al configurar varios sitios, generar una copia de la plantilla de directorio por sede y reemplazar **todas** las referencias `${ACADEMIA_PROJECT}` por su ruta literal. Incluir cada copia en su VirtualHost. Este esquema ilustra la asociación; certificados, sockets y rutas deben existir en el servidor:

```apache
<VirtualHost *:443>
    ServerName brena.capacitaciones.example.com
    Include /etc/apache2/academia/brena-directory.conf
    # TLS y controlador/pool PHP de Breña configurados por el administrador.
</VirtualHost>

<VirtualHost *:443>
    ServerName norte.capacitaciones.example.com
    Include /etc/apache2/academia/norte-directory.conf
    # TLS y controlador/pool PHP de Norte configurados por el administrador.
</VirtualHost>
```

No añadir ambos nombres como alias de un solo sitio esperando separación. Configurar también una respuesta de rechazo para hosts desconocidos; Apache puede usar el primer VirtualHost cuando no encuentra coincidencia.

La plantilla rechaza rutas con punto, incluida `.well-known`. El proveedor debe servir el desafío ACME HTTP-01 fuera de esa regla o añadir una excepción limitada a su ubicación. DNS-01 evita esa ruta y es el mecanismo de Let's Encrypt que permite certificados wildcard; un wildcard no es necesario para dos nombres explícitos. [Tipos de desafío](https://letsencrypt.org/docs/challenge-types/).

### Sesiones y proxy

La aplicación omite el atributo Domain de la cookie, por lo que el navegador la limita al host que la emite. No configurar `.example.com` como Domain compartido para estas instalaciones. [Alcance de cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#domain).

Además de cookies separadas, usar almacenamiento de sesiones independiente en el servidor. Las cuentas usan IDs numéricos que pueden coincidir entre bases; no compartir archivos de sesión ni un mismo namespace Redis entre instancias. El nombre de cookie está fijado en `AuthTool`; no existe una clave de configuración para renombrarlo.

Si un proxy termina TLS, configurar de forma confiable la indicación HTTPS hacia PHP y la IP del cliente. La aplicación no incorpora una lista de proxies confiables ni interpreta libremente `X-Forwarded-*`. Verificar Secure y los límites por IP con la topología real.

## 6. Conversión en Linux

Instalar LibreOffice/Poppler y comprobar que sus ejecutables coincidan con la configuración. Ejecutar el worker con el usuario de la instancia, con acceso a archivos, temporales y perfil Office.

Ejemplo de entrada de crontab del usuario de Breña, cada minuto:

```cron
* * * * * ACADEMIA_CONFIG=/srv/academia/brena/private/application.php /usr/bin/php /srv/academia/brena/backend/scripts/preview-worker.php >> /srv/academia/brena/storage/logs/worker.log 2>&1
```

Crear otra entrada para Norte, con todas sus rutas propias. El worker bloquea por directorio de previews para no procesar la misma cola simultáneamente. Configurar rotación del log. Probar PDF, PPT, PPTX y XLSX reales de prueba; no basta que `/health` responda correctamente. Los ejemplos Linux y la conversión aún requieren prueba en el hosting elegido.

## 7. Validación antes de habilitar cada sede

| Prueba | Resultado esperado |
|---|---|
| Nombre/HTTPS/raíz | Certificado correcto; portal y assets de la instancia adecuada |
| Privados | Backend, storage, configuración, pruebas y respaldos no accesibles por HTTP |
| Base | Health correcto y tablas del destino; usuario web sin permisos de crear/eliminar esquema |
| Sesión | Login/logout, cookie Secure y aislamiento de sesiones entre nombres |
| Permisos | Capacitador limitado a sus cursos; superadmin con funciones esperadas |
| Personal | Crear/editar/baja, vista previa de carga y detección de conflictos con datos sintéticos |
| Archivos | Subida, portada, descarga y conversión sin publicar storage |
| Evaluación | DNI, sede, horarios, límite de intentos, envío y exportación |
| Métricas | Una apertura de prueba en A no altera la base/contador de B; administradores excluidos |
| URLs directas | Cambiar IDs o reutilizar enlaces de otra sede no concede acceso entre instalaciones |
| Recuperación | Dump y originales se restauran juntos en una copia aislada |

Para evaluar un sitio aún sin DNS definitivo, usar resolución local controlada hacia el servidor de preproducción, manteniendo el hostname del VirtualHost y la validación TLS. No ejecutar altas/bajas de prueba sobre trabajadores reales.

El proyecto incluye pruebas Windows de entrada Apache y pruebas aisladas de backend. Los ejemplos de despliegue Linux no sustituyen estas comprobaciones en el servidor elegido.

## 8. Si las vistas deben corresponder a trabajadores de la sede

Esto requiere desarrollo adicional. La separación de infraestructura es insuficiente para demostrar quién abrió el contenido público.

1. Definir el requisito: aperturas del portal, trabajadores identificados, confirmación de revisión o asistencia. Son mediciones diferentes.
2. Identificar al trabajador antes de abrir el material y verificar que esté activo y pertenezca a la sede de la instalación/portal.
3. Para una atribución comprobable, usar una credencial, OTP o SSO aprobado. Saber un DNI permite consultarlo; no demuestra que quien lo escribió sea su titular.
4. Autorizar también archivos, previews y endpoints de vistas; ocultar contenido en el frontend no bloquea una URL directa.
5. Guardar el evento con sede, contenido/versionado, trabajador o identificador autorizado, fecha y regla de deduplicación. No atribuir retroactivamente las visitas anónimas al último DNI de un navegador compartido.
6. Mostrar por separado lecturas identificadas, aperturas anónimas heredadas y evaluaciones. Acordar retención y acceso al registro.

Archivos a intervenir: `ContentViews.php`, `ParticipantAccess.php` y validación de padrón, `ContentAgent.php`, `FileTool.php`, `CourseAccess.php`, rutas API y componentes `content-views.js`, `course.js`/visor. La identificación para lectura debe funcionar también en capacitaciones sin examen; no reutilizar sin adaptación una autorización que exige un examen.

Para la opción B, añadir además resolución segura de host antes del despacho, dominio registrado y sede activa, filtros en catálogo público/detalles/eventos/medios, contexto en cachés y reportes, y pruebas negativas con dos sedes. `ApiKernel`, `AgentRegistry`, repositorios y política de acceso deben recibir ese contexto. Un `site_id` enviado por el navegador nunca lo sustituye.

El [plan multisede histórico](PLAN-MULTISEDE-2026-10-28.md) contiene ideas de esquema, no una migración lista para producción. Hay que actualizarlo contra el CRUD actual antes de implementar. No distribuir los contadores anónimos históricos entre sedes por suposición.

## 9. Actualizar y recuperar varias instalaciones

Mantener una sola fuente de código y generar la misma entrega para todas las sedes. Probar primero en preproducción y una sede piloto; después desplegar el mismo artefacto, preservando la configuración y los datos de cada instancia. Registrar versión, fecha y migraciones aplicadas por sede.

Respaldar cada base con sus propios originales y configuración. Una restauración de Breña no debe sobrescribir Norte. Mantener los respaldos fuera de la raíz pública, comprobar recuperación y definir cuánto dato se acepta perder y cuánto puede tardar el restablecimiento.

Si hay migraciones, ensayar tanto el avance como la recuperación. No prometer reversión solo cambiando archivos PHP si ya se modificó el esquema. En instalaciones separadas, trasladar personas o consolidar notas requiere un proceso explícito de integración; no compartir bases o carpetas improvisadamente para resolverlo.

## 10. Datos pendientes para ejecutar el despliegue

Antes de aplicar estos pasos se necesita: dominio administrable, listado de sedes, proveedor/plan, sistema operativo, versión y modalidad de PHP, motor de base, acceso a CLI/conversores, capacidad de cambiar DocumentRoot y definición de qué constituye una vista válida. Esta documentación no crea subdominios, cuentas, bases de producción ni servicios programados.
