# Información privada

Este repositorio contiene código y documentación. No debe contener credenciales,
datos de trabajadores, resultados de exámenes, sesiones, archivos cargados,
copias de seguridad, capturas administrativas ni exportaciones de la base.

- La configuración real se guarda en `storage/config.php` o fuera del proyecto
  mediante `ACADEMIA_CONFIG`. Solo se publica `storage/config.example.php`.
- El directorio público del servidor debe ser `public/`.
- Los datos y materiales de cada instalación se administran por separado.
- Antes de publicar, revisar los archivos preparados con `git diff --cached`
  y ejecutar `python tools/check-publication.py`.
- `.gitignore` no elimina información que ya se haya publicado en un commit.
  Si se filtra una credencial, revocarla primero y revisar el historial afectado.

No incluir información sensible en issues, mensajes de commit o capturas.
