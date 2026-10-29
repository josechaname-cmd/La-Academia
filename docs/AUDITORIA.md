# Auditoría de fallas y mejoras

Documento histórico de la entrega del 1 de octubre. Para el estado actual y la limpieza del 23 de octubre, consultar [Validación](VALIDACION.md), [Arquitectura](ARQUITECTURA.md) y [Operación local](OPERACION-LOCAL.md).

Revisión de código realizada el 1 de octubre de 2026. No es una auditoría externa ni una certificación de seguridad. Los resultados verificados se detallan en VALIDACION.md.

## Corregido en esta entrega

| Hallazgo | Consecuencia | Corrección |
|---|---|---|
| URL y nombres técnicos ligados a _mockup | Confusión entre prototipo y aplicación | Raíz la-academia, namespace Academia, base y almacenamiento nuevos |
| Dos solicitudes iniciales podían crear sesiones a la vez | Condición de carrera compatible con el error «La sesión cambió» observado anteriormente | Sesión inicial secuencial y promesa compartida en cliente; CSRF renovado antes del login |
| API guiada por agent/action y todos los cambios por POST | Contrato difícil de descubrir y validar | Rutas v1, matriz de permisos, verbos y estados HTTP explícitos |
| JSON array aceptado como objeto | Datos inesperados llegaban a lógica de negocio | Contexto exige objeto JSON; límite de 1 MB |
| IDs y enteros booleanos | Coerción de true/false a números | Validación estricta de tipos y ruta autoritativa |
| Errores sin campo ni correlación | Mensajes genéricos y diagnóstico limitado | fields en validación, request_id y códigos estables |
| Fallo de título/categoría marcaba el archivo en rojo | Orientación incorrecta al administrador | El archivo se marca solo ante errores de carga sin campos específicos |
| Login recortaba espacios de contraseña | Contraseña creada con espacios no podía verificarse igual | Login preserva la contraseña literal |
| Migración de accesos podía promover cuentas al ejecutarse de nuevo | Cambio de permisos no solicitado en un estado inconsistente | Promoción heredada solo al introducir por primera vez la columna role |
| Una respuesta 401 podía provocar navegación recursiva innecesaria | Pantalla de carga repetida | Reintentar navegación solo si ya no existe identidad |
| Galería/dialogo persistía al cambiar de ruta | Superposición sobre otra pantalla y listeners retenidos | Cierre de diálogos y limpieza de campana al navegar |
| Galería registraba eventos sobre el contenedor permanente | Manejadores acumulados tras varias visitas | Listener asociado a la cuadrícula de su propia pantalla |
| Fotografías subidas se olvidaban de su archivo original | Posible selección repetida del mismo archivo tras un error | Mantener referencia para detección de duplicados en el editor |
| Credenciales de BD dentro de configuración pública del código | Riesgo de copia del secreto junto al repositorio | Configuración privada fuera de htdocs; sin valores secretos en documentación |
| Una imagen de notificación podía ser pública por su ID | Acceso directo a un adjunto de aviso sin sesión | Visibilidad pública limitada a banners y galerías publicados; prueba de regresión |
| Enlace de retorno al portal oculto en administración móvil | Navegación administrativa menos clara | Retorno visible y enlaces con altura táctil mínima |
| CSS concentrado en líneas enormes | Revisión y mantenimiento difíciles | CSS expandido, identidad textual y navegación móvil ajustada |

## Verificado y conservado

- Sin duración obligatoria ni video en capacitación.
- Categorías creadas desde el selector y nombres duplicados rechazados.
- Campana solo para identidad autenticada; avisos omitidos de la consulta anónima.
- Página de notificaciones fuera del menú.
- Inicio con carrusel de banners activos y tres cursos; eventos separados.
- Banners activos no enlazan borradores ni cursos archivados.
- Galería de tres a doce imágenes para nuevas publicaciones/ediciones; borradores privados. Existe una excepción heredada identificada debajo.
- Superadministrador/administrador separados en UI y servidor.
- Dos intentos, nota por intento, versionado e idempotencia del envío.
- Materiales privados, consultas preparadas, CSRF y hashes de contraseña.

## Hallazgo en los datos migrados

