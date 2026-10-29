# Sistema de diseño de La Academia

Fuente activa: `C:\xampp\htdocs\la-academia`. Actualizado el 27 de octubre de 2026.

## Inventario y criterio

La interfaz existente utiliza JavaScript modular, plantillas HTML, diálogos nativos y dos hojas CSS acumulativas (`styles.css` y `learning.css`). Ya había componentes de tarjetas, galería, examen, formularios, sidebar y notificaciones, pero repetían colores, tamaños, botones y reglas de navegación.

Se conserva la identidad azul, blanco y verde azulado, el logotipo institucional, los botones redondeados y las composiciones de cursos, eventos y evaluaciones. Se centralizan los elementos compartidos y se mantienen las geometrías particulares de cada módulo en sus composiciones. Los controles tienen un mínimo común de 44 px, los textos usan una escala y los colores semánticos cuentan con contraste comprobado.

## Fuentes y generación

| Archivo | Responsabilidad |
| --- | --- |
| `public/frontend/design/tokens.json` | Colores, fuentes, tamaños, espacios, bordes, radios, sombras, estados, capas, tiempos y breakpoints. |
| `public/frontend/design/foundation.css` | Normalización y jerarquía dentro de `.academy-ui`, foco y movimiento reducido. |
| `public/frontend/design/components.css` | Contratos visuales de controles, formularios, tablas, tarjetas, badges, alertas, diálogos, toast, carga, vacíos y paginación. |
| `public/frontend/design/navigation.css` | Header, sidebar, menú adaptable y campana. |
| `public/frontend/design/carousel.css` | Slider de imágenes e indicadores de progreso. |
| `public/frontend/design/layouts/` | Composiciones particulares: visor, evaluaciones, publicaciones, panel y catálogo. |
| `public/frontend/design/pages/` | Estilos exclusivos de una pantalla; comienza con el dashboard administrativo. |
| `public/frontend/components/ui.js` | Iconos SVG, breadcrumbs, paginación, mensajes, diálogos, confirmaciones, carga de botones y mejoras accesibles. |
| `tools/build-design.mjs` | Genera y limita las reglas al contenedor de la aplicación; también genera breakpoints/tiempos para JavaScript. |

No editar directamente `public/assets/design-system.css`, `styles.css`, `learning.css` ni `public/frontend/design/runtime.js`: son generados y están marcados como tales. Se entregan compilados; Apache no necesita Node para servir la aplicación.

### Geometría de los gráficos de Inicio

Inicio aprovecha todo el ancho disponible con comparación y detalle lado a lado. Vistas y Participación usan barras horizontales desde cero; Promedios muestra el rango mínimo–máximo y un punto para la media sobre 0–20. Cada página contiene hasta cinco capacitaciones; cambiar de página conserva la escala y los totales del conjunto filtrado. Los rankings Top 3/5/10 son gráficos compactos: notas en columnas de escala 0–20 y conteos en dos columnas de barras. Pulsar un conteo del ranking abre su página y detalle. Evaluaciones y accesos ocupan una franja inferior. En espacios estrechos, la comparación y el detalle se apilan sin ocultar registros ni bloquear el desplazamiento.

Las anchuras de barras, posiciones de rangos y alturas de notas se aplican con propiedades DOM (`element.style.height`, `left`, `width`) después de cada renderizado, filtro, selección y actualización. Las plantillas contienen valores numéricos en atributos `data-chart-*`; no contienen atributos `style`, que la política CSP de producción bloquea al interpretar HTML. Se conserva `style-src 'self'`. [Comportamiento documentado por MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr).

`node tests/dashboard.mjs` comprueba 12/20 = 60%, extremos 0/20, filtros, actualización, paginación, selección desde rankings y geometría; además rechaza estilos incrustados en las plantillas. jsdom no calcula dimensiones ni aplica CSP. Para validar píxeles en un navegador real: ejecutar `node tests/dashboard-browser.mjs`, abrir la dirección local indicada y pulsar **Comprobar los tres gráficos**. La página utiliza datos sintéticos, los módulos y CSS reales y la política CSP leída del servidor; no consulta MySQL. Comprueba también las cinco filas, el Top 10 compacto y el desbordamiento horizontal. Revisar con anchos de escritorio y móvil. Detener el servidor de pruebas al terminar.

Desde la carpeta del proyecto:

```powershell
npm ci --prefix tests --ignore-scripts
node tools/build-design.mjs
node tools/build-design.mjs --check
& './tools/check-local.ps1'
```

PostCSS y jsdom son dependencias de desarrollo dentro de `tests`. Para cambiar una dimensión compartida, editar el token y regenerar. El shell versiona automáticamente los cuatro recursos de entrada con `filemtime`; los imports internos conservan versiones explícitas hasta su migración controlada.

## Contratos reutilizables

