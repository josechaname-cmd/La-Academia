# Validación de La Academia

## Orden del detalle, navegación pública y login — 27 de octubre de 2026

El detalle de cada capacitación presenta primero categoría, título y descripción en un bloque compacto; debajo utiliza todo el ancho disponible para la portada configurada. El visor y la evaluación permanecen después, sin alterar el PDF ampliado ni el examen.

El buscador de la cabecera utiliza un fondo translúcido con desenfoque. Inicio, Capacitaciones y Eventos son enlaces limpios y señalan la sección actual mediante un subrayado azul/teal; «Iniciar sesión» es el único acceso con contenedor rectangular moderno. Las páginas de curso y detalle de evento conservan subrayada su sección principal.

En el login se retiró el retorno duplicado de la cabecera. «Volver al portal» ahora aparece una sola vez, encima de la tarjeta y alineado con ella; formulario, logo y mensajes quedan dentro de una tarjeta independiente.

## Detalle visual y PDF ampliado — 27 de octubre de 2026

Al abrir una capacitación, el detalle muestra la portada configurada —incluida la imagen personalizada subida desde administración— junto con categoría, título y descripción completa. El material conserva su vista embebida y añade «Ver PDF en grande»: abre un visor modal de casi toda la pantalla, con cierre accesible y sin navegar fuera de la capacitación. Las presentaciones convertidas reutilizan el mismo visor cuando su vista previa está lista.

Composición compactada después de la revisión visual: portada con mayor proporción horizontal, panel de título/descripción más estrecho y menor, un único encabezado «Material de capacitación», y control de expansión de 36 px integrado junto a la pestaña PDF/PPTX. El icono no presenta texto visible, pero conserva etiqueta accesible y ayuda emergente.

La prueba DOM comprueba portada personalizada, descripción, activación del botón, URL privada del PDF dentro del modal, cierre y limpieza al cambiar de ruta. El diseño es responsive: composición de dos columnas en escritorio, una columna en pantallas medianas y visor a pantalla completa en móvil.

## Portadas, experiencia de examen y sidebar retráctil — 27 de octubre de 2026

Las portadas de las tarjetas públicas y administrativas ahora cubren todo el ancho del área visual mediante recorte proporcional, sin deformación ni franjas laterales. El examen público incorpora un encabezado más claro, panel de progreso, navegación por preguntas, respuestas con selección visible y pie de acciones estable; la consulta previa por DNI y el registro de fecha permanecen sin cambios. El creador administrativo separa configuración y contenido, muestra total y estado de cada pregunta y refuerza la barra de guardado.

El sidebar administrativo usa un fondo armónico azul petróleo/teal y puede contraerse en escritorio a navegación por iconos. La preferencia se conserva en el navegador y se sincroniza al cambiar de ruta; en móvil sigue funcionando exclusivamente como cajón accesible, sin heredar el modo contraído.

Validación completa aprobada: compilación y alcance del sistema de diseño, sintaxis/imports, 348 verificaciones PHP con reversión y 104 comprobaciones HTTP sin contenido de prueba persistente. Se añadieron pruebas DOM para estado y conteo de preguntas, colapso/expansión accesible, persistencia y restauración del sidebar. Revisión visual real del catálogo y del modal inicial del examen aprobada.

## Registro de examen por DNI — 27 de octubre de 2026

El formulario previo al examen solicita únicamente DNI. Una consulta con CSRF valida examen abierto y colaborador activo, y devuelve solo nombre completo y cargo. El inicio vuelve a resolver la identidad en servidor y registra una copia de nombre/cargo; no acepta nombre, celular, área ni cargo del navegador. Resultados web y Excel reemplazan celular/área por cargo y mantienen la fecha del envío como fecha del examen.

`PersonnelMigration` aplicada sin borrar inscripciones ni intentos. Maestro activo: 220 colaboradores, cero DNI inválidos y cero duplicados. Los cuatro registros históricos permanecen; ninguno coincidió con el maestro, por lo que no se inventó cargo. Validación aprobada: 348 comprobaciones PHP con reversión, flujo DOM de evaluación, navegación de reportes, generador XLSX, sintaxis/imports y sistema de diseño. La consulta HTTP real a un examen abierto confirmó exactamente `name` y `job_title`.

## Buscador público y header dinámico — 27 de octubre de 2026

Nuevo componente `public/frontend/components/public-header.js`: búsqueda conjunta sobre endpoints públicos de capacitaciones y eventos, normalización de tildes, coincidencia por palabras en título/categoría/descripción, espera breve al escribir y reutilización de listas durante 30 segundos. Sin consultas por cada pulsación ni exposición de listados administrativos. Cierre por Escape, clic exterior o navegación; flechas para recorrer resultados; cancelación de respuestas tardías y reintento ante errores.

Orden definitivo en escritorio: logo → buscador → Inicio → Capacitaciones → Eventos → Iniciar sesión; buscador y navegación agrupados a la derecha. En móvil se usa botón desplegable. No se muestra el mensaje de mínimo de letras: el campo vacío o de una letra mantiene los resultados ocultos. Resultados agrupados con miniaturas de portadas/fotos existentes, categoría, título y acceso directo; icono de respaldo si la imagen falla.

Header público con opacidad 92% arriba y 76% después de 24 px de desplazamiento, desenfoque para legibilidad y fondo alternativo en navegadores sin soporte. Animación del logo exclusivamente al clic, respetando movimiento reducido. Panel administrativo conserva su navegación.

Validación DOM automatizada (`tests/public-header.mjs`, incluida en check-local): búsqueda conjunta, tildes, caché, escape de HTML, teclado, cierre/cancelación, error/reintento, scroll y animación solo al clic. Diseño, sesión/rutas, sintaxis/imports y slider comprobados. Revisión visual en 1280 × 720 y 390 × 844: resultados reales de capacitaciones y eventos, agrupación a la derecha, miniaturas, transparencia y móvil sin desbordamiento. Capturas `storage/previews/ui-review-20261027/search.png` y `search-mobile.png`. Recursos JS `20261027-05`, CSS `20261027-06`.

## Header público, movimiento y footer TI — 27 de octubre de 2026

Cabecera pública con franja azul/teal/acento, fondo translúcido, navegación activa en cápsula y acceso principal con degradado. Inicio incorpora entrada breve y escalonada de tarjetas, más respuesta de botones; respeta movimiento reducido y no introduce animaciones continuas ni cambia las dimensiones del slider.

Footer renovado en azul oscuro: Área de TI, correo de soporte configurable y derechos de ACEAPERU. Eliminado el teléfono del pie y de la configuración predeterminada. Estilos anteriores del footer retirados de los layouts; nuevo archivo `public/frontend/design/public-shell.css` centraliza header público y footer. El panel autenticado conserva su navegación y el footer oculto.

Pruebas de diseño, sesión/rutas, slider y sintaxis/imports aprobadas. Validación visual real a 1280 × 720 y 390 × 844: navegación legible, tarjetas alineadas y footer ordenado; móvil sin desbordamiento horizontal. DOM confirma correo correcto, cero enlaces telefónicos en el footer y animación `home-enter`. Capturas en `storage/previews/ui-review-20261027/`. CSS versionado `20261027-03`.

