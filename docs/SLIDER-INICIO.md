# Slider de Inicio

Desde **Panel → Eventos → Slider de Inicio**, exclusivamente como superadmin, puedes agregar, editar, ocultar/mostrar y eliminar imágenes. Ruta: `#admin/eventos/slider`; las rutas anteriores `#admin/slider` y sus editores redirigen conservando el destino. Ya no hace falta editar código ni colocar archivos en una carpeta.

## Uso: una sola pantalla

1. Pulsa **Agregar imágenes** y selecciona una o varias (hasta 20 por carga). JPG, PNG o WEBP de hasta 8 MB y 8000 px por lado. No se publica nada al seleccionar archivos.
2. Selecciona una miniatura para editarla. Puedes añadir **Título sobre la imagen** y **Texto de apoyo**, ambos opcionales. En **Apariencia del texto**, elige tipografía y alineación, y un tamaño y color independientes para título y texto. La descripción de accesibilidad se completa inicialmente con el nombre del archivo y se puede ajustar.
3. Elige qué ocurre **Al pulsar la imagen**: sin enlace, capacitación, evento publicado, sección del portal o URL HTTP/HTTPS. Los enlaces externos se abren en otra pestaña; las vistas previas nunca navegan.
4. **Arrastra desde los seis puntos** junto a la miniatura para subir o bajar una imagen. Una línea marca dónde quedará; funciona con mouse o pantalla táctil. Con teclado, enfoca los puntos y usa ↑/↓ o Inicio/Fin; Escape cancela un arrastre. Marca o desmarca **Mostrar en Inicio**. **Quitar imagen** prepara la eliminación para el próximo guardado.
5. Comprueba el encuadre en escritorio/móvil y abre **Ver secuencia completa** para revisar los cambios actuales, incluso los que aún no están guardados.
6. Pulsa **Guardar cambios** y revisa la confirmación. Se guardan las imágenes modificadas y luego las eliminaciones. Si falla una petición, los cambios confirmados se conservan; el reintento solo envía lo pendiente. No es una transacción única de todo el lote.

Las imágenes recomendadas son **1920 × 600 px** (16:5), mínimo aconsejado **1600 × 500 px**. En **Ajustar imagen y accesibilidad** puedes elegir llenar el espacio o mostrar la imagen completa y cambiar la zona de recorte. La vista previa muestra dimensiones y avisos de calidad. No se estiran las imágenes.

Las tipografías disponibles son Institucional, Arial, Georgia y Trebuchet, con alternativas locales; no se descargan fuentes de terceros. El título admite 20–72 px y el texto 12–36 px; se reducen proporcionalmente en espacios pequeños. Puedes elegir cualquier color hexadecimal con el selector. Estos controles modifican el texto superpuesto, no las letras integradas en el archivo de imagen. Comprueba la legibilidad de los colores elegidos sobre cada fotografía.

Las rutas antiguas de crear/editar abren esta misma pantalla, sin una pestaña distinta por imagen. Las URLs temporales de archivos se liberan al guardar, reemplazar o salir.

Con varias imágenes, el contenido cambia cada **5 segundos**, sin efectos de transición. Se mantienen puntos de navegación, teclado, gestos táctiles, pausa al ocultar la pestaña y movimiento reducido. El título y texto se superponen con contraste sobre la imagen. Una imagen queda fija; sin imágenes visibles no se muestra el slider. El fondo de la sección de tarjetas reutiliza estas imágenes publicadas, no las portadas de cursos.

## Datos y migración

`backend/scripts/migrate.php` ejecuta `PortalMediaMigration`, que crea `home_slides` e importa **una sola vez** las imágenes válidas de `public/assets/slider`, conservando su orden original. Después ejecuta `SliderContentMigration`: agrega `title`, `subtitle` y `link_url`, inicialmente vacíos, más `font_family`, `title_color`, `text_color`, `title_size`, `text_size` y `text_align`. Los estilos iniciales son institucional, blanco, 36/17 px y alineación izquierda. No modifica imágenes ni orden existentes. Repetir la migración no duplica imágenes ni recupera las eliminadas desde el panel. Los archivos antiguos se mantienen donde están; nuevas cargas y reemplazos usan `storage/files` a través de `FileTool` (ruta configurada en la instalación).

La carpeta antigua se conserva por compatibilidad, pero **agregar archivos allí ya no modifica el slider**. Su lector `SliderImages` solo se utiliza para la importación inicial. Los archivos antiguos eran públicos y conservan sus URLs directas aunque se oculten del slider; las cargas nuevas se sirven mediante la API y requieren una referencia publicada para acceso anónimo.

## API y código

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/v1/slider` | Imágenes visibles en orden |
| GET / POST | `/api/v1/admin/slider` | Listar / crear |
| GET / POST / DELETE | `/api/v1/admin/slider/{id}` | Consultar / editar / eliminar |
| POST | `/api/v1/admin/slider/{id}/status` | Mostrar / ocultar |

Administración restringida a superadmin, escrituras con CSRF y rutas como fuente autoritativa del ID. El backend valida archivo, ajuste, enfoque, orden, título, texto y enlace. Se rechazan enlaces con credenciales o protocolos ejecutables. Si un destino interno deja de estar publicado, se retira el enlace de la respuesta pública. `HomeSliderAgent` coordina cargas transaccionales; `HomeSliderRepository` controla el listado y CRUD. El listado público utiliza caché de servidor invalidada por escrituras, y el administrativo se consulta en vivo.

`admin-slider.js` reutiliza `slideMedia` y `homeCarousel` del portal para mantener el mismo encuadre y comportamiento. La previsualización local libera URLs temporales al reemplazar, guardar o salir. Los archivos vinculados no se pueden eliminar por la API general; los desvinculados se conservan para revisión de mantenimiento.

## Verificación

`tests/admin-slider.mjs`: preview local, estilos, arrastre por mouse/táctil/teclado, cancelación del gesto, orden, carga múltiple, guardado parcial, errores y confirmaciones. `tests/slider.mjs`: enlaces, estilos seguros, rotación y accesibilidad. `tests/run.php`: reglas reales con rollback, límites de estilos y conservación al editar. `tests/media-http.py`: carga multipart, privacidad, edición y eliminación sin publicar contenido de prueba. No se realizó validación visual.