| Función | Contrato |
| --- | --- |
| Botones | `.button.primary`, `.button.white`, `.button.danger`; `.link-button` para acción de texto. Usar `type="button"` fuera de envíos. |
| Inputs, selectores y calendarios | `.field` con etiqueta que envuelve su control; fechas nativas `date`/`datetime-local`, conservando accesibilidad y validación del navegador. No se añade otro calendario con comportamiento distinto. |
| Formularios | `.form-grid`, `.full`, `field()` y `attachValidation()`; errores asociados al control, `aria-invalid`, resumen y mensajes existentes. |
| Tablas | `.table-scroll` con tabla semántica; región desplazable por teclado y encabezados con `scope="col"`. |
| Modales | `modal(html)` para formularios. Diálogo nativo, título accesible, foco inicial en un campo y devolución al disparador. Galería y examen conservan su composición especializada. |
| Confirmación | `await confirmAction(mensaje,{label:'Eliminar'})`; Cancelar recibe el foco inicial, Escape cancela. Se utiliza para eliminar eventos, archivar cursos y quitar materiales. |
| Alertas/toast | `alert(mensaje,tipo)` y `toast(mensaje,tipo)`; tipos `success`, `error`, `warning`, `info`. Errores urgentes con `role="alert"`. |
| Tarjetas | `.panel`, `.course-card`, `.ui-card`; composición específica aparte, superficie/borde/radio compartidos. |
| Badges | `.badge` y `data-tone`; etiquetas textuales además del color. `status()` conserva los estados de publicación. |
| Navbar/sidebar | Componentes existentes y una única fuente `navigation.css`; enlaces de destino separados del botón para expandir resultados. |
| Breadcrumbs | `breadcrumbs([{label,href},{label}])`, con ruta accesible y página actual. |
| Paginación | `pagination()` mantiene los IDs usados por los filtros locales y deshabilita extremos. |
| Carga | `.loading`, `aria-busy` y `busy(boton,tarea)`; evita duplicados y restaura los nodos originales, incluidos iconos y listeners. |
| Vacíos | `empty(mensaje,accion)`; mensaje descriptivo e icono compartido. |
| Iconos | `icon(nombre)` desde `ui.js`; SVG decorativo con `aria-hidden`, tamaño y trazo consistentes. Los botones de solo icono necesitan nombre accesible. |

Ejemplo:

```js
import {busy,confirmAction,toast} from '../components/common.js?v=20261026-3';
if (await confirmAction('¿Eliminar este evento?', {label:'Eliminar'})) {
  await busy(button, async () => {
    await eliminarEvento();
    toast('Evento eliminado.');
  });
}
```

## Slider e indicadores Expanding Dots

`public/frontend/components/carousel-indicators.js` es el componente reutilizable. Recibe etiquetas y un intervalo opcional; expone `select`, `setPaused`, `focus` y `dispose`. Su callback `onSelect(index,manual)` permite sincronizar cualquier carrusel con los puntos. La geometría vive en `carousel.css`.


Las imágenes siguen en `public/assets/slider/`, descubiertas automáticamente por la API y ordenadas por nombre. No hay que declarar cada ruta en JavaScript.

Un indicador inferior por imagen, sin flechas laterales ni contador textual. El punto activo se expande suavemente en una cápsula; durante los 5 segundos de exposición, su barra se llena linealmente; después cambia automáticamente la imagen y comienza el siguiente punto. También permite elegir una imagen con clic o teclado. Sin imágenes no se muestra; con una imagen se ocultan indicadores y no se programa rotación.

Los indicadores compactos utilizan objetivos de 24 px de ancho y 44 px de alto, círculos de 12 px y una cápsula activa de 40 px. CSS/JS se almacenan con revalidación en cada carga (`max-age=0, must-revalidate`), aprovechando respuestas 304 cuando no cambian.

El tiempo está centralizado en `motion.carousel`. Temporizador y animaciones se pausan con foco de teclado o pestaña oculta; el cursor y la selección con ratón/tacto mantienen el avance automático, y se limpian al navegar. Movimiento reducido desactiva avance y animación automáticos; la selección manual permanece disponible. La siguiente imagen se precarga.

## Popup de Inicio

El anuncio utiliza `home-popup.css` y `components/home-popup.js`, con tokens, diálogo nativo y cierre accesible. Su configuración está separada del carrusel y de la campana. Ver [Popup de Inicio](POPUP-INICIO.md).

## Reglas de mantenimiento

- No añadir otra paleta ni repetir estilos de `.button`, `.field`, modal o navegación en una página.
- Usar `var(--ds-...)`. Los tamaños de documento, proporciones de imagen y geometrías particulares pertenecen al módulo; no todos son tokens compartidos.
- Declarar responsive con `@media (--screen-mobile)` u otro breakpoint del catálogo. El generador lo resuelve a píxeles; JavaScript importa `screens` del runtime generado.
- Toda hoja generada se limita a `.academy-ui`. Los controles se estilizan por sus clases y contexto; no se introducen reglas de inputs/tablas/diálogos que modifiquen otros módulos indiscriminadamente.
- No copiar ni editar CSS generado. Las composiciones conservan excepciones necesarias para el visor, galería y examen; cambios posteriores deben integrarse en su propietario, no añadirse como parches al final.
- Confirmar acciones destructivas antes de llamar a la API. Los permisos y validaciones siguen en backend.

## Comprobación

`tests/design-system.mjs` verifica delimitación de selectores, resolución de variables, paleta central, contraste semántico, confirmaciones, cancelación, foco de formularios, carga/recuperación de botones y tablas accesibles. `tests/slider.mjs` cubre indicadores, avance automático, navegación, pausas y desmontaje. La suite general conserva pruebas de sesiones, exámenes, edición, filtros, caché, negocio y HTTP.

Verificación por código y DOM simulado, sin navegador ni validación visual. No sustituye una revisión manual de tamaños, recortes, lectura con tecnologías de asistencia o comportamiento en dispositivos reales.

## Cabecera y pie públicos

`public/frontend/design/public-shell.css` concentra la presentación del header fuera del panel y del footer de Área de TI. Reutiliza colores y escalas del sistema. Las animaciones de entrada de Inicio se definen en `layouts/learning.css`, solo para usuarios sin preferencia de movimiento reducido. Contacto del footer: `support_email` en `backend/config/application.php`; contenido en `backend/views/footer.php`.

El comportamiento del header público (buscador conjunto, transparencia al desplazar y animación del logo al clic) está centralizado en `public/frontend/components/public-header.js`. Sus estilos viven en `public-shell.css`; los datos proceden exclusivamente de los listados públicos existentes. El buscador móvil se despliega desde la lupa y admite teclado y Escape.