## Corrección y comprobación visual del fondo — 27 de octubre de 2026

Revisión visual solicitada por el usuario en navegador a 1280 × 720. Se confirma que el degradado anterior ocupaba aproximadamente 40 px por lado y apenas se distinguía. Se amplía a un ancho adaptable de 128–320 px y se incrementa el contraste azul/teal sobre fondo neutro; las tarjetas blancas quedan claramente separadas. En móvil se mantienen desactivados los degradados.

Verificado mediante capturas después de recargar y cerrar el anuncio: márgenes visibles, títulos legibles, tres columnas y proporción intacta del slider. Captura guardada en `storage/backups/home-background-visual-20261027/inicio-validado.png`. Sistema de diseño aprobado; CSS versionado `20261027-02`.

## Fondo lateral de Inicio — 27 de octubre de 2026

Se elige orientación visual discreta, sin recorrido ni controles adicionales. Nuevo contenedor `.home-learning-backdrop` exclusivo de Inicio público: degradados estáticos azul tenue en los márgenes laterales, ancho ligado al contenedor existente y centro blanco. En móvil se retira la decoración. No añade imágenes, solicitudes, animaciones ni cambios al tamaño del slider o a la cuadrícula.

Recursos afectados versionados `20261027-01`. Validación por código del sistema de diseño, slider, popup, sintaxis/imports y CSS generado; sin validación visual.

## Favicon independiente — 27 de octubre de 2026

Creada la ruta `public/assets/image/favicon/favicon.png`, inicialmente con una copia del logo actual. El shell referencia únicamente este archivo para el icono de pestaña, con versión automática basada en su fecha de modificación. Logo del portal, sidebar y acceso conservan la ruta original. README incluye nombre, extensión y tamaño recomendado para reemplazar el favicon.

Validación: sintaxis PHP y comprobación HTTP del HTML y de la imagen publicada, comparada con el archivo local. Sin validación visual.

## Presentación UX de Inicio — 26 de octubre de 2026

Mejora acotada a Inicio público: encabezado con orientación breve, acceso al catálogo con forma de cápsula, tarjetas con bordes suaves y acción «Ver capacitación», flechas alineadas y respuesta a hover/foco. Se mantienen seis tarjetas, tres columnas en escritorio, dos en tablet y una en móvil, sin descripciones en las cards. El estado vacío ocupa la cuadrícula completa. Animaciones desactivadas cuando se solicita movimiento reducido.

Se conservan intactos el carrusel, su proporción 16:5/16:8, los puntos superpuestos y la rotación de cinco segundos. Reutiliza tokens y componentes existentes; estilos limitados a `.home-learning`. Recursos modificados versionados `20261026-16`.

Validación por código: sistema de diseño, sintaxis PHP/JS e imports, capacitaciones, catálogo, slider y popup aprobados; CSS generado sincronizado. Sin validación visual.

## Restauración del slider — 26 de octubre de 2026

Retirado el límite de altura por viewport que alteraba el encuadre. Se restauran las proporciones anteriores: 16:5 en escritorio y 16:8 en móvil. Se conservan los puntos superpuestos sin fondo. CSS versionado `20261026-15`.


## Inicio compacto e indicadores sin fondo — 26 de octubre de 2026

Recursos afectados `20261026-14`. Indicadores superpuestos sin tarjeta, fondo, desenfoque ni sombra de contenedor; solo puntos semitransparentes y progreso. Retirado «EXPLORA. APRENDE. CRECE.». Altura del carrusel adaptada al viewport en escritorio y menor espacio antes del catálogo, conservando seis tarjetas, tres columnas y tamaños de cards. Móvil conserva su proporción y disposición responsive. La fila completa depende del alto disponible y longitud de títulos; no se fuerza zoom ni se oculta contenido. Sin validación visual.


## Popup en cada ingreso y dimensiones del slider — 26 de octubre de 2026

Recursos `20261026-12`. Retirado el bloqueo del popup por sesión/revisión: aparece al montar Inicio en cada visita; cerrar no inicia un bucle ni abre duplicados. La navegación fuera de Inicio sigue cerrándolo.

El formulario del slider muestra dimensiones reales en píxeles de imágenes nuevas y guardadas; recomienda 1920 × 600 px / 16:5, mínimo aconsejado 1600 × 500 px. Avisos específicos de resolución insuficiente y proporción diferente, adaptados al ajuste de recorte o imagen completa. Se mantiene el archivo original y la posibilidad de guardar imágenes de otras proporciones. Maneja carga/error de imagen y descarta respuestas de vistas desmontadas.

Pruebas DOM de popup y slider: retorno con mismo ID/revisión aun con marca antigua en sessionStorage, no duplicación, lectura de 800 × 800 y aviso, cambio recorte/espacios, imagen 1920 × 600 sin advertencia. Sin validación visual.


## Flujo de publicación, portadas y exámenes flexibles — 26 de octubre de 2026

Implementado en XAMPP, recursos `20261026-11`. Respaldo previo: `storage/backups/training-flow-*`. Sin revisión visual en navegador.

- Guardar examen abre el paso Publicar; publicación confirmada vuelve al listado y muestra un toast destacado, accesible y cerrable. Los errores conservan el formulario.
- Portada propia con vista previa local, carga multipart y vuelta a portada PDF/PPT; referencias protegidas, visibilidad según publicación y exclusión del conteo de materiales.
- Cards públicas/administrativas con títulos de mayor jerarquía y sin descripción; el detalle mantiene el texto. Previsualizaciones de eventos completas, sin recorte.
- Exámenes de una o más preguntas; agregar/quitar conserva edición y confirma el retiro de preguntas con contenido. Cantidad real mostrada al participante. Nota proporcional sobre 20 con dos decimales en BD y exportación.
- Autor por versión tomado de la sesión; guardar sin cambios o cambiar el horario conserva su autor. Versiones antiguas sin registro se identifican explícitamente.
- `TrainingEditorMigration` aplicada y repetida dos veces: misma huella de portadas, exámenes y resultados antes/después de repetir.

`tools/check-local.ps1` completo correcto: 344 comprobaciones PHP con rollback, 102 HTTP, pruebas DOM del flujo y regresiones, diseño con 979 reglas delimitadas, 64 PHP, 39 JavaScript y 118 imports. Se probaron intentos reales en transacción con 1, 2, 3 y 11 preguntas, autor no falsificable por payload, notas decimales y reenvío idempotente. `tests/media-http.py`: 21 comprobaciones, carga real de portada en un curso temporal en borrador, privacidad y rechazo de publicación sin PDF/PPT; cuenta, archivo y curso de prueba eliminados al finalizar.


## Filas de capacitaciones en Inicio — 26 de octubre de 2026

Inicio muestra hasta seis capacitaciones publicadas recientes: dos filas de tres en escritorio, conservando la adaptación responsive y el acceso al catálogo completo. Texto del editor actualizado. Verificación de sintaxis JavaScript, sin revisión visual. Entrada y módulos afectados versionados `20261026-10`.


