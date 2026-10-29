# Auditoría técnica y plan de arquitectura · 27 de octubre de 2026

## Resultado ejecutivo

La instalación activa es `C:\xampp\htdocs\la-academia`. La aplicación no necesita una reescritura: ya dispone de una separación funcional entre interfaz modular, API, agentes, servicios, repositorios, configuración, almacenamiento privado, documentación y pruebas. La intervención recomendada es incremental y verificable.

No se encontraron rutas privadas publicadas, módulos JavaScript de producción desconectados ni una segunda instalación activa. Tampoco se justifica eliminar archivos funcionales. Los principales riesgos están en la acumulación de CSS de página, el orden de la cascada, los recursos gráficos pesados y el volumen histórico de respaldos. Cambiar de forma masiva la cascada sin revisión visual tendría un riesgo mayor que el beneficio inmediato.

Esta auditoría toma como fuente el código activo, la configuración de Apache, las rutas, los imports, la generación del sistema de diseño y las pruebas. La revisión visual automatizada no estuvo disponible porque el uso del navegador local estaba deshabilitado en la sesión; por eso los cambios de cascada amplia quedan expresamente fuera de esta fase.

## Tecnología y dependencias

| Capa | Tecnología activa | Observación |
| --- | --- | --- |
| Servidor | Apache de XAMPP, PHP 8.2.12 | `.htaccess` restringe el acceso a red local y publica solo portal, API y recursos. |
| Datos | MariaDB 10.4.32 | La configuración privada vive en `storage/config.php`, fuera de publicación. |
| Interfaz | HTML generado por PHP, JavaScript ES Modules, CSS nativo | No hay framework de interfaz ni empaquetador obligatorio en ejecución. |
| Backend | Clases PHP con autocarga propia | Agentes, servicios, repositorios, HTTP, soporte y migraciones tienen responsabilidades diferenciadas. |
| Diseño | Tokens JSON, PostCSS y generador propio | Node se usa para generación y pruebas, no para servir el portal. |
| Pruebas | Node 24, jsdom 26.1.0, PostCSS 8.5.6, PHP y Python | `openpyxl 3.1.5` queda declarado en `tests/requirements.txt`. |
| Documentos | LibreOffice y Poppler locales | El runtime se conserva en `tools/runtime/`; es operativo, no código fuente. |

No existe Composer ni una dependencia PHP externa en ejecución. La autenticación sin límite de intentos está habilitada únicamente para la instalación local; si el portal deja de estar restringido por `Require local`, esa decisión debe revisarse antes de exponerlo.

## Inventario y trazabilidad

La revisión distinguió código fuente de recursos generados, datos operativos e historia:

- 40 módulos JavaScript de producción: todos son alcanzables desde `public/frontend/app.js`.
- 67 archivos PHP en el alcance de código y pruebas revisado; `public/index.php` es el único PHP público.
- 8 fuentes CSS antes de esta reorganización; las salidas generadas sumaban aproximadamente 171 KB.
- Los módulos JavaScript sumaban aproximadamente 199 KB sin minificar.
- `tools/runtime/` contiene cerca de 19 700 archivos de LibreOffice y Poppler; no debe confundirse con código duplicado.
- `storage/` contiene cerca de 10 400 archivos operativos, vistas previas y respaldos. `storage/` y `archive/` están bloqueados por Apache y excluidos del control de fuentes.
- Los respaldos e historia ocupan aproximadamente 0.47 GB y deben administrarse con una política de retención, no borrarse desde una refactorización.

## Hallazgos priorizados

