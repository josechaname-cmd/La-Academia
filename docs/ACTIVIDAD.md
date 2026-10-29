# Actividad y notificaciones

## Navegación

- `#admin` muestra **Inicio**, resumen de capacitaciones, evaluaciones y eventos.
- El enlace **Capacitaciones** abre su página. Una flecha independiente despliega u oculta **Resultados** sin navegar; la página de capacitaciones también tiene un acceso directo a resultados: `#admin/capacitaciones/resultados`. El submenú se abre al acceder directamente a Resultados.
- `#admin/capacitaciones/resultados/ID` selecciona directamente la versión de examen y habilita su exportación Excel.
- `#admin/eventos/ID` abre y destaca la tarjeta del evento correspondiente.
- La ruta antigua de Resultados redirige al destino nuevo. Avisos, Notificaciones y Banners antiguos redirigen a Capacitaciones; su editor ya no se carga.
- Sidebar, encabezado y campana se conservan entre secciones. El footer permanece oculto en el panel autenticado.

## Registro persistente

`activity_log` guarda tipo de evento, entidad e identificador, capacitación y examen asociados, título, descripción breve, fecha del evento y fecha de registro. No depende de la caché y no se borra al marcar una notificación como leída. No copia nombres, DNI, teléfonos, respuestas ni tokens de participantes: esos detalles permanecen en el reporte protegido.

Se registran guardados y publicación/archivo de capacitaciones, cambios de materiales, nuevas versiones y periodos de examen, resultados enviados, cierres y creación/modificación/eliminación de eventos. Los cambios de contenido y su registro comparten transacción. Un guardado sin cambios no genera otra alerta; un envío repetido conserva un único registro por intento. El historial del recurso eliminado se conserva, con enlace al listado disponible.

El cierre utiliza una clave única por examen y fecha de cierre. Se detecta al consultar la campana, en hora de Perú. Se registra la hora real de cierre aunque la consulta ocurra después. Reabrir y asignar un nuevo cierre permite registrar el nuevo periodo; consultas repetidas no duplican la misma finalización.

La migración agrega la tabla e incorpora resultados ya completados y cierres existentes de forma idempotente. No inventa un historial de modificaciones previas. Los cambios SQL realizados fuera de la aplicación no generan automáticamente actividad, salvo los cierres que se detectan por fecha; no se instalaron triggers ni un auditor general de todas las tablas.

## Lectura y caché

`GET /api/v1/notifications` exige sesión administrativa y devuelve `{items, revision}`. Cada elemento contiene un `href` interno calculado en el servidor. La campana muestra las últimas 60 actividades; el registro completo queda conservado en BD. Cada notificación es un enlace completo: al pulsarla se abre su destino, se marca como leída y se retira de la lista. No hay botones interiores de detalle ni de marcado manual. Las marcas leídas se almacenan por identificador y usuario en este navegador, sobreviven a recargas y cambios de texto/enlace, y se sincronizan entre pestañas. No se sincronizan entre dispositivos ni son comprobantes centralizados de lectura. Si el navegador bloquea el almacenamiento, solo se conservan durante la visita.

El servidor reutiliza el feed durante 15 segundos. Cambios de contenido y envíos de resultados invalidan la caché del servidor. El sondeo se realiza cada 30 segundos con la pestaña visible; abrir la campana también consulta. Con funcionamiento normal, la detección de un cierre puede tardar aproximadamente hasta 45 segundos; con pestaña cerrada u oculta se detecta en la siguiente consulta. No hay un proceso de notificaciones que funcione sin solicitudes, ni se configuró una tarea programada. Fallos de red usan reintentos de hasta 120 segundos.

La revisión es una huella del contenido del feed, no solo el último ID, para detectar también inserciones que terminan de confirmar fuera de orden. Una revisión nueva invalida las lecturas de navegación y refresca Resultados si está abierto. El clic de una actividad fuerza datos recientes y abre el destino incluso cuando ya se está en esa misma ruta. Los formularios de edición no se reconstruyen por un sondeo.

## Compatibilidad y pruebas

La tabla histórica `announcements` y sus archivos se conservan. Su gestión administrativa responde 410 y la lectura pública devuelve una lista vacía. El editor retirado está en `archive/retired-admin-notices.js` fuera del frontend público.

- `php tests/run.php`: reglas de negocio y actividad en transacción revertida.
- `node tests/navigation-cache.mjs`: vencimiento, concurrencia, invalidación por escrituras, identidad y revisiones de actividad.
- `node tests/activity-ui.mjs`: jerarquía del menú y carga directa del examen seleccionado.
- `python tests/http_smoke.py`: contrato HTTP y protección de rutas privadas.