## Categorías destacadas y enlaces de popup — 26 de octubre de 2026

Recursos `20261026-9`. Etiqueta de categoría compartida en tarjetas públicas y administrativas, con icono, color corporativo sólido y contraste del sistema. Popup con selección exclusiva de destino interno publicado o URL externa HTTP/HTTPS; se conserva el modo informativo. Externos en pestaña nueva, previsualización sin navegación y validación en cliente/servidor. No requiere migración.

Pruebas: DOM de popup (alternar interno/externo, guardado, preview, URL inválida), catálogo, 294 verificaciones PHP con rollback, 967 reglas de diseño delimitadas y validación de sintaxis/imports. Sin validación visual.


## Navegación e Inicio del panel — 26 de octubre de 2026

Recursos `20261026-8`. Los submenús del sidebar sincronizan su expansión con el destino: al salir se cierran y las rutas hijas despliegan el grupo correspondiente, conservando el sidebar montado. Slider de Inicio pasa a Eventos (`#admin/eventos/slider`), con alias para rutas anteriores y permiso superadmin conservado.

Inicio incorpora un gráfico de barras horizontales con escala, cifras, leyenda, filtro local por tipo y acceso a cada publicación. Solo suma vistas acumuladas de contenido publicado; incluye estados vacíos/cero y respeta movimiento reducido. Métricas con iconos, seguimiento de evaluaciones y accesos rápidos utilizan los tokens existentes. No se incorporaron consultas adicionales ni cambios de base de datos.

Verificación: `tools/check-local.ps1` completa correcta. Incluye pruebas DOM del cierre de ambos submenús, navegación entre grupos, alias del slider, permisos, escala del gráfico, filtros, ceros, borradores excluidos y actualización por actividad. 964 reglas CSS delimitadas; 63 PHP, 39 JavaScript y 118 imports válidos; 286 verificaciones PHP con rollback y 98 HTTP. Sin validación visual.


## Popups y slider administrables — 26 de octubre de 2026

Implementación en `C:\xampp\htdocs\la-academia`, recursos `20261026-7`. Sin validación visual, según indicación del usuario.

- Popups guardados como lista con CRUD, controles compactos con SVG y nombres accesibles, confirmación de eliminación y activación exclusiva reforzada por transacción y restricción única en BD.
- Vista previa local antes de guardar; tamaño compacto/estándar, recorte opcional y enfoque, título opcional y destino guiado. La presentación se comparte con el popup público.
- Slider exclusivo de superadmin: carga, edición, orden, ocultar/mostrar y eliminar; preview proporcional de escritorio/móvil y ajuste completo/recorte. Las imágenes existentes se importaron conservando orden y archivos; dos ejecuciones posteriores de la migración conservaron la misma huella de los datos.
- Suite `tools/check-local.ps1` completa correcta: diseño, fuentes, navegación, catálogo, capacitaciones, exámenes, resultados, actividad, caché, popup y slider. 286 comprobaciones PHP transaccionales y 97 HTTP; datos de prueba revertidos.
- `tests/media-http.py`: 17 comprobaciones HTTP adicionales con cargas multipart reales y cuenta superadmin temporal; edición, privacidad, listado y eliminación. No se publicó contenido de prueba; se eliminaron cuenta y archivos temporales al finalizar.
- Fuentes: 63 PHP, 39 JavaScript y 118 imports válidos. Sistema de diseño: 946 reglas delimitadas, tokens resueltos y comprobaciones de contraste semántico.
- Respaldo previo de código en `storage/backups/media-panel-*`. Guías actuales: [Popups](POPUP-INICIO.md) y [Slider](SLIDER-INICIO.md).


## Popup dentro de Eventos, edición y vista previa — 26 de octubre de 2026

- Popup movido a Eventos → Popup de Inicio, con flecha integrada y submenú reutilizable. Solo superadmin ve y abre esta sección. La ruta anterior redirige; administradores sin permiso vuelven a Inicio sin consultar la API privada.
- Presentación sin borde exterior, cierre flotante, imagen completa y título opcional. Sin título no se genera cabecera ni franja vacía; se conserva nombre accesible.
- Vista previa de los valores actuales antes del primer guardado. Usa una URL local para la imagen seleccionada, no carga archivos al backend ni cambia la configuración. Enlaces de preview no navegan. Las URLs locales se liberan al cambiar archivo, guardar o desmontar.
- Enlace guiado: informativo, evento o capacitación. Selector limitado a publicaciones activas. Backend rechaza enlaces arbitrarios y destinos no publicados/inexistentes. Si se retira una publicación ya enlazada, el popup público queda informativo.
- Suite completa correcta: 239 comprobaciones PHP transaccionales, 91 HTTP, pruebas DOM nuevas de preview sin escritura/peticiones, títulos vacíos, destinos, submenú, permisos y liberación de recursos; pruebas previas de cursos, exámenes, sesiones, slider, caché y actividad conservadas. 59 PHP, 38 JS, 113 imports, 24 enlaces Markdown y 905 reglas CSS delimitadas.
- Recursos `20261026-6`; caché de servidor invalidada. No se modificó el anuncio configurado ni se requirió migración. Sin validación visual.


## Popup de Inicio exclusivo para superadmin — 26 de octubre de 2026

- Nueva sección «Popup de Inicio» en el sidebar del superadmin. Formulario con título accesible, imagen JPG/PNG/WEBP hasta 8 MB, enlace HTTPS o ruta pública interna, etiqueta del botón, estado y previsualización del contenido guardado.
- API pública devuelve solo el popup activo; lectura/guardado administrativos protegidos por superadmin en rutas y agente. CSRF, carga validada, transacción y retirada de la imagen recién cargada ante fallo. Una configuración activa como máximo; no se reactivaron avisos ni banners retirados.
- Migración de `home_popup` aplicada dos veces y verificada: permanece desactivado, sin imagen y con revisión cero. No se publicó contenido de muestra. Imagen activa accesible por la ruta de archivos existente; desactivada deja de ser pública. Archivo vinculado protegido contra eliminación y excluido del informe de huérfanos.
- Popup automático únicamente en Inicio público, una vez por sesión de pestaña/revisión; cierre al navegar, Escape, botón y clic exterior. Foco contenido/restaurado, scroll bloqueado, imagen completa, estilos basados en tokens y adaptación a móvil.
- Pruebas DOM nuevas de gestión, permisos de navegación, carga, activar/desactivar, preview, rutas, cierre, sesión y errores. 232 verificaciones PHP transaccionales y 91 HTTP correctas; suite existente de sesiones, cursos, exámenes, resultados, slider, caché y actividad correcta. 59 PHP, 38 JS, 113 imports y 24 enlaces Markdown; 905 reglas CSS delimitadas.
- Recursos `20261026-5`. Ver `POPUP-INICIO.md`. Sin validación visual; pruebas de BD revertidas.


## Publicaciones visibles y capacitación sin examen — 26 de octubre de 2026