| Prioridad | Ubicación | Hallazgo | Impacto | Riesgo de corrección | Decisión |
| --- | --- | --- | --- | --- | --- |
| P0 | Publicación HTTP | No se detectó exposición de `backend`, `storage`, `tests`, `docs`, `tools`, `archive` ni acceso directo a `public`. | Seguridad conservada. | Bajo | Mantener pruebas HTTP. |
| P1 | `design/layouts/base.css`, `design/layouts/learning.css`, `design/components.css` | 63 combinaciones selector/propiedad tienen valores distintos en el mismo contexto. Sobresalen enlaces, selects de toolbar, opciones, cierre de publicación, contenedor y tarjetas. | La apariencia depende demasiado del orden de carga y dificulta cambios locales. | Alto si se corrige en bloque. | Consolidar por componente/página en fases con revisión visual; no reordenar las hojas todavía. |
| P1 | `backend/views/shell.php` | Las versiones principales de CSS/JS eran números manuales distribuidos. | Una corrección podía quedar oculta por caché. | Bajo | Corregido con `filemtime`, conservando el orden de carga. |
| P1 | `design/layouts/learning.css` | Mezclaba catálogo, publicaciones, examen, reportes y dashboard en unas 65 KB. | Propiedad y mantenimiento poco claros. | Bajo por bloque aislado. | El dashboard se extrae a `design/pages/admin-dashboard.css`; continuar módulo por módulo. |
| P1 | `assets/learning.css` en la raíz | Copia CSS fuera de `public` y sin referencias activas. La URL `/assets/learning.css` es reescrita al archivo generado de `public`, no a esta copia. | Confusión durante mantenimiento. | Bajo, pero eliminar es destructivo. | Confirmado como no usado; proponer traslado recuperable a `archive/` en una fase de limpieza. |
| P2 | Imágenes de logo y favicon | Ambos archivos son idénticos y pesan aproximadamente 581 KB cada uno. | Transferencia y decodificación innecesarias; el favicon no está optimizado. | Bajo | Sustituir el favicon por PNG cuadrado optimizado y comprimir el logo sin cambiar identidad. |
| P2 | `public/assets/slider/` | Varias imágenes pesan aproximadamente 500–552 KB. | Inicio más lento, especialmente en móvil. | Bajo | Generar variantes WebP/AVIF y conservar originales hasta validar calidad. |
| P2 | `storage/backups/`, `archive/` | Gran cantidad de historia y copias de recuperación. | Crecimiento de disco y auditorías más lentas. | Alto si se borra sin política. | Definir retención, inventario y recuperación; no borrar automáticamente. |
| P2 | Imports ES Modules | 123 imports internos conservan una versión manual en la URL. Apache ya obliga revalidación. | Costo de mantenimiento y riesgo de versiones incongruentes. | Medio | Retirar gradualmente después de una prueba específica de caché; la entrada principal ya usa versión automática. |
| P2 | Plantillas dinámicas grandes | `admin-courses.js`, `admin-home.js`, `evaluation-dialog.js`, `admin-home-popup.js`, `admin-slider.js` y `admin-exam.js` concentran bastante marcado y comportamiento. | Cambios más difíciles de aislar. | Medio | Extraer solo componentes con contrato claro; evitar fragmentación artificial. |
| P3 | `public/assets/slider/LEEME.txt` | Archivo informativo público, no importado por la aplicación y sin datos sensibles. | Ruido menor. | Bajo | Mantener o mover a documentación cuando se revise el flujo de slider. |
| P3 | API de avisos retirada | Rutas administrativas responden 410 y la pública devuelve lista vacía por compatibilidad. | Código aparentemente obsoleto, pero clientes antiguos reciben una respuesta estable. | Alto si se elimina sin migración. | Conservar hasta retirar explícitamente el contrato documentado. |

## CSS, interfaz y accesibilidad

La línea base analizada tenía 1 241 reglas, 3 712 declaraciones y 986 selectores únicos. Había 275 selectores repetidos; muchos son variantes responsive, pseudoestados o capas intencionales, por lo que no deben eliminarse solo por coincidencia textual.

Aspectos correctos que se mantienen:

- Todos los selectores generados están limitados a `.academy-ui`.
- Colores, espacios, tipografía, radios, sombras, tiempos y breakpoints están centralizados en `tokens.json`.
- No existen bloques `<style>` activos.
- Solo existen tres atributos `style` y todos representan geometría calculada con datos en el dashboard: altura de barras, tramo del rango y marcador del promedio.
- Los cuatro usos de `!important` están limitados a `[hidden]` y preferencia de movimiento reducido.
- Hay foco visible, enlace de salto, controles nativos, diálogos con foco, nombres accesibles, regiones de tabla navegables y contraste semántico automatizado.
- Los puntos de quiebre se generan desde una sola fuente y el responsive móvil ya forma parte de la suite.

El orden actual `styles.css → learning.css → design-system.css` se conserva para no introducir diferencias visuales. La meta no es invertirlo sin más, sino retirar primero las declaraciones compartidas de los layouts y dejar los contratos en `components.css`; después podrá simplificarse la cascada con capturas comparativas.

