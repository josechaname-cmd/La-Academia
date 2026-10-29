# Arranque y raíz pública

Validación: 28 de octubre de 2026. Proyecto activo: `C:\xampp\htdocs\la-academia`.

## Archivo correcto

**La entrada del servidor es `public/index.php`.** Su estructura actual es adecuada: carga el bootstrap y la configuración privados y delega la petición al kernel. No contiene credenciales ni lógica de negocio. No hace falta crear otro `index.php` en la raíz ni sustituirlo por `index.html`.

```text
Apache
  → public/index.php
    → backend/bootstrap.php             Autocarga, zona horaria y errores
    → backend/config/application.php    Configuración privada
    → backend/src/Http/WebKernel.php
      ├─ Portal → backend/views/shell.php → public/frontend/app.js
      └─ /api/v1/... → Http/ApiKernel.php → rutas, permisos y servicios
```

`public/frontend/app.js` arranca la interfaz en el navegador después de recibir el HTML. `backend/bootstrap.php` es un archivo interno; no debe abrirse como URL. Para las funciones con datos también deben estar disponibles PHP y MySQL.

## Configuración local comprobada

Apache tiene `DocumentRoot "C:/xampp/htdocs"`, permite `.htaccess` y no tiene un VirtualHost específico para este proyecto en el puerto 80. La URL de trabajo es `http://localhost/la-academia/`.

El `.htaccess` de la raíz desactiva el índice automático y reescribe el portal y la API hacia `public/index.php`. También publica `public/assets` y `public/frontend` mediante URLs sin `/public`. Deniega el acceso directo a `/public/`, backend, configuración, archivos privados y respaldos. `Require local` limita esta instalación al equipo.

Esto explica por qué `http://localhost/la-academia/public/` no es la URL de inicio, aunque el archivo que se ejecuta esté dentro de esa carpeta. La configuración funciona para el entorno local y se conserva.

## Configuración recomendada para un dominio

La raíz web del dominio debe ser **la carpeta `public`**, manteniendo backend, storage, pruebas y respaldos fuera de esa raíz. Apache sirve normalmente el árbol situado bajo `DocumentRoot`; cada VirtualHost puede tener uno distinto. Véase la [documentación de DocumentRoot](https://httpd.apache.org/docs/2.4/urlmapping.html#documentroot).

Ejemplo de estructura, conservando las rutas relativas de la aplicación:

```text
/var/www/la-academia/
├── public/       ← DocumentRoot del dominio; contiene index.php
├── backend/      ← Fuera de la raíz web
└── storage/      ← Fuera de la raíz web
```

No basta con cambiar `DocumentRoot` y mantener las reglas heredadas actuales: el `.htaccess` de la raíz bloquea `/public`, hereda reglas a subdirectorios y usa rutas específicas de la instalación local. Además, `public/.htaccess` solo desactiva el listado de directorios; por sí solo no configura la API.

La [plantilla Apache comprobada](../tools/apache/public-directory.conf.example) resuelve ambos puntos. Dentro del VirtualHost administrado por el servidor o proveedor:

```apache
Define ACADEMIA_PROJECT "/var/www/la-academia"
Include "/var/www/la-academia/tools/apache/public-directory.conf.example"
```

La plantilla establece `DocumentRoot` en `public`, ignora los `.htaccess` locales con `AllowOverride None`, deniega el árbol privado y permite solo la entrada PHP, la API y recursos estáticos existentes. Las URLs del dominio quedan `/`, `/api/v1/...`, `/assets/...` y `/frontend/...`.

Cuando se dispone de acceso a la configuración del servidor, Apache recomienda ubicar las directivas allí en vez de depender de `.htaccess`. [Guía oficial](https://httpd.apache.org/docs/2.4/howto/htaccess.html#when).

El proveedor debe configurar el dominio, HTTPS y la ejecución de PHP. Con PHP-FPM, los límites de subida y memoria se establecen en la configuración de PHP o del panel; el bloque `php_value` de la plantilla solo se aplica a mod_php. La configuración privada de producción debe definir su conexión MySQL, `environment` como `production` y `local_unlimited_login` como `false`. Los ejecutables de conversión también deben corresponder al sistema del hosting.

Si el proveedor exige `public_html` y no permite cambiar la raíz del dominio, hay que revisar su estructura antes de mover archivos: varias rutas internas dependen de que `public`, `backend` y `storage` sean carpetas hermanas. No se ha realizado esa migración ni activado esta plantilla.

## Evidencia de validación

- `httpd.exe -t`: configuración instalada válida.
- `httpd.exe -S`: raíz actual y VirtualHosts inspeccionados.
- `php -l public/index.php`: sin errores de sintaxis.
- `python tests/entrypoint-apache.py`: ambas configuraciones comprobadas con Apache real en puertos temporales de `127.0.0.1`.
- En ambos perfiles: portal e índice responden 200, HEAD funciona, POST al portal responde 405, JS/CSS/logo cargan, una API inexistente responde 404 JSON, las URLs privadas y codificadas se rechazan y las rutas desconocidas no devuelven el portal.

Apache no estaba escuchando en el puerto 80 durante la revisión. Las pruebas iniciaron sus propias instancias, las cerraron y eliminaron sus temporales; no modificaron la configuración activa ni iniciaron servicios permanentes. No conectaron a MySQL ni validaron operaciones sobre datos. La prueba de `/api/v1/health` contra la instalación normal queda para cuando Apache y MySQL estén iniciados.

La plantilla solo se ha validado con el Apache/PHP de este XAMPP. El servidor de hosting debe verificarla con su versión, módulos y controlador PHP antes de activarla.