- Inicio filtra la misma colección para el total de visitas y el listado: capacitaciones `published` y eventos `active=1`. Borradores, archivados y eventos inactivos no aparecen ni suman; sus contadores históricos se conservan en BD. Los totales administrativos de cursos/eventos siguen indicando sus respectivos publicados.
- Editor: un curso con material y el check sin examen se puede publicar. Si existen cambios pendientes, la acción dice «Guardar y publicar»: primero guarda el modo y demás campos, luego publica. Si falla el guardado no publica; si falla la publicación conserva el modo guardado y permite reintentar. Durante ambas operaciones se bloquean campos y envíos duplicados. Se muestra el requisito pendiente o la disponibilidad para publicar con/sin examen.
- Backend revisado: `CourseCreationTool` conserva el modo multipart; `CourseRepository` permite publicar `exam_required=0` con material. El registro de visitas ya rechaza contenido no publicado. No fue necesario modificar estas reglas ni migrar datos.
- Pruebas nuevas: borradores/inactivos con visitas históricas, retirada de publicación tras actualizar Inicio, creación multipart sin examen, reapertura del editor, publicación sin preguntas, save→publish ordenado, fallo previo sin publicar, reintento y doble clic. Casos PHP adicionales para nueva capacitación con material y modo cero como texto.
- Recursos `20261026-4`. Sin validación visual ni modificación de publicaciones reales.


## Slider compacto y carga estable — 26 de octubre de 2026

- Indicadores compactos: círculos de 12 px dentro de objetivos de 24 × 44 px; cápsula de 40 px. Se mantiene el llenado lineal de 5 segundos. Hover ya no oculta el progreso de la cápsula activa.
- El cursor sobre la imagen y la selección con ratón/tacto ya no detienen el avance. Se conserva pausa por teclado, pestaña oculta y movimiento reducido. La animación inicia explícitamente en tiempo cero y se sincroniza al restaurar una página.
- CSS/JS revalidan cada carga con `max-age=0, must-revalidate`; recursos versionados `20261026-3`. HTTP comprobado: HTML `no-store`, CSS/JS actualizados y respuestas condicionales 304 para reutilizar contenido sin cambios.
- Pruebas correctas: slider (incluye hover, clic con foco, teclado, restauración y montajes consecutivos), sistema de diseño, 83 comprobaciones HTTP, sintaxis/imports y sincronización de CSS generado. Sin validación visual.


## Sistema de diseño e indicadores — 26 de octubre de 2026

- Inventario inicial de componentes y estilos documentado en `DISENO.md`. Paleta institucional conservada; tokens centralizados de color, semántica, tipografía, espaciado, radios, sombras, tamaños, interacción, tiempos y breakpoints.
- Fuentes en `public/frontend/design/`; CSS generado y limitado a `.academy-ui`. Controles, tablas, formularios, alertas, tarjetas, badges, diálogos, carga, vacíos, paginación y navegación con propietarios comunes. Retiradas reglas antiguas del slider, navegación duplicada y declaraciones sobrescritas; composiciones particulares conservadas.
- SVG compartidos, rutas de navegación, confirmaciones de archivo/eliminación, restauración de iconos al terminar una operación, foco de formularios y errores visibles dentro del diálogo. Calendarios nativos conservados.
- Componente reutilizable `carousel-indicators.js`: puntos grises, cápsula activa, llenado lineal de 5 segundos y avance automático. Encogimiento/expansión suaves, clic y teclado, pausa con foco/cursor/pestaña oculta, movimiento reducido y limpieza al navegar. Sin flechas laterales ni contador textual.
- Suite `tools/check-local.ps1` correcta: 57 PHP, 36 JavaScript, 105 imports, 22 enlaces Markdown, 208 comprobaciones de negocio, 82 HTTP, 9 de caché y 10 de carpeta del slider. DOM de exámenes, sesión, edición, resultados, catálogo, actividad y visitas correcto.
- Pruebas adicionales del diseño: 888 reglas delimitadas, variables resueltas, paleta centralizada, contraste semántico, confirmaciones/cancelación, foco, tablas, carga y recuperación de errores. Slider comprueba animación lineal de 5000 ms, cambio de imagen, pausa, teclado y cancelación de efectos al desmontar.
- Sin navegador ni validación visual. Datos de pruebas revertidos. Recursos `20261026-2`; respaldo anterior en `storage/backups/design-system-20261026-074956`.


## Inicio y avisos agrupados — 23 de octubre de 2026

- Inicio rediseñado con totales, listado de visitas por publicación, filtro local, barras relativas al contenido más visitado y estados de evaluación. Actualización manual y por cambios en la campana, preservando el filtro.
- Notificaciones `content.views` cada 10 visitas por publicación. Incremento y evento atómicos, clave única, enlaces a capacitación/evento y respeto de la deduplicación por sesión. Sin migración de BD ni reconstrucción histórica.
- 208 verificaciones de negocio correctas, incluidos límites 9→10, 10→11, 19→20, duplicados y destinos. Prueba DOM del Inicio: totales, orden, filtro sin peticiones, escape, actualización y desmontaje. Validación sin navegador.
- Recursos `20261023-7`; respaldo `storage/backups/home-milestones-20261023-144909`.


## Capacitación sin examen, progreso y resultados — 23 de octubre de 2026

- Guardar cambios deshabilitado sin diferencias reales; se compara título, categoría, descripción y requisito de examen con normalización de extremos. Deshacer la edición vuelve al estado deshabilitado. Portada también requiere una selección diferente. Publicar exige cambios guardados y los requisitos del modo elegido.
- Línea de preparación: Información, Material, Evaluación y Publicación; refleja el modo sin examen y el archivo seleccionado durante la creación.
- Check «Capacitación sin examen» disponible al crear y editar. Permite publicar con material, oculta evaluación pública y bloquea intentos pendientes/nuevos sin borrar historial. Volver a exigir evaluación inexistente devuelve el curso a borrador. Reportes/exportación conservan notas y muestran «No requerido» cuando corresponde.
- Migración `CourseExamMigration` aplicada dos veces; los cursos existentes conservan `exam_required=1`. No se modificaron preguntas ni resultados existentes.
- Selector de resultados, Exportar y Actualizar alineados con diseño adaptable. Cambio de examen sin remontar la página, altura estable, indicador de carga y transición de opacidad cancelable; respeta movimiento reducido. URLs/exportación sincronizadas con la selección; respuestas antiguas y posteriores al desmontaje ignoradas.
- `tools/check-local.ps1` correcto: 57 PHP, 33 JavaScript, 92 imports y 21 enlaces Markdown. 201 comprobaciones de negocio, 81 HTTP, 9 de caché y 10 de carpeta de slider. Pruebas DOM de edición, reversión, errores, duplicados, curso sin evaluación, cambio rápido de examen y exportación correcta, además de todas las pruebas anteriores. Datos temporales revertidos.
- Recursos `20261023-6`; respaldo `storage/backups/course-flow-20261023-144016`. Sin navegador ni validación visual.


## Cambio de sesión, controles y visitas — 23 de octubre de 2026

