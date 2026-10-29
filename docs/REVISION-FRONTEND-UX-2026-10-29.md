# Revisión de frontend y experiencia de uso

**Fecha:** 29 de octubre de 2026. **Proyecto activo:** `C:\xampp\htdocs\la-academia`.

## Correcciones

| Área | Problema o limitación | Resultado |
|---|---|---|
| Navegación | La carga inicial de notificaciones podía convertir una pantalla válida en un error. | Un fallo temporal muestra un aviso en la campana y permite usar la pantalla. Se mantiene el tratamiento de errores de autorización. |
| Teclado | «Saltar al contenido» cambiaba el hash usado por el enrutador y podía abrir el portal. | Enfoca el contenido actual sin cambiar de ruta. El título del navegador identifica la pantalla. |
| Formularios | Mensajes genéricos para correo, DNI y límites; un grupo de radios podía omitir su obligatoriedad si estaba declarada en otro radio. | Mensajes concretos y validación del grupo completo. El primer campo inválido recibe foco; se respeta la preferencia de movimiento reducido. |
| Reinicio de formularios | Los errores personalizados podían permanecer después de `reset()`. | Se limpian los errores y sus asociaciones accesibles al reiniciar. |
| Guardado | Los botones asociados mediante `form="…"`, situados fuera del formulario, no recibían correctamente sus errores de API. | Se utiliza el formulario asociado al botón para mostrar la validación. |
| Ingreso y accesos | No había control para revisar la contraseña escrita. | Mostrar/ocultar con etiqueta accesible. No envía el formulario, mantiene el bloqueo de doble envío y vuelve a ocultar la contraseña al reiniciar. |
| Materiales | Las pestañas del visor no tenían navegación completa por teclado; un fallo de red no ofrecía reintento. | Flechas, Inicio y Fin, foco y panel asociados, reintento de consulta y protección contra respuestas tardías. Sin archivos, no se muestra una descarga vacía. |
| Mensajes de conexión | El usuario recibía una indicación técnica sobre Apache. | Se indica revisar la conexión y reintentar. |

## Listados y diseño

Se retiró la etiqueta genérica «Capacitación» que se repetía en cada tarjeta del catálogo y el texto de relleno de las portadas. En el editor y visor se usan «Información», «Portada», «Materiales», «Sin examen» y «Publicar». El nombre de la sección se conserva en la navegación; los avisos sobre operaciones y el historial mantienen el contexto necesario.

- Capacitaciones y eventos administrativos: seis tarjetas por página. Eventos incorpora búsqueda por título y lugar; abrir un evento desde una notificación selecciona la página correspondiente.
- Accesos y sedes: búsqueda y veinte filas por página. Los botones de edición siguen asociados al registro correcto.
- Colaboradores: veinte filas por página en búsqueda y directorio por sede. Todos los resultados son accesibles, incluidos los que antes quedaban fuera de los primeros cien. Se conservan confirmaciones de alta, edición, baja y carga masiva.
- Resultados: veinte filas por página, controles fuera del área desplazable y encabezado de tabla fijo. Búsqueda por texto sin tildes; los filtros reinician la página y una actualización ajusta páginas que ya no existen. El Excel conserva la exportación completa del examen. La consulta de pantalla mantiene su límite previo de 1 000 registros.
- La paginación es local sobre las listas consultadas: no añade llamadas ni mutaciones por cambiar de página. No sustituye una futura paginación de servidor si crece mucho el volumen de datos.
- Contraste más alto en textos secundarios del visor, formularios, archivos y tarjetas. Se conserva la paleta institucional.
- Encabezados, botones y navegación permiten saltos de línea; los textos largos pueden ajustarse al ancho. Los controles de formulario usan 16 px en móvil y los nuevos paginadores se reorganizan para pantallas pequeñas.
- Las fuentes CSS se editaron en `public/frontend/design`; los archivos de `public/assets` se regeneraron con la herramienta del proyecto. Los imports del frontend usan una versión común para actualizar la caché.

## Verificación

Se añadieron [frontend-ux.mjs](../tests/frontend-ux.mjs) y [list-controls.mjs](../tests/list-controls.mjs), y se amplió [session-routing.mjs](../tests/session-routing.mjs). Se integraron las nuevas suites en [check-local.ps1](../tools/check-local.ps1).

Los casos nuevos comprueban fallos de conexión, recuperación de notificaciones, foco, contraseñas, envío duplicado, errores del servidor, radio obligatorio, reinicio del formulario, visor con respuestas fuera de orden, últimos registros de cada listado y exportación independiente de la página visible. Utilizan datos sintéticos y no modifican registros reales.

**Resultado:** 21 suites JavaScript aprobadas, CSS generado sincronizado y validación de fuentes/imports/enlaces sin errores. No se ejecutó una nueva batería de backend porque esta revisión no modificó su lógica.

Comandos de verificación del alcance frontend:

