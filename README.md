# La Academia

**Plataforma de capacitación interna de ACEAPERU.** Reúne materiales de aprendizaje,
evaluaciones, políticas y comunicaciones institucionales en un portal web.
Permite a los capacitadores publicar contenido y consultar resultados, y a los
trabajadores acceder a los materiales y rendir evaluaciones con su DNI.

[Instalación](docs/PUBLICACION-GITHUB.md) · [Manual técnico](docs/DOCUMENTACION-TECNICA.md) · [Mapa de archivos](docs/MAPA-ARCHIVOS.md) · [Hosting y subdominios](docs/DESPLIEGUE-Y-SUBDOMINIOS.md)

## Qué permite hacer

| Módulo | Funciones |
| --- | --- |
| **Inicio** | Buscar capacitaciones, eventos y políticas; consultar publicaciones recientes; mostrar sliders y un popup institucional. |
| **Capacitaciones** | Crear cursos con o sin examen, agregar descripción y portada, cargar PDF/PPT/PPTX y videos MP4/WebM, publicar, editar, archivar o eliminar con confirmación. |
| **Lectura y reproducción** | Consultar documentos dentro de la página, ampliar el PDF, reproducir videos y descubrir otras capacitaciones de la misma sede en tarjetas laterales. |
| **Evaluaciones** | Configurar preguntas, nota mínima, duración, periodo de disponibilidad y entre 1 y 10 intentos. Calificar sobre 20 y conservar versiones anteriores. |
| **Resultados** | Consultar participantes, notas e intentos; revisar gráficos de vistas y rendimiento; exportar resultados por examen y versión a Excel. |
| **Colaboradores y sedes** | Gestionar trabajadores individualmente o mediante carga masiva CSV/XLSX, validar la sede y revisar los cambios antes de confirmar. |
| **Políticas** | Publicar documentos generales de la instalación con PDF, portada, título y descripción; permitir su lectura y descarga. |
| **Eventos y comunicación** | Publicar eventos con galerías; administrar sliders en una sola pantalla, ordenarlos por arrastre y configurar títulos, estilos y enlaces opcionales. |
| **Administración** | Gestionar accesos, roles, sedes y notificaciones automáticas de resultados, cierres de examen y visitas. |

Los videos admiten hasta **500 MB**, sujetos a la configuración del servidor.
La portada se elige al administrar la capacitación. Al alcanzar **90 % de
aciertos o más**, la evaluación deja de ofrecer nuevos intentos; la nota mínima
de aprobación la define el creador del examen.

## Quién utiliza el sistema

| Perfil | Alcance |
| --- | --- |
| **Trabajador** | Consulta el contenido publicado. Para rendir un examen, se identifica con su DNI; el servidor verifica que esté activo y pertenezca a la sede de la capacitación. |
| **Capacitador** | Administra capacitaciones, exámenes y resultados de su sede. También puede gestionar eventos y políticas generales. |
| **Superadministrador** | Administra todas las sedes, colaboradores y accesos, además de los sliders y popups de Inicio. |

El trabajador no necesita una cuenta administrativa. Los permisos del panel y
las reglas del examen se comprueban en el backend.

## Flujo de una capacitación

1. **Preparar:** crear la capacitación, asignar la sede, elegir si tendrá examen
   y cargar materiales y portada.
2. **Configurar y publicar:** definir preguntas y criterios de evaluación cuando
   corresponda, y publicar el contenido.
3. **Participar:** consultar los materiales y, si hay examen, confirmar el DNI
   antes de responder.
4. **Consultar resultados:** revisar las notas en el panel y descargar el reporte
   Excel de la versión correspondiente.

Después de la primera publicación, la modalidad con/sin examen se conserva.
La información y las preguntas se pueden actualizar manteniendo el historial.
[Guía de gestión de capacitaciones](docs/GESTION-CAPACITACIONES.md).

Las vistas de una capacitación se registran al abrir el material o comenzar a
reproducir el video, una vez por capacitación y sesión; se excluyen los accesos
administrativos. Son contadores de consulta, no constancias individuales de
lectura o de finalización de un video.

## Tecnología y requisitos

- **Backend:** PHP 8.2 o superior, API HTTP/JSON y MySQL 8.
- **Frontend:** JavaScript con módulos nativos, HTML y CSS adaptable a escritorio y móvil.
- **Servidor web:** Apache con reescritura de rutas; HTTPS para producción.
- **Documentos:** LibreOffice y Poppler para conversiones y vistas previas;
  LibreOffice también se utiliza para importar el padrón en XLSX.
- **Videos:** FFprobe para validar formatos y obtener sus características.
- **Desarrollo y pruebas:** Node.js, Python y PowerShell. Node.js no es necesario
  para servir la aplicación en producción.

## Organización del repositorio