- Logout abre Inicio del portal y limpia el contenido de los formularios privados. Login siempre abre Inicio del panel. Rutas de usuarios/sedes sin permiso vuelven al inicio; una respuesta 403 en una subsección actualiza la sesión y regresa al inicio.
- Cierre de formularios con SVG centrado y espacio reservado, botones de acción uniformes, eventos del panel en cuadrícula adaptable de tres/dos/una columnas.
- Visitas de eventos y capacitaciones visibles solo en administración. Deduplicación por sesión; no cuentan listas ni revisiones administrativas. Incremento atómico sin tocar fechas editoriales, generar notificaciones ni invalidar caché pública. Datos anteriores no tienen historial de visitas reconstruido.
- Migración de contadores aplicada dos veces, sin sustitución de registros.
- Validación no visual: 56 PHP, 32 JavaScript, 90 imports, 21 enlaces Markdown; 183 comprobaciones de negocio y 81 HTTP. Pruebas de sesión con DOM real simulado: superadmin → logout → admin, rutas restringidas, limpieza privada y retorno al Inicio. Pruebas de métricas: apertura de galería/curso, CSRF, exclusión administrativa, contador ausente del portal y tolerancia a fallos de red. Suite previa de exámenes, caché, slider, catálogo y actividad también correcta. Datos de pruebas revertidos.
- Recursos `20261023-5`. Respaldo `storage/backups/navigation-visits-20261023-142437`. No se usó el navegador ni se realizó validación visual.


## Evaluación en ventana y disponibilidad — 23 de octubre de 2026

- Datos del participante, examen y resultado en un diálogo separado del visor PDF/PPT. Una pregunta a la vez, navegación, progreso, revisión y reloj basado en el plazo del servidor. Cerrar y reabrir conserva respuestas mientras se permanezca en el curso; no pausa el tiempo. Reintento de un envío incierto usa el mismo token y respuestas.
- Apertura y duración obligatorias al guardar; cierre opcional. Control manual de disponibilidad con actividad e invalidación de caché. Desactivar bloquea inicio y envío pendiente de todas las versiones, conserva notas y permite exportación. Nueva versión hereda el estado; reactivar respeta horarios.
- Migración `enabled` aplicada dos veces correctamente, sin sustituir datos ni modificar fechas/duración históricas.
- Panel con tarjetas, portadas, resumen de examen y acceso a gestión/resultados. Activar o desactivar no recarga el editor ni descarta preguntas sin guardar.
- `tools/check-local.ps1` correcto: 53 PHP, 31 JavaScript, 86 imports, 21 enlaces Markdown; pruebas de slider, catálogo, navegación, actividad, estado/modal del examen y administración DOM; 10 verificaciones de carpeta, 9 de caché, 162 de negocio y 77 HTTP. Pruebas transaccionales revertidas. Sin validación visual.
- Las pruebas del slider ya no dependen de la antigua imagen `workers.jpg`: usan una imagen sintética temporal y verifican por HTTP las imágenes actuales de la carpeta.
- Recursos `20261023-4`. Respaldos en `storage/backups/exam-dialog-20261023-095015` y `storage/backups/exam-schedule-20261023-095857`. jsdom solo en `tests`, con lockfile e instalación documentada en operación local.


## Ajuste del portal — 23 de octubre de 2026

Retirados los enlaces redundantes a Inicio dentro de Capacitaciones y Eventos; el enlace del encabezado se conserva. Eventos públicos en tres columnas (dos hasta 1100 px y una hasta 680 px), con imágenes completas de proporción uniforme. Slider reducido de 16:6 a 16:5 en escritorio y de 16:9 a 16:8 en móvil, conservando ancho y rotación. «Ver catálogo» ahora es un botón primario con icono SVG. Estilos de eventos delimitados al catálogo público. Recursos `20261023-2`; comprobaciones no visuales.


## Última actualización — slider por carpeta y catálogo, 23 de octubre de 2026

- Carpeta activa `public/assets/slider`, descubrimiento automático por nombre, lista JS retirada. La imagen existente se conserva como primera imagen de la carpeta.
- API `/slider` probada por HTTP: alta y retiro de archivo detectados, listado sin caché y URLs verificadas con espacios, tildes, `&` y `#`. El archivo de prueba se retiró al finalizar.
- Pruebas de descubrimiento: carpeta ausente/vacía, orden natural, formato real, rechazo de archivos ajenos, URL codificada, versiones y cambios de contenido de la carpeta.
- Carrusel probado con lista vacía, una y varias imágenes, precarga, temporizador de seis segundos y limpieza al salir.
- Catálogo compacto: filtros locales sin nuevas peticiones, estado vacío estable, paginación reiniciada y animación de opacidad cancelable; respeta movimiento reducido.
- Validación no visual: 53 PHP, 29 JavaScript, 79 imports y 21 enlaces Markdown correctos; 10 verificaciones de carpeta, 9 de caché, 143 de negocio y 74 HTTP correctas. También pasan slider, catálogo, navegación y actividad. No se realizó inspección visual por petición del usuario.
- Recursos `20261023-1`. Respaldo: `storage/backups/slider-catalog-20261023-093513`.

## Limpieza previa — 23 de octubre de 2026

Limpieza de mantenimiento sin validación visual y sin migraciones de BD:

- Retirado el repositorio de escritura de avisos manuales del código activo. Las pruebas insertan únicamente datos históricos dentro de su transacción de prueba; mantienen comprobaciones de permisos y referencias de archivos heredados.
- Conservados la tabla histórica y los endpoints de compatibilidad (410 / lista vacía).
- Documentadas ubicaciones actuales, esquema y migraciones, materiales, portadas, conversores y API. Corregidos los procesos antiguos de banners y lectura de PowerPoint.
- `tools/runtime/` y residuos de Python excluidos de Git. Los conversores instalados se conservan.
- Formateados el registro de dependencias, coordinadores de examen/reporte y ciclo de Inicio. Retirados imports de iconos no utilizados.
- Health incluye `file_previews`. El comando estándar incluye también las pruebas de navegación y actividad.
- Respaldo previo: `storage/backups/maintenance-20261023-092523`.

Resultado de `tools/check-local.ps1`: 51 archivos PHP y 30 JavaScript con sintaxis correcta, 80 imports y 18 enlaces Markdown válidos; pruebas de slider, navegación y actividad correctas; 9 verificaciones de caché, 142 de negocio y 74 HTTP correctas. Datos de pruebas revertidos, sin contenido de prueba persistente.

Las categorías por nombre y la portada sin FK se conservan; reforzarlas requiere una migración separada. El formato de código se mejoró en los puntos editados, no se reformateó toda la aplicación. La generación de preguntas por IA sigue descartada.

## Registro histórico

Las secciones siguientes corresponden a entregas anteriores. Sus rutas, funciones y recuentos pueden haber sido reemplazados por el estado vigente descrito arriba.


Fecha: 1 de octubre de 2026. Entorno: Windows, XAMPP, PHP 8.2, MySQL/MariaDB local.

## Resultados