```powershell
node tools/build-design.mjs --check
python tests/check_source.py
$failed = @()
Get-ChildItem tests -Filter '*.mjs' |
  Where-Object Name -ne 'dashboard-browser.mjs' |
  ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
  }
if ($failed.Count) { throw ('Pruebas fallidas: ' + ($failed -join ', ')) }
```

`dashboard-browser.mjs` es un servidor de revisión manual, no una suite automática. El comando general `check-local.ps1` también ejecuta pruebas de backend y Apache, con requisitos adicionales descritos en el manual técnico.

**Límite de esta revisión:** se comprueban DOM, eventos, datos simulados, sintaxis, imports, contraste de tokens y coherencia del CSS. El uso del navegador local está deshabilitado en este entorno; queda pendiente la inspección visual real en escritorio y móvil. Las pruebas DOM no certifican el ajuste visual píxel a píxel.

Respaldo anterior a los cambios: `storage/backups/frontend-ux-20261029-072916`. No se modificaron esquema SQL, permisos, registros de trabajadores ni configuración de hosting.

## Tarjetas del inicio: imagen y fecha de publicación

Las tarjetas del inicio usan la imagen como fondo de borde a borde, con esquinas rectas y un sombreado radial suave que oscurece los bordes y se aclara hacia el centro. El título, la fecha y el contador aparecen en blanco, sin bloques de fondo. En las tarjetas, las vistas se muestran solo con el ícono de ojo y el número; la etiqueta completa se conserva para lectores de pantalla y al pasar el puntero. La categoría conserva su color azul y su forma redondeada. Se elimina el pie blanco y el texto «Abrir». Un único enlace sobre la imagen permite entrar tanto con clic como con teclado; el nombre accesible es el título. El catálogo mantiene su composición independiente.

La imagen llena el área mediante `object-fit: cover`: conserva las proporciones y puede recortar los extremos según su formato. Los títulos largos pueden ampliar la tarjeta, sin truncarse. Las portadas pendientes conservan su actualización automática.

Las imágenes del carrusel de inicio también reciben un sombreado radial tenue, con el centro despejado. Detrás de las tarjetas se reutilizan las imágenes publicadas del slider como un mosaico desenfocado, al 28 % de opacidad (22 % en móvil), con desenfoque de 6 px y bordes suaves. Este fondo es decorativo, no recibe clics ni se anuncia a lectores de pantalla. Usa las mismas URLs del slider, sin consultar portadas de cursos ni registrar vistas. Si no hay imágenes publicadas en el slider, se mantiene el fondo base.

La fecha relativa usa el día calendario de Perú, con «Hoy», «Hace un día» y «Hace N días». El atributo de la fecha permite consultar el día completo. Se obtiene la publicación del historial existente, sin cambiar el esquema ni los registros; para contenido histórico sin ese dato se mantiene la fecha de creación disponible. El catálogo público ordena primero las publicaciones más recientes.

Verificación de este ajuste: suites `catalog.mjs`, `content-views.mjs`, `training-enhancements.mjs` y `design-system.mjs`; 67 comprobaciones de backend en esquema aislado; validación de sintaxis, imports, enlaces y CSS generado. Se mantiene la limitación de inspección visual indicada arriba. Respaldo: `storage/backups/home-image-cards-20261029-142852`.


## Vistas públicas de materiales

El contador de cursos se comparte entre inicio, catálogo, visor y administración. Se registra al cargar el documento en el visor o solicitar el original; no al mostrar las tarjetas ni al montar una página sin material. Cambiar de documento, ampliar y recargar no suma nuevas vistas en la misma sesión. Se mantienen la exclusión de administradores, CSRF, los hitos y los totales existentes. Se trata de aperturas, no de evidencia de lectura completa ni de personas únicas.

Una nueva vista renueva la caché del servidor; un duplicado conserva la caché. El visor recibe el total actualizado en la respuesta. Los eventos conservan su contador privado. No se cambió el esquema de datos. Respaldo: `storage/backups/home-views-20261029-143812`.


El contador de la campana usa fondo azul sólido y número blanco, sin el borde blanco exterior.


## Editor unificado de slider y popup con imagen enlazada

El slider se prepara en una sola pantalla: selección múltiple, miniaturas, orden
por arrastre con mouse/táctil y teclado, título/texto opcionales, tipografía,
colores y tamaños por imagen, destino al pulsar la imagen, vista previa y guardado con
confirmación. Se conservan cargas que ya terminaron si falla otra del lote. El
popup enlaza desde la imagen y conserva la X; no presenta botón de destino.
Los slides cambian directamente, sin animaciones de transición.

Validación: 21 suites de frontend, 377 comprobaciones PHP, 169 contratos HTTP y
21 comprobaciones HTTP de medios en bases aisladas, más 105 comprobaciones HTTP
de acceso y recursos en la instalación local. Migración aditiva local
verificada dos veces, con respaldo privado de los tres slides originales.
No hay verificación visual nueva mediante navegador.
