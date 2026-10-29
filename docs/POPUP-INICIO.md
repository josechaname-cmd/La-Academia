# Popups de Inicio

Gestión exclusiva para superadmin en **Panel → Eventos → Popup de Inicio** (`#admin/eventos/popup`). Abre una lista de anuncios guardados, con vista previa, edición, activación/desactivación y eliminación con confirmación. **Solo uno puede estar activo**; al activar otro, el anterior se desactiva en la misma transacción. Eliminar el activo deja Inicio sin popup y conserva los demás.

## Preparar y previsualizar

1. Pulsa **Crear popup** o el icono **Editar** de uno guardado.
2. Selecciona una imagen JPG, PNG o WEBP de hasta 8 MB. El archivo se previsualiza localmente antes de subirlo.
3. El título es opcional. Escoge tamaño **Estándar** o **Compacto**, imagen completa o recorte horizontal/cuadrado y el enfoque del recorte. El archivo original se conserva.
4. Elige **Solo informativo**, un **evento publicado**, una **capacitación publicada** o un **enlace externo HTTP/HTTPS**. Si seleccionas un destino, la imagen completa será el enlace. No se muestra un botón adicional ni se exige escribir su texto; se genera una etiqueta accesible. Solo se guarda un destino: elegir externo reemplaza el interno y viceversa. Los externos se abren en otra pestaña con `noopener noreferrer`; la previsualización nunca navega. Se rechazan protocolos ejecutables, URLs con credenciales y caracteres de control.
5. La vista previa lateral refleja los cambios al editar. Puedes alternar **Escritorio/Móvil** y usar **Ampliar vista previa** para abrir el diálogo. Cerrar el diálogo devuelve al editor; sus enlaces no navegan.
6. Guarda desactivado para conservar un borrador, o activo para mostrarlo en Inicio. Desde la lista puedes cambiar el activo sin editarlo.

Las vistas previas no guardan ni publican. Si un destino deja de estar publicado, el popup público oculta su enlace. Al guardar o activar se valida otra vez su disponibilidad.

## Funcionamiento y estructura

- Solo aparece en Inicio público (`#inicio` o URL sin hash), cada vez que el usuario ingresa a Inicio, incluso si ya lo cerró en una visita anterior.
- No utiliza marcas de sesión para ocultarlo. Cerrar el anuncio lo mantiene cerrado durante esa visita; volver desde otra sección o recargar Inicio vuelve a mostrarlo. No se abren diálogos duplicados.
- Diálogo nativo con cierre, Escape, clic exterior y retorno del foco. Se cierra al abandonar Inicio; los fallos no bloquean el portal.
- `HomePopupCollectionMigration`: convierte la configuración antigua en colección conservando el contenido, crea bloqueo transaccional y una restricción única para un solo activo.
- `PortalMediaMigration`: añade tamaño y encuadre sin modificar las imágenes existentes.
- `HomePopupRepository`: CRUD, validaciones, revisiones y activación exclusiva.
- `HomePopupAgent`: permisos superadmin, cargas validadas y limpieza del archivo nuevo si falla el guardado.
- `admin-home-popup.js` y `home-popup.js`: lista, editor y presentación compartida entre vista previa y portal.
- `design/home-popup.css`: estilos limitados a estos componentes y basados en tokens; compilar con `node tools/build-design.mjs`.

## API

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/v1/home-popup` | Activo público o `null` |
| GET / POST | `/api/v1/admin/home-popup` | Listar / crear |
| GET / POST / DELETE | `/api/v1/admin/home-popup/{id}` | Consultar / editar / eliminar |
| POST | `/api/v1/admin/home-popup/{id}/status` | Activar o desactivar |

Administración exclusiva de superadmin; escrituras con CSRF. Las listas administrativas se consultan en vivo. El público utiliza caché invalidada al modificar. Las imágenes se guardan en almacenamiento privado; solo las vinculadas a anuncios activos son públicas. Imágenes retiradas quedan para revisión de archivos sin vínculo, no se borran automáticamente.

## Verificación

`tests/home-popup.mjs`: CRUD, confirmaciones, previsualización local, enlaces, cierre/foco y revisiones. `tests/run.php`: transacciones, activación exclusiva, restricciones de BD, permisos y encuadre. `tests/media-http.py`: cargas multipart reales y edición/eliminación de anuncios temporales desactivados, con limpieza final. Sin revisión visual en navegador.

La X en la esquina sigue siendo el control de cierre. En modo informativo la imagen no es un enlace. La vista previa ampliada bloquea la navegación para conservar la edición.