| Comprobación | Resultado |
|---|---|
| Sintaxis y referencias | 42 PHP, 22 JavaScript, 64 imports y 9 enlaces Markdown correctos |
| Pruebas sin BD | 50 verificaciones correctas; incluidas en la suite completa |
| Suite PHP con BD | 80 verificaciones correctas; registros temporales revertidos |
| Contrato HTTP con cuenta migrada | 49 comprobaciones correctas, incluidos PDF e imagen públicos y redirección anterior |
| Comparación de filas | Las 12 tablas coinciden íntegramente con el origen, mediante huellas de todas sus filas ordenadas |
| Almacenamiento | 4 archivos coinciden por SHA-256 y existen para las cuatro referencias de BD |
| Datos heredados | 1 evento publicado con una imagen; 0 cursos publicados sin material/examen |
| Archivos huérfanos | 0 referencias sin asociación con más de un día de antigüedad |
| Navegador | Inicio, catálogo, curso, login, panel y galería cargaron sin errores de consola; cierre de sesión ocultó la campana |

Las cantidades corresponden a los datos existentes al migrar, no son métricas incrustadas en la aplicación. La suite HTTP consulta materiales publicados, por lo que su número de comprobaciones puede variar con el contenido.

Recuento migrado: 2 cuentas, 1 sede, 10 categorías, 2 cursos (incluye archivados), 4 archivos, 1 examen, 1 participante, 1 intento, 1 anuncio, 1 evento, 1 relación de galería y 0 registros de control de login. El resumen administrativo omite cursos archivados.

El evento heredado no fue retirado del portal ni se inventaron imágenes para completarlo. Administración muestra un aviso y exige tres imágenes al volver a guardar como publicado.

En viewport móvil de 390 × 844 se revisaron portada, panel y galería: ancho de contenido y ancho disponible coincidieron en 375 px (15 px de barra de desplazamiento), sin desbordamiento horizontal. La imagen de galería y su miniatura cargaron, y cerrar devolvió el foco al botón de apertura. En portada de 1440 × 900, ambos anchos coincidieron en 1425 px. Se restableció el tamaño normal del navegador al terminar. Esta muestra no certifica todas las combinaciones de pantalla y contenido.

## Cobertura automatizada

- `tests/check_source.py`: sintaxis PHP y JavaScript, imports de módulos, vínculos de documentación y nombres antiguos fuera de migraciones/datos.
- `tests/run.php --unit`: contrato del router, estados 404/405, IDs estrictos, diez preguntas, explicación opcional y nota sobre veinte.
- `tests/run.php`: categorías, publicación con archivo/examen, rollback de creación incompleta, versionado, dos intentos, reenvío idempotente, banner asociado, galería, permisos, revocación de sesión y control de login.
- `tests/http_smoke.py`: recursos estáticos, API y envelopes, cookie, permisos, protección de fuentes, tipos de cuerpo, límite JSON, errores de campos y CSRF.
- `tests/http_smoke.py --login-stdin`: recibe credenciales JSON por entrada estándar, comprueba la cuenta migrada y accesos administrativos, rechazo de PDF inválido sin crear curso y cierre de sesión. No guarda credenciales.

Las pruebas PHP usan una transacción exterior y savepoints; al terminar revierten los registros de prueba. No escriben archivos de contenido. La prueba HTTP autenticada solo intenta una carga inválida que debe revertirse. Los contadores autoincrementales pueden avanzar.

## Validación visual manual

Las pruebas de código/HTTP no sustituyen revisar distribución ni interacción en navegador. Comprobar en 1440, 1024, 768 y 390 px:

1. Inicio: identidad La Academia, máximo un banner, sin campana anónima, menú y pie sin superposición.
2. Catálogo: búsqueda, categorías, paginación y estado vacío.
3. Curso: selección de documentos, visor PDF, lectura de PPT/PPTX y evaluación.
4. Evaluación: campos rojos, selección completa, nota, segundo intento y bloqueo del tercero.
5. Eventos: abrir galería, avanzar/retroceder, Escape y retorno del foco.
6. Administración: archivo junto a los datos al crear curso; examen de diez preguntas con explicación opcional.
7. Sedes/usuarios: controles disponibles solo para superadministración; sesión invalidada al desactivar una cuenta.
8. Teclado: foco visible, navegación, diálogos y tamaños táctiles.

## Límites

No se realizaron pruebas de carga masiva, recuperación de desastres, lectores de pantalla ni acceso externo. El PDF utiliza el visor del navegador; PPT/PPTX muestra texto extraído y no garantiza la distribución original. Sedes no son aislamiento entre organizaciones. Ver [AUDITORIA.md](AUDITORIA.md).


## Rediseño visual — 1 de octubre de 2026

- Referencia visual: Cisco Learning Network. Cabecera blanca, navegación azul, espacios amplios, tarjetas con imagen y botones redondeados; identidad propia de La Academia.
- Logo original incorporado desde `assets/image/logo/Logotipo de la acedemia.png`. La copia de trabajo y XAMPP coinciden por SHA-256. Sus márgenes transparentes se encuadran con CSS, sin alterar el archivo.
- Carrusel con fotografía dominante, título breve y sin enlaces, descripciones extensas ni botón Continuar. Controles con etiquetas accesibles; comienza detenido y permite reproducción, flechas y teclado. Si solo hay una diapositiva, oculta los controles.
- Banners con imagen: diseño que conserva la imagen completa y coloca el título debajo. El mensaje y la capacitación relacionada se conservan como datos de gestión.
- Logo compartido en encabezado, pie, acceso y panel; estilos comunes para catálogo, curso, eventos y administración.
- Validación de código: 42 PHP, 24 JavaScript, 69 imports y 9 enlaces Markdown. Suite PHP: 80 comprobaciones correctas (incluye 50 sin BD). HTTP: 35 comprobaciones correctas.
- Navegador: logo e imágenes cargados; carrusel sin enlaces; cambio de diapositiva por controles y teclado; búsqueda sin resultados y apertura del curso; formulario previo a evaluación mantiene su acción funcional con el texto «Iniciar evaluación».
- Vista de 390 × 844: 375 px de contenido/disponible, sin desbordamiento horizontal, en portada y panel. Vista de 1440 × 900: 1425 px de contenido/disponible en portada. No se enviaron evaluaciones durante la revisión visual.


## Separación del backend y carrusel automático — 1 de octubre de 2026

Esta sección sustituye el comportamiento de reproducción manual descrito en el rediseño anterior.