```text
public/
  index.php                  Entrada única del portal y la API
  frontend/                  Páginas, componentes y fuentes del diseño
  assets/                    Estilos generados y recursos públicos
backend/
  routes/api.php             Rutas y permisos de la API
  src/                       Servicios, repositorios, validaciones y migraciones
  config/                    Configuración de aplicación y permisos SQL
  views/                     Plantillas HTML y pie de página
  database/schema.sql        Esquema inicial, complementado por migraciones
  scripts/                   Instalación, diagnóstico y mantenimiento
storage/
  config.example.php         Ejemplo de configuración sin credenciales reales
tools/                       Compilación de estilos, validaciones y despliegue
tests/                       Pruebas automatizadas y dependencias de desarrollo
docs/                        Manuales y documentación técnica
```

La configuración privada y los directorios de materiales, vistas previas,
caché y respaldos se crean en cada instalación y quedan fuera de Git.
El [mapa de archivos](docs/MAPA-ARCHIVOS.md) explica las responsabilidades del
código actual.

## Instalación y despliegue

1. Clonar el repositorio y preparar PHP, MySQL y las dependencias de medios que
   utilizará la instalación.
2. Crear una base vacía y completar la configuración privada tomando como base
   [config.example.php](storage/config.example.php). Separar la cuenta web de
   la cuenta de mantenimiento.
3. Ejecutar las migraciones y el diagnóstico con la configuración de mantenimiento:

   ```sh
   php backend/scripts/migrate.php
   php backend/scripts/check-database.php
   ```

4. Configurar Apache con **`public/` como raíz web**, HTTPS y permisos de escritura
   en el almacenamiento privado. La plantilla está en
   [public-directory.conf.example](tools/apache/public-directory.conf.example).
5. Completar la creación inicial del superadministrador mediante acceso local
   autorizado y cargar sedes, colaboradores y contenido desde el panel.

El `.htaccess` de la raíz corresponde al entorno local XAMPP y restringe el
acceso al equipo. Para hosting se debe aplicar la
[guía de arranque](docs/ARRANQUE-Y-HOSTING.md); subir los archivos sin configurar
el servidor no completa la instalación. La
[guía de publicación](docs/PUBLICACION-GITHUB.md) desarrolla estos pasos.

Para usar varios subdominios con el código actual, cada sede puede disponer de
una instalación con base de datos, archivos y sesiones independientes. La
separación automática de una base compartida según el dominio requiere desarrollo
adicional. [Despliegue por sede](docs/DESPLIEGUE-Y-SUBDOMINIOS.md).

## Desarrollo y validación

Instalar las dependencias de desarrollo desde la raíz del repositorio:

```sh
npm ci --prefix tests --ignore-scripts
python -m pip install -r tests/requirements.txt
```

Al modificar estilos, editar `public/frontend/design/` y generar los archivos
públicos con `node tools/build-design.mjs`. No editar directamente el CSS generado.

En el entorno Windows/XAMPP previsto por las herramientas:

```powershell
powershell -NoProfile -File tools/check-local.ps1
```

La suite valida sintaxis, imports, diseño, interfaces mediante DOM simulado,
contratos HTTP, roles, sedes, exámenes, archivos y base de datos. Las pruebas CRUD
utilizan bases temporales y datos sintéticos. Las rutas de PHP/Apache de las
herramientas locales deben adaptarse si se usa otro entorno.

El diagnóstico `php backend/scripts/check-database.php` es de solo lectura;
`--json` devuelve las comprobaciones en formato estructurado.
[Relaciones, índices y diagnóstico de la base](docs/BASE-DE-DATOS.md).

## Documentación por función

| Tema | Guía |
| --- | --- |
| Configuración y arquitectura | [Manual técnico](docs/DOCUMENTACION-TECNICA.md) |
| Backend e integración | [Contrato de la API](docs/API.md) |
| Creación, edición y eliminación de cursos | [Capacitaciones](docs/GESTION-CAPACITACIONES.md) |
| Materiales y portadas | [Documentos](docs/MATERIALES.md) · [Videos](docs/VIDEOS.md) |
| Biblioteca institucional | [Políticas](docs/POLITICAS.md) |
| Comunicación en Inicio | [Slider](docs/SLIDER-INICIO.md) · [Popup](docs/POPUP-INICIO.md) |
| Componentes y estilos | [Sistema de diseño](docs/DISENO.md) |
| Base de datos y mantenimiento | [Base de datos](docs/BASE-DE-DATOS.md) |

## Datos privados y soporte

Este repositorio contiene código, esquema, pruebas y documentación. Credenciales,
padrones, resultados, archivos cargados, sesiones y respaldos permanecen fuera
del repositorio. Antes de publicar cambios se puede comprobar el contenido
preparado en Git con `python tools/check-publication.py`.
[Tratamiento de información privada](SECURITY.md).

El contacto de **Área de TI** se configura mediante `support_email` o
`ACADEMIA_SUPPORT_EMAIL` en cada instalación.