Hay **un evento publicado con una sola imagen**, procedente de la versión anterior. La migración lo conserva y el panel de eventos lo señala para revisión. Para guardar nuevamente como publicado deben agregarse al menos dos imágenes; también puede pasarse a borrador. No se generaron ni sustituyeron fotografías del usuario.

Las doce tablas coinciden con sus originales y los cuatro archivos tienen la misma huella SHA-256. No se detectaron cursos publicados sin material/examen ni archivos sin asociación con más de un día de antigüedad.

## Pendientes, sin ocultar su alcance

| Prioridad | Límite | Propuesta |
|---|---|---|
| Alta antes de producción | Identidad del trabajador basada solo en DNI proporcionado | Verificación de padrón o código de invitación, sin imponer login si el negocio no lo requiere |
| Alta antes de producción | Sedes no restringen acceso a cursos/notas | Definir matriz de propiedad/visibilidad y aplicar filtros server-side |
| Alta antes de producción | Cuenta histórica con contraseña corta y BD local con usuario amplio | Rotar credenciales mediante proceso autorizado y crear usuario MySQL de mínimo privilegio |
| Alta antes de producción | Autenticación HTTP local y bloqueo exceptuado en loopback | TLS, configuración productiva y evaluación de proxy antes de exposición |
| Media | Sin auditoría persistente de quién cambió contenido o notas | Tabla de eventos de auditoría con retención y sin contraseñas |
| Media | Subidas de imagen separadas del guardado | Cargas temporales con dueño y vencimiento; actualmente solo informe de huérfanos |
| Media | Listados completos y paginación de seis registros en cliente | Filtros y paginación server-side, índices y contrato de cursor |
| Media | Vista del reporte limitada a 1 000 filas; Excel ya exporta todos los participantes del examen | Paginación de la vista para consultar más filas sin descargar |
| Media | Código de plantillas largo en algunas vistas | Extraer formularios por dominio con pruebas de interacción |
| Media | Visor PPT/PPTX solo textual | Conversión local a PDF si se exige fidelidad visual |
| Media | Lecturas de notificaciones persistidas solo en el navegador por usuario | Persistencia en servidor si se requiere sincronización entre dispositivos o comprobantes de lectura |
| Media | Sin recuperación de contraseña por correo | Flujo administrativo de restablecimiento y entrega autorizada |
| Media | Formularios pueden perder cambios al navegar | Aviso de cambios pendientes; no está implementado |
| Baja | duration y portada image_id redundantes en esquema | Migración posterior con comprobación de consumidores |

No se modificaron datos reales para simular estas mejoras. Las pruebas temporales se revierten o eliminan explícitamente y no se usan como contenido del portal.


## Correcciones de estructura y lógica (misma fecha)

- Backend privado fuera de htdocs, con HTTP, coordinadores, repositorios, servicios y utilidades separados.
- Única entrada pública PHP, rutas derivadas de la URL, bloqueo de entradas y plantillas antiguas. No se afirma que antes PHP se descargara como texto: los módulos anteriores ya estaban protegidos por Apache, pero mezclados con el árbol servido.
- Un intento pendiente se rechaza si su curso fue archivado. Los resultados completados conservan reenvío idempotente.
- Una imagen vinculada a un banner/aviso no puede eliminarse mediante la acción de archivos.
- El router del cliente ignora respuestas de autenticación antiguas al cambiar rápidamente de página.
- Fuentes antiguas, scripts y capturas sueltos se conservan organizados en el archivo histórico del espacio de trabajo, fuera del despliegue.
- El sincronizador reemplaza el árbol público completo con respaldo; no deja módulos PHP antiguos por copiar encima de una instalación existente.

Los límites funcionales de la tabla de pendientes anterior continúan vigentes donde no se indique corrección. Esta revisión no es una certificación de seguridad ni cambia las reglas de sedes o de identificación por DNI.


## Revisión del 2 de octubre de 2026

Se corrigió el espacio entre panel y footer con una distribución flexible que incluye el pie. Se añadieron fechas de apertura/cierre y duración opcional del intento, exportación XLSX por versión, caché privada acotada con invalidación, y recepción periódica de avisos. Las pruebas comprueban renovación de sesión/CSRF y que el sondeo no extienda la inactividad. No se cachean permisos ni notas; sigue existiendo una consulta de validación de identidad por solicitud autenticada. No se realizaron pruebas de carga masiva.