- Carrusel automático cada seis segundos, sin botón de reproducción, puntos o contador. Conserva flechas y teclado. Pausa durante interacción con el carrusel o con la pestaña oculta; limpia eventos y temporizador al abandonar la página. Avance automático observado en navegador entre bienvenida y eventos.
- Pie único sin logo: datos de contacto de la instalación y derechos reservados a ACEAPERU. Los contactos históricos se omiten de la documentación pública. El año lo calcula el servidor.
- 44 archivos PHP y 24 JavaScript con sintaxis válida; 67 imports y 8 enlaces Markdown comprobados. La validación también exige namespace/ruta coherentes, raíz sin PHP y un único PHP público.
- 87 verificaciones PHP con transacción revertida. Incluyen ruta HTTP no sustituible por query string, evaluación pendiente de un curso archivado rechazada, resultado completado conservado e imagen de banner protegida frente a eliminación.
- 45 verificaciones HTTP correctas: portal, CSS, módulos, logo, teléfono/correo, API, descargas, cookie, CSRF y acceso denegado a rutas internas, plantillas antiguas y entradas PHP retiradas.
- Apache sirve solo assets, frontend, .htaccess e index.php. Las 33 clases del backend están en C:\xampp\la_academia_data\backend\src. No quedan los directorios PHP anteriores en htdocs/la-academia.
- Informe de archivos sin asociación de más de un día: 0. No se eliminaron materiales reales.
- Vista móvil 390 × 844: 375 px disponibles y de contenido, sin desbordamiento horizontal; pie completo visible y sin logo.
- La publicación inicial encontró la carpeta web abierta por otro proceso. Se ajustó el sincronizador para conservar ese directorio, respaldar/verificar su contenido y retirar únicamente archivos ausentes de public/. La publicación y la comprobación de salud finalizaron correctamente.

Los respaldos y las utilidades históricas se conservan; no se ejecutan ni se publican como parte de la aplicación. Permanecen los límites funcionales señalados en AUDITORIA.md, salvo correcciones expresamente documentadas.


## Footer, sesiones, avisos, periodos y Excel — 2 de octubre de 2026

- Migración aditiva e idempotente: `opens_at`, `closes_at`, `duration_minutes`; datos existentes sin fechas se conservan. El sincronizador aplica migraciones antes de publicar.
- Suite PHP: 122 verificaciones con transacción revertida. Incluye ID de sesión y CSRF renovados, caducidad de 1 hora, sondeo sin renovación de actividad, avisos activos/ocultos y acceso anónimo rechazado.
- Exámenes: fechas obligatorias, fecha imposible y rango inválido rechazados; apertura/cierre y minutos comprobados en inicio/envío; idempotencia posterior al cierre; historial separado por versión. Exportación de 1003 participantes frente a vista limitada a 1000.
- Caché: 9 verificaciones de acierto, vencimiento, invalidación, corrupción, fallos y modificación concurrente durante la carga. HTTP confirma HIT en lecturas repetidas y BYPASS en sesión.
- HTTP local: 53 comprobaciones sin autenticación, incluyendo protección de Excel/avisos y política de caché. Número variable según archivos públicos.
- XLSX: lector independiente openpyxl abre el ZIP generado; comprueba 1200 filas, ceros iniciales, nota cero frente a pendiente vacío, fechas, texto que comienza por `=` sin fórmula, congelación de encabezado y autofiltro.
- Navegador autenticado: selector de examen, consulta de participantes, clic de exportación con respuesta Apache 200 XLSX (2677 bytes en la primera revisión), campana actualizada y campos obligatorios del periodo. Tras cambiar a un enlace nativo, el navegador integrado descargó el archivo; openpyxl confirmó 1 participante, su nota 18/20, 1 envío, DNI de texto y fecha tipada. No se abrió Microsoft Excel.
- Móvil 390×844: ancho disponible/contenido 375/375 px; diferencia entre final del panel y comienzo del footer: 0 px. Tabla con desplazamiento horizontal interno.
- No se enviaron evaluaciones ni avisos reales y no se modificó el periodo del examen existente durante la revisión visual.


## Unificación física — 2 de octubre de 2026

La ubicación vigente reemplaza la distribución descrita en secciones históricas: `C:\xampp\htdocs\la-academia` contiene todo el proyecto, configuración y archivos privados. El backend ya no depende de `C:\xampp\la_academia_data`. La web conserva su URL y publica únicamente los recursos permitidos por `.htaccess`.

El procedimiento verifica huellas del código y de los archivos privados, conserva la instalación anterior como respaldo no público y valida las rutas protegidas antes de retirar las copias activas antiguas. La base de datos no se traslada ni se reemplaza.


El slider utiliza archivos estáticos definidos en `public/frontend/config/slider.js`; ya no usa banners de BD ni fotografías de eventos. La prueba `tests/slider.mjs` valida archivos configurados, HTML sin leyendas/enlaces/contador y estados de cero/varias imágenes. La suite PHP valida que la API rechace crear banners y que el panel liste solo avisos.

Resultado final de la unificación: 126 verificaciones PHP, 9 de caché, 69 HTTP y prueba del slider correctas. La prueba XLSX independiente valida 1200 filas. Código y archivos privados cotejados por SHA-256; orígenes activos retirados y comprobación HTTP repetida después del retiro. Se mantuvieron los datos existentes y las pruebas revirtieron sus registros temporales.

Portada revisada en navegador: logo actual e imagen del slider cargados, una imagen configurada, sin leyendas ni enlaces en el carrusel. Las referencias del logo se ajustaron al nombre real `Logotipo la academia.png`. El panel administra avisos, no banners. Solo queda un proyecto activo en C:\xampp\htdocs\la-academia.

Las reglas de reescritura conservan las rutas con espacios y heredan la protección antes de las reglas de carpetas anidadas. Referencia técnica: https://httpd.apache.org/docs/2.4/rewrite/flags.html


## Navegación continua y footer del panel — 2 de octubre de 2026

Esta sección actualiza el comportamiento del panel descrito en revisiones anteriores.

- Footer oculto únicamente dentro del panel autenticado; soporte y derechos reservados permanecen en el portal y en el acceso.
- Sidebar desde el borde superior, encabezado a su derecha y logo solo en el sidebar del panel. El menú mantiene su variante móvil.
- Navegación entre secciones conservando sidebar, encabezado y campana. La vista anterior permanece mientras carga la siguiente; se evita reemplazar todo el panel por un mensaje de carga.
- Caché de lecturas en memoria: capacitaciones administrativas/eventos 30 s, avisos 15 s y categorías 60 s; máximo 64 consultas. No se guardan respuestas privadas en localStorage ni caché HTTP.
- Resultados, resumen, exportaciones, exámenes, detalles de edición, usuarios, sedes y notificaciones mantienen consulta al servidor. Guardados, subidas y cambios de sesión invalidan la caché de navegación.
- `node tests/navigation-cache.mjs`: correcto. Verifica vencimiento, deduplicación, copias independientes, límite, respuestas concurrentes tras invalidar, reintento tras fallo, guardados, subidas, cierre/inicio de sesión, cambio de rol, expiración y lecturas que deben permanecer actualizadas. Usa HTTP simulado, sin credenciales ni cambios en BD.
- Comprobación de sintaxis y referencias: 48 PHP, 27 JavaScript, 70 imports y 7 enlaces Markdown correctos.
- El usuario confirmó que ya realizó la validación del panel y solicitó únicamente actualizar los Markdown. La nueva revisión visual automatizada del panel autenticado no se completó porque la sesión había vencido; se respetó su indicación de no continuar esa revisión.


## Capacitaciones y notificaciones de actividad — 3 de octubre de 2026

