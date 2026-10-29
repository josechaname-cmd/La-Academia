# Código fuente en GitHub

Repositorio: <https://github.com/josechaname-cmd/La-Academia>.

## Qué incluye

Backend PHP, frontend, estilos generados y sus fuentes, esquema SQL sin datos,
pruebas con datos sintéticos, herramientas, documentación y archivos de marca.

No incluye la base local, padrón de personal, resultados, credenciales, sesiones,
archivos subidos, banners operativos, capturas, auditorías locales, respaldos,
dependencias instaladas ni ejecutables de conversión. Publicar el código no
publica una copia de la instalación ni despliega automáticamente el sitio.

## Preparar otra instalación

1. Clonar el repositorio y disponer de PHP 8.2+, MySQL 8 y un servidor web.
2. Copiar `storage/config.example.php` a `storage/config.php` y completar los
   valores en el servidor, incluido `support_email` con el contacto autorizado.
   No usar el ejemplo como una credencial real.
3. Crear una base vacía. Para las migraciones, configurar una cuenta de
   mantenimiento con permisos DDL mediante `ACADEMIA_MAINTENANCE_CONFIG`, en un
   archivo privado fuera de la raíz web. La cuenta de la aplicación debe tener
   los permisos limitados indicados en `backend/config/database-permissions.php`.
4. Ejecutar `php backend/scripts/migrate.php`. Esto crea la estructura; no importa
   trabajadores, notas ni archivos de otra instalación.
5. Dar permisos de escritura a los directorios privados necesarios e instalar
   LibreOffice y Poppler si se usarán vistas previas de documentos.
6. Configurar la raíz web en `public/`, HTTPS y la creación inicial del administrador.
   Cargar luego las imágenes del slider y el contenido autorizado desde el panel.

Consultar [hosting](ARRANQUE-Y-HOSTING.md), [subdominios](DESPLIEGUE-Y-SUBDOMINIOS.md)
y [manual técnico](DOCUMENTACION-TECNICA.md) antes del despliegue.

Para trabajar en los estilos: `npm ci --prefix tests --ignore-scripts` y
`node tools/build-design.mjs`. El frontend de producción no necesita Node.js.

## Comprobar antes de subir cambios

```text
git add .
python tools/check-publication.py
git diff --cached --stat
git diff --cached
```

El control examina el contenido del índice de Git, bloquea rutas privadas y
patrones conocidos de credenciales, y verifica los enlaces locales de la
documentación publicada. Complementa la revisión humana; no garantiza detectar
todos los datos sensibles posibles. Las referencias a evidencias privadas de
auditoría se conservan como texto, sin enlazarlas como archivos distribuidos.
