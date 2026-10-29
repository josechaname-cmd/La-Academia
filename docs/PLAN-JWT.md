# Plan de migración de sesiones a JWT

## Objetivo

Reemplazar gradualmente la sesión PHP del panel administrativo por tokens JWT sin perder las protecciones actuales: cierre de sesión, expiración por inactividad, revocación al cambiar contraseña, control por rol y sede, y CSRF.

JWT no debe almacenarse en `localStorage`. La propuesta usa cookies `HttpOnly`, `SameSite=Strict` y `Secure` en producción para reducir la exposición ante XSS.

## Arquitectura propuesta

1. **Token de acceso JWT**
   - Vigencia corta: 15 minutos.
   - Firma asimétrica RS256 mediante una biblioteca mantenida, no criptografía propia.
   - Claims mínimos: `iss`, `aud`, `sub`, `jti`, `iat`, `nbf`, `exp` y `ver` (`auth_version`).
   - El rol, la sede y el estado activo se consultan en la base de datos. No se confía en datos de autorización antiguos incluidos en el token.

2. **Token de renovación rotatorio**
   - Valor aleatorio de 256 bits en cookie `HttpOnly` separada.
   - En la base solo se conserva su hash, usuario, fecha de vencimiento, fecha de uso y revocación.
   - Cada renovación invalida el token anterior y entrega uno nuevo. La reutilización de un token rotado revoca toda la familia de sesión.

3. **Cookies y CSRF**
   - `LAACADEMIA_ACCESS`: acceso JWT, ruta `/la-academia/api/`.
   - `LAACADEMIA_REFRESH`: renovación, limitada a `/la-academia/api/v1/session/refresh`.
   - Mantener el encabezado `X-CSRF-Token`, porque las cookies se envían automáticamente desde el navegador.
   - No incluir DNI, correo, cargo ni sede dentro del JWT.

4. **Revocación**
   - Conservar `admins.auth_version`; cambiar contraseña, desactivar un usuario o forzar cierre incrementa esta versión.
   - El cierre de sesión revoca el token de renovación y elimina ambas cookies.
   - Una tarea programada elimina sesiones vencidas y revocadas.

## Cambios de base de datos

Crear una tabla `auth_sessions` con:

- `id`, `admin_id` y `family_id`.
- `refresh_hash` con índice único.
- `issued_at`, `expires_at`, `last_used_at` y `revoked_at`.
- `replaced_by` para detectar reutilización.
- Índices por usuario, familia y vencimiento.

Las claves de firma deben vivir fuera del repositorio y cargarse desde variables de entorno. Debe existir un identificador `kid` para rotarlas sin desconectar inmediatamente todas las sesiones.

## Endpoints

- `POST /api/v1/session`: valida credenciales y crea acceso + renovación.
- `GET /api/v1/session`: resuelve el JWT y devuelve el usuario vigente.
- `POST /api/v1/session/refresh`: rota el token de renovación.
- `DELETE /api/v1/session`: revoca la familia actual y limpia las cookies.
- Opcional para superadministración: `DELETE /api/v1/admin/users/{id}/sessions`.

## Implementación por etapas

1. Añadir biblioteca JWT, configuración, claves fuera del repositorio y migración de `auth_sessions`.
2. Crear servicios separados para emitir, validar, renovar y revocar tokens, con pruebas unitarias de expiración, firma, audiencia y rotación.
3. Agregar un modo compatible `AUTH_MODE=session|dual|jwt`. En `dual`, aceptar la sesión PHP existente pero emitir JWT en el siguiente inicio de sesión.
4. Adaptar el cliente para renovar una sola vez ante `401 token_expired`, sin repetir automáticamente operaciones de escritura.
5. Ejecutar pruebas HTTP de roles, sedes, CSRF, cambio de contraseña, desactivación, dos pestañas y reutilización de refresh token.
6. Activar `jwt` primero en un entorno de prueba, luego en producción; mantener la reversión a `session` durante una versión.
7. Retirar el código de sesiones PHP solo después de confirmar que no quedan sesiones antiguas activas.

## Criterios de aceptación

- Un token vencido no permite acceder y puede renovarse solo con un refresh válido.
- Un token alterado, de otro emisor o audiencia, siempre devuelve `401`.
- Cambiar contraseña o desactivar al usuario invalida inmediatamente sus tokens.
- Un capacitador nunca puede acceder a rutas de superadministración ni gestionar otra sede.
- Cerrar sesión impide reutilizar el refresh token.
- No aparecen tokens, claves, DNI ni contraseñas en logs, URLs o `localStorage`.
- Las 355 verificaciones internas y las pruebas HTTP continúan pasando, junto con nuevos casos específicos de JWT.

## Riesgos y reversión

- JWT no elimina la necesidad de CSRF cuando se usa en cookies.
- Una clave filtrada exige rotación inmediata y revocación de sesiones.
- La renovación concurrente entre pestañas debe coordinarse para no generar falsos positivos de reutilización.
- Si la activación falla, `AUTH_MODE=session` restaura el mecanismo actual sin revertir la tabla nueva.