- Capacitaciones como entrada del panel; Resultados como subopción con selección de examen en la URL. Avisos manuales retirados del frontend y API heredada con respuesta 410.
- Migración de `activity_log` aplicada en XAMPP sin borrar datos. Incorpora resultados existentes y cierres mediante claves únicas.
- Suite PHP: **138 verificaciones correctas**, registros temporales revertidos. Incluye envío idempotente, cierre único con hora real, enlaces a la versión del examen y al evento, recurso eliminado, guardado sin cambios y reversión conjunta de contenido/actividad.
- HTTP: **69 verificaciones correctas** sin autenticación. Rutas privadas y campana protegidas. La suite PHP comprueba además el acceso autenticado al feed por el agente y el rechazo anónimo.
- Código: **49 PHP, 26 JavaScript, 66 imports y 10 enlaces Markdown** correctos.
- `tests/navigation-cache.mjs` correcto: incluye invalidación por revisión nueva de actividad y conservación de caché cuando la revisión no cambia.
- `tests/activity-ui.mjs` correcto: menú anidado, retiro de Avisos, selección directa del examen, exportación presente y rechazo de identificadores inválidos.
- El navegador confirmó la redirección de `#admin` a `#admin/capacitaciones` y mostró el formulario de acceso. No había una sesión activa para repetir la revisión visual del panel, la campana y los clics autenticados; no se usaron ni modificaron credenciales.
- No se enviaron exámenes reales ni se modificaron eventos reales durante las pruebas. Los cambios de backend se comprobaron con transacciones revertidas.

Comportamiento y límites actuales en [ACTIVIDAD.md](ACTIVIDAD.md): sondeo visible cada 30 segundos y caché del feed de 15 segundos; cierres detectados en la siguiente consulta, sin servicio de fondo cuando el panel está cerrado.


## Corrección de Inicio, submenú y lectura — 3 de octubre de 2026

Inicio vuelve a ser el resumen general. Capacitaciones conserva su enlace y tiene un chevrón SVG integrado en la misma fila, con fondo/estado compartidos y control de expansión independiente. Resultados también es accesible desde Capacitaciones; abrir una ruta de resultados despliega el submenú. La estructura permanece montada al navegar.

La notificación completa abre su destino y se retira automáticamente de los pendientes, sin acciones interiores. Su identificador queda leído por usuario en este navegador y no reaparece si cambia el texto o enlace. Las pruebas de interfaz y caché pasan, incluyendo recarga, aislamiento entre usuarios y sincronización entre pestañas. Sintaxis y referencias: 49 PHP, 28 JavaScript, 71 imports y 11 enlaces Markdown.


## Revisión de interfaz — 4 de octubre de 2026

Alcance confirmado: portadas de materiales, eventos y pulido visual. Se canceló la generación automática de exámenes; no se agregó integración de IA ni se instaló Ollama. El editor manual de exámenes se conserva.

- Corregido el buscador del catálogo, que quedaba comprimido a 390 px: categoría y búsqueda ahora se distribuyen en filas completas. Verificado sin desbordamiento horizontal a 390 y 1366 px.
- Controles de imágenes y cierre de 44 × 44 px, indicadores más fáciles de pulsar y estados de foco/hover coherentes. Se evita que el clic sintético posterior a un deslizamiento abra accidentalmente la publicación.
- Slider de imágenes completas: controles superpuestos cuando hay varias imágenes, sin franja adicional, textos promocionales, reproducción ni contador. Actualmente solo hay una imagen configurada; los controles se ocultan. La rotación de seis segundos sigue disponible al configurar más imágenes.
- Verificados en navegador: búsqueda sin recarga, cambio de imagen en el listado, apertura en la imagen elegida, flechas de teclado, Escape y devolución del foco al botón de origen. Portada real del material visible en Inicio.
- No se validaron visualmente pantallas administrativas autenticadas en esta revisión porque la sesión pública estaba cerrada; las pruebas existentes de navegación, submenú y notificaciones pasaron.
- Comprobaciones: `check_source.py` (52 PHP, 29 JavaScript, 77 imports y 11 enlaces Markdown), `slider.mjs`, `navigation-cache.mjs` y `activity-ui.mjs`: correctas.
- Versión de recursos: `20261004-1`. Copia previa del ajuste visual en `storage/backups/ui-20261004-225348`.


### Ajuste de galería y slider — 4 de octubre de 2026

Flechas y cierre unificados con SVG centrados. Eliminados los contadores de fotos tanto del listado como del visor. Miniaturas centradas, con tamaño flexible y salto de fila según el espacio; imagen principal centrada y completa. El banner de Inicio ahora llena su ancho mediante recorte proporcional (sin deformación). Avanza cada seis segundos con varias imágenes y ya no se detiene al pasar el ratón; conserva la pausa por foco de teclado y al ocultar la pestaña. La configuración actual contiene una única imagen, por lo que la rotación visible necesita una segunda entrada en `public/frontend/config/slider.js`. Versión de recursos `20261004-2`.


### Limpieza de Inicio — 4 de octubre de 2026

Retirado el bloque promocional «Aprendemos juntos» de Inicio y todas sus reglas CSS exclusivas (`event-entry` y descendientes), incluidas las adaptaciones móviles. Recursos afectados actualizados para evitar servir el bloque desde caché. El acceso general a Eventos permanece en la navegación.


## Auditoría y refactorización del backend — 28 de octubre de 2026

La evidencia vigente de esta intervención está en [el informe](AUDITORIA-BACKEND-2026-10-27.md) y la salida completa (evidencia local excluida de Git). Las secciones anteriores describen verificaciones históricas.

- 355 comprobaciones PHP existentes, 50 regresiones nuevas, importación CSV/XLSX sintética, 45 comprobaciones concurrentes en 25 pares de procesos, 107 contratos HTTP y 21 pruebas HTTP de medios.
- Exportación de 1200 filas sintéticas, 14 rutas privadas de Apache bloqueadas y dos entradas públicas operativas; suites JS/DOM/diseño/caché existentes.
- Cada suite MySQL usa una base temporal distinta, sin copiar filas reales. Archivos, sesiones, caché y servidor HTTP aislados. No usar las antiguas instrucciones de pruebas directamente sobre la base activa.
- Reproducción: `powershell -File tools/check-local.ps1`; regresión acotada: `php tests/isolated.php backend-regression.php`.
- PHP 8.2.12 y MySQL 8.0.46 en la conexión inspeccionada; las menciones históricas de MariaDB no describen esta conexión. PostCSS actualizado a 8.5.32: npm audit sin vulnerabilidades conocidas.
- Sin cambios de esquema ni reparaciones de datos reales. La propuesta de índices está pendiente y no se ejecutó. No se realizó una nueva validación visual manual de pantallas autenticadas; la cobertura frontend es automatizada DOM/contrato.


## Cierre de gravedad alta — 28 de octubre de 2026

Resultados actuales (evidencia local excluida de Git) y [alcance](CORRECCIONES-ALTAS-2026-10-28.md): PHP 8.2.35 activo en Apache/CLI; servidor HTTP de pruebas con la misma matriz SQL limitada de producción. 355 comprobaciones PHP, 60 regresiones, 45 de concurrencia, 117 contratos HTTP y 21 de medios, más las suites frontend/importación/exportación/Apache.