## JavaScript, eventos y estado

No se detectó una segunda capa de peticiones: `public/frontend/api.js` centraliza `fetch` y el mapa de endpoints. Los listeners permanentes corresponden a módulos únicos del shell; los listeners de páginas y popups cuentan con limpieza al desmontarse. El observador del DOM también está centralizado.

Los componentes comunes ya cubren iconos, breadcrumbs, paginación, alertas, toast, modal, confirmación, estado ocupado, mensajes vacíos, visor de material, galería, examen, header y navegación administrativa. La mejora correcta es ampliar esos contratos cuando haya una repetición real, no convertir cada fragmento de una pantalla en un componente nuevo.

La prueba `tests/architecture.mjs` convierte estas condiciones en restricciones: todos los módulos deben ser alcanzables, no se aceptan bloques `<style>` ni eventos DOM0, y los estilos inline/`!important` se limitan a los casos justificados.

## Estructura objetivo

La estructura actual ya se aproxima al objetivo. Esta es la organización que debe guiar las siguientes extracciones:

```text
la-academia/
├── public/
│   ├── index.php
│   ├── assets/                    # salidas generadas e imágenes públicas
│   └── frontend/
│       ├── app.js                 # composición y rutas de interfaz
│       ├── api.js                 # único acceso HTTP
│       ├── components/            # comportamiento y UI compartidos
│       ├── pages/                 # controladores y vistas por pantalla
│       └── design/
│           ├── tokens.json
│           ├── foundation.css
│           ├── components.css
│           ├── navigation.css
│           ├── layouts/           # composiciones transversales
│           └── pages/             # estilos exclusivos de una pantalla
├── backend/
│   ├── config/
│   ├── routes/
│   ├── views/                     # shell y parciales PHP
│   ├── database/
│   ├── scripts/
│   └── src/
│       ├── Agents/
│       ├── Http/
│       ├── Migrations/
│       ├── Repositories/
│       ├── Services/
│       └── Support/
├── storage/                       # configuración, originales, caché y respaldos privados
├── docs/
├── tests/
├── tools/
└── archive/                       # historia recuperable, nunca ejecución
```

No se propone mover PHP por estética: las responsabilidades de backend ya están separadas. Tampoco se propone un directorio `static` adicional mientras `public/assets` cumpla ese contrato; dos nombres para el mismo propósito crearían duplicidad.

## Plan de implementación

### Fase 1 · aplicada y de bajo riesgo

1. Versiones automáticas de los cuatro recursos de entrada mediante fecha de modificación.
2. Declaración reproducible de la dependencia Python de pruebas.
3. Prueba de arquitectura integrada a la validación local.
4. Extracción del bloque aislado del dashboard a `design/pages/admin-dashboard.css` sin cambiar sus selectores.
5. Documentación de inventario, riesgos, estructura y decisiones.

### Fase 2 · requiere comparación visual

1. Crear una matriz por selector de los 63 conflictos y asignar propietario: componente, layout o página.
2. Consolidar primero enlaces, toolbar/select, opciones de examen y cierre de publicación.
3. Dividir `layouts/learning.css` por catálogo, detalle, publicación, examen y reportes.
4. Ejecutar capturas en escritorio, tableta y móvil antes y después de cada bloque.
5. Solo después, simplificar el orden de carga y retirar versiones manuales internas.

### Fase 3 · rendimiento y retención

1. Optimizar favicon, logo, portadas y slider con métricas de peso y calidad.
2. Definir retención de respaldos con restauración comprobada.
3. Extraer componentes de las plantillas JavaScript grandes cuando reduzcan repetición medible.
4. Evaluar carga diferida por ruta si el tamaño de interfaz crece de forma significativa.

## Criterios de aceptación

- `node tools/build-design.mjs --check` confirma salidas sincronizadas.
- `node tests/architecture.mjs` confirma grafo completo y límites de estilos/eventos.
- `tools/check-local.ps1` conserva pruebas de diseño, DOM, reglas PHP y seguridad HTTP.
- Ninguna limpieza elimina historia o datos operativos sin una lista aprobada y un mecanismo de recuperación.
- Toda modificación visual de la fase 2 se valida en los breakpoints principales y con navegación por teclado.

Este documento complementa la auditoría histórica `AUDITORIA.md`; no la reemplaza ni altera su trazabilidad.
