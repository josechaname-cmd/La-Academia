"""Generate reviewable source/endpoint inventories. No database access or application writes."""
from pathlib import Path
import collections
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/auditoria-backend'
OUT.mkdir(exist_ok=True)

# Method/access/status always come from the executable router, never this documentation map.
routes = json.loads(subprocess.run([r'C:\xampp\php\php.exe'], input="<?php echo json_encode(require 'backend/routes/api.php');", text=True, cwd=ROOT, capture_output=True, check=True).stdout)
contracts = {}
def add(agent, action, purpose, parameters, response, errors, consumers):
    contracts[(agent, action)] = (purpose, parameters, response, errors, consumers)

for agent, label, consumer in [('popup','Popup','pages/admin-home-popup.js'),('slider','Slider','pages/admin-slider.js')]:
    add(agent,'public',f'{label} visible','—','Popup o null' if agent=='popup' else 'Slide[]','—','pages/portal.js → components/home-popup.js' if agent=='popup' else 'pages/portal.js → components/home-carousel.js')
    add(agent,'list',f'Listar {label}','—',f'{label}[]','—',consumer)
    add(agent,'get',f'Consultar {label}','id (ruta)',label,'404',consumer)
    add(agent,'save',f'Crear/editar {label}',f'{label}Input; id solo al editar; file opcional multipart',label,'404,422',consumer+' (acción dinámica create/save)')
    add(agent,'status',f'Activar/desactivar {label}','id; active entero 0/1',label,'404,422',consumer+' (acción dinámica status)')
    add(agent,'delete',f'Eliminar {label}','id; cuerpo {}','{deleted:true}','404',consumer+' (acción dinámica delete)')
add(None,'health','Comprobar tablas requeridas','—','{app,status,database,environment}','500','Operación y pruebas; sin pantalla')
add('admin','session','Identidad y CSRF','—','Session','—','api.js/session → app.js, pages/auth.js')
add('admin','login','Iniciar sesión','email, password literal','Session','401,422,429','pages/auth.js (acción dinámica)')
add('admin','logout','Cerrar sesión','{}','Session','—','app.js')
add('admin','setup','Crear primer superadmin desde loopback','name 3–120, email, password 12 caracteres y ≤72 bytes','Session','403,409,422,429','pages/auth.js (setup_required)')
add('admin','announcements.public','Compatibilidad de avisos retirados','—','[]','—','Alias api.js; sin consumidor activo detectado')
for action in ['list','save','delete']:
    add('admin','announcements.'+action,'Contrato retirado','id de ruta cuando existe; demás campos ignorados','Siempre error 410','410','Compatibilidad heredada; sin consumidor activo')
add('admin','notifications.list','Actividad visible por sede','background=1 opcional (no prolonga sesión)','{items:Activity[],revision}','403','app.js, components/notification-center.js')
for action in ['events.public','events.list']:
    add('admin',action,'Listar eventos públicos' if action.endswith('public') else 'Listar eventos administrativos','—','Event[] con images[]','—','pages/catalog.js, components/public-header.js' if action.endswith('public') else 'pages/admin-events.js, admin-home.js, admin-home-popup.js')
add('admin','events.save','Crear/editar evento','EventInput; id al editar','{id}','404,422','pages/admin-events.js')
add('admin','events.delete','Eliminar evento y relaciones de galería','id; {}','{deleted:true}','404','pages/admin-events.js')
add('admin','image.upload','Cargar imagen independiente','file multipart JPG/PNG/WEBP ≤8 MB','Upload','422,500,503','components/event-photo-picker.js')
add('admin','categories.create','Registrar categoría','scope course/event; name 2–40/80','{id,scope,name}','409,422','components/category-picker.js')
for resource, response in [('users','User[]'),('sites','Site[]'),('personnel','Personnel[]')]:
    add('admin',resource+'.list','Listar '+resource,'—',response,'—','pages/admin-access.js'+(', pages/admin-courses.js' if resource=='sites' else ''))
add('admin','users.save','Crear/editar acceso','UserInput; id al editar; actor solo sesión','{id}','403,404,409,422','pages/admin-access.js')
add('admin','sites.save','Crear/editar sede','name 2–100, address 0–250, active 0/1; id al editar','{id}','404,409,422','pages/admin-access.js')
add('admin','personnel.import','Importar padrón por sede sin eliminar ausentes','file CSV/XLSX ≤8 MB; site_id','{total,created,updated,sites}','409,422,500,503','pages/admin-access.js')
for action, response in [('list','Course[] público'),('admin.list','Course[] administrativo'),('get','CourseDetail público'),('admin.get','CourseDetail administrativo')]:
    add('content',action,'Consultar capacitaciones','id' if action.endswith('get') else '—',response,'404' if action.endswith('get') else '—',{'list':'pages/portal.js, catalog.js, components/public-header.js','get':'pages/course.js','admin.list':'pages/admin-courses.js, admin-home.js, admin-home-popup.js','admin.get':'pages/admin-courses.js, admin-exam.js'}[action])
add('content','categories.list','Nombres de categorías','scope course/event; default course','string[]','422','pages/catalog.js, admin-courses.js, admin-events.js')
add('content','create','Crear curso con material inicial atómico','CourseInput + file multipart PDF/PPT/PPTX ≤50 MB','CourseDetail','403,422,500,503','pages/admin-courses.js')
add('content','save','Editar datos y requisito de examen','id; CourseInput','CourseDetail','403,404,422','pages/admin-courses.js')
add('content','publish','Publicar al cumplir requisitos','id; {}','CourseDetail','403,404,422','pages/admin-courses.js')
add('content','delete','Archivar sin borrar notas','id; {}','{deleted:true}','403,404','pages/admin-courses.js')
add('content','upload','Añadir material al curso','course_id; file multipart ≤50 MB','Upload','403,404,422,500,503','pages/admin-courses.js')
add('content','file.delete','Eliminar material/imagen no referenciada','id; {}','{deleted:true}','403,404,409','pages/admin-courses.js')
add('content','cover','Usar portada de material propio','id; file_id','CourseDetail','403,404,422','pages/admin-courses.js')
add('content','cover.upload','Cargar portada independiente','id; file multipart imagen ≤8 MB','CourseDetail','403,404,422,500,503','pages/admin-courses.js')
add('content','file','Servir original visible o autorizado','id; download opcional (presencia fuerza descarga)','Binario; Content-Disposition','403,404','api.js/fileUrl → galerías, portadas, visor, descargas, popups')
add('content','slides','Texto de PPT/PPTX','id','{name,slides:[{title,paragraphs}]}','403,404','Alias api.js; sin consumidor activo detectado; compatibilidad')
add('content','thumbnail','Servir primera página JPEG','id; v opcional para URL; If-None-Match','JPEG / 304','403,404,409','api.js/previewUrl → components/course-cover.js')
add('content','preview','Servir PDF derivado','id; v opcional; If-None-Match','PDF / 304','403,404,409','api.js/previewUrl → components/material-viewer.js')
add('content','preview.status','Estado del derivado','id','PreviewStatus','403,404','components/course-cover.js, material-viewer.js; dispara worker indirectamente')
add('content','preview.retry','Reencolar derivado fallido','id; {}','PreviewStatus','403,404,422','pages/admin-courses.js')
for kind in ['course','event']:
    add('view',kind,'Registrar apertura pública una vez por sesión','id; {}','{recorded:boolean}','404','components/content-views.js → pages/course.js / components/event-gallery.js')
add('exam','participant','Identificar participante activo antes del examen','course_id, dni string de 8 dígitos; máximo 30 consultas por IP/minuto','Participant','403,404,409,422,429','components/evaluation-dialog.js')
add('exam','start','Iniciar/reemplazar intento pendiente tras identificar','course_id, dni; consulta previa del mismo DNI/curso en esta sesión (15 min); revalida padrón','{token,attempt,version,participant,expires_at,server_time,questions}','403,404,409,422','components/evaluation-dialog.js')
add('exam','submit','Calificar y conservar envío idempotente','token hexadecimal 64; answers enteros 0–2, uno por pregunta','Grade','404,409,422','components/evaluation-dialog.js')
add('exam','get','Consultar versión con respuestas correctas','course_id','Exam o null','403,404','pages/admin-exam.js')
add('exam','save','Crear versión o cambiar periodo','course_id; ExamInput','Exam','403,404,422','pages/admin-exam.js')
add('exam','status','Habilitar todas las versiones del curso','course_id; enabled 0/1','Exam','403,404,422','pages/admin-exam.js')
add('report','summary','Resumen y estadísticas de última entrega','—','{courses,published,evaluations,score_averages}','403','pages/admin-home.js')
add('report','results','Último resultado por matrícula; con examen incluye pendientes','exam_id opcional; máximo 1000 filas','Result[]','403,404,422','pages/admin-reports.js')
add('report','exams','Listar versiones incluso archivadas','—','ReportExam[]','403','pages/admin-reports.js, admin-home.js')
add('report','export','Exportar todos los participantes del examen','id','Binario XLSX; sin límite de 1000','403,404','api.js/examResultsUrl → pages/admin-reports.js')

header = '''# Inventario verificable de endpoints

Generado desde `backend/routes/api.php`. Base `/la-academia/api/v1`. Los controladores conservan el nombre `Agents`; no son agentes de IA. Consumidores relativos a `public/frontend/`.

Todas las escrituras requieren sesión PHP y `X-CSRF-Token`, incluidas login/setup/intentos/vistas públicos. Se obtiene el token con GET /session. Los permisos `admin` aceptan capacitador/superadmin; cursos, exámenes, archivos privados, resultados y campana aplican la sede del capacitador. Eventos e imágenes de eventos siguen siendo compartidos porque no tienen propiedad por sede. Slider/popup/accesos/padrón/sedes exigen superadmin. Un archivo publicado sigue siendo público aunque el usuario tenga otra sede.

Contrato JSON existente: éxito `{data,meta:{request_id,api_version:"v1"}}`; error `{error:{code,message,fields:{}},meta}`. No se agregó envoltorio. Los binarios y 304 no usan JSON. Todos los errores tienen correlación; los 5xx muestran texto genérico. GET de health abre PDO pero no sesión. GET de campana puede insertar eventos de cierre; preview-status puede iniciar el worker.

Errores transversales: 401 sin identidad en rutas privadas, 403 rol/sede/CSRF, 404 ruta/identificador no encontrado, 405 con Allow, 400 JSON no válido, 413 JSON >1 MB, 415 contenido incorrecto, 422 campos, 500/503 infraestructura. La columna Errores añade conflictos específicos; no promete enumerar todos los fallos operativos del sistema. IDs positivos de ruta prevalecen sobre el cuerpo; en creación se rechaza id. Sin reintentos automáticos de escrituras.

| Método | Ruta | Propósito | Autorización | Parámetros | Éxito / data | Errores específicos | Controlador:acción | Consumidores |
|---|---|---|---|---|---|---|---|---|
'''
lines = [header]
machine=[]
for method, route, agent, action, access, status in routes:
    purpose, parameters, response, errors, consumer = contracts[(agent, action)]
    lines.append(f'| {method} | `{route}` | {purpose} | {access} | {parameters} | {status}: {response} | {errors} | {agent or "ApiKernel"}:{action} | {consumer} |\n')
    machine.append(dict(method=method,path=route,agent=agent,action=action,access=access,status=status,purpose=purpose,parameters=parameters,response=response,errors=errors,consumers=consumer))
lines.append('''
## Estructuras y validación

| Estructura | Campos / reglas |
|---|---|
| CourseInput | title 5–160, category registrada 2–40, description 10–1500; exam_required entero 0/1 opcional; site_id obligatorio para crear como superadmin, forzado a la sede de la sesión para capacitador. Creador no proviene del cliente. |
| Course / CourseDetail | id, site_id/site_name, created_by/creator_name, title/category/description, duration heredada nullable, status, fechas, exam_required, portadas/previews; list añade material_count y metadatos de examen; detail añade materials y exam sin claves. view_count solo administrativo. El contrato actual incluye columnas seleccionadas con c.*; no se retiraron silenciosamente. |
| ExamInput | questions lista no vacía; cada prompt 8–500, choices exactamente tres textos distintos 1–300, correct entero 0–2, explanation 0–1000 opcional. Preguntas no repetidas. opens_at obligatorio válido, closes_at nullable posterior a apertura, duration_minutes 1–1440. Hora America/Lima. |
| Exam | id, course_id, version, questions con clave solo administrativa, opens_at/closes_at/duration_minutes/enabled, created_at, created_by/creator_name. Cambiar solo periodo conserva versión; cambiar preguntas crea versión. |
| Participant | name, job_title, site_id, site_name del padrón activo. Consulta obligatoria antes de iniciar, vinculada a sesión/curso/DNI durante 15 minutos. Identificación por padrón según el requisito funcional; no incorpora contraseña adicional. |
| Grade | score proporcional sobre 20 redondeado a dos decimales, correct, review[{prompt,selected,answer,correct,explanation}], attempts_used, remaining. Reenvío completado ignora nuevas answers y reproduce nota histórica. |
| EventInput | title 3–160, description 10–2000, category opcional registrada ≤80, location 2–160, starts_at YYYY-MM-DDTHH:mm válido, active 0/1, image_ids lista única hasta 12, mínimo 3 al publicar, cover_image_id perteneciente a la lista. |
| Event | columnas editoriales, id, image_id e images[{id,name}]; view_count solo administrativo. Al eliminar se borra fila/galería, se conservan archivos y actividad. |
| UserInput | name 3–120, email válido 5–190, role capacitador/superadmin, active 0/1, site_id; DNI del padrón activo y misma sede para capacitador, nombre/cargo del padrón. Password obligatoria al crear, opcional al editar, ≥12 caracteres y ≤72 bytes. Superadmin puede tener dni nullable. Nunca retorna hash. |
| User / Site / Personnel | Usuario: identidad administrativa sin hash/auth_version. Sede: id,name,address,active,created_at y conteos. Personal: dni,name,job_title,active,site_id,site_name,updated_at; solo superadmin. |
| Session | user nullable, csrf, setup_required, setup_allowed; ID y CSRF rotan al login/logout/caducidad. Inactividad 3600 s por defecto. |
| PopupInput / Popup | title opcional ≤160, active 0/1, link_url ≤1000 y link_label ≤80. URL HTTP(S) sin credenciales o #curso/id/#eventos/id existente publicado; modo informativo vacío. display_size compact/standard, image_format original/landscape/square, image_focus center/top/bottom/left/right. Requiere imagen al crear. Respuesta añade id,image_id,revision,updated_at. Solo uno activo. |
| SliderInput / Slide | alt 1–160, active 0/1, position 1–9999, fit cover/contain, focal center/top/bottom/left/right. Requiere imagen al crear. Respuesta incluye id,image_id,image y updated_at; conserva URL de imagen histórica. |
| Upload | id,name,extension,size; materiales PDF/PPT/PPTX ≤50 MB, imágenes JPG/PNG/WEBP ≤8 MB y dimensiones ≤8000. Nombre de almacenamiento aleatorio y MIME inspeccionado. |
| PreviewStatus | status queued/processing/ready/failed/unavailable, source_hash nullable, error_message nullable y saneado. Previews binarios verifican autorización antes de ETag. |
| Activity | id,kind,event_type,entity_type,entity_id,title,body,created_at,course_id,exam_id,href; máximo 60, revision SHA-256. Solo attempt.submitted/exam.closed/content.views en la campana actual. |
| Result / ReportExam | Result: participante, dni, cargo, última nota/envío, intentos y participación si se filtra examen. ReportExam: id,course_id,version,periodo,enabled,exam_required,title,course_status,state. Estados temporales scheduled/open/closed/disabled/not_required. |

No se encontró un cliente externo en el código disponible. No se inspeccionaron integraciones ajenas al proyecto ni se infiere ausencia de clientes históricos. Se conservan 410, alias de navegación y endpoints aparentemente no consumidos.
''')
(OUT/'ENDPOINTS.md').write_text(''.join(lines),encoding='utf-8')
(OUT/'endpoints.json').write_text(json.dumps(machine,ensure_ascii=False,indent=2),encoding='utf-8')

files=sorted((ROOT/'backend').rglob('*.php'))+[ROOT/'public/index.php']
inventory=[];by_hash=collections.defaultdict(list);sqls=collections.defaultdict(list)
for file in files:
    source=file.read_text(encoding='utf-8-sig');relative=file.relative_to(ROOT).as_posix()
    namespace=re.search(r'namespace\s+([^;]+);',source)
    methods=re.findall(r'function\s+(\w+)\s*\(',source)
    imports=re.findall(r'use\s+(Academia\\[^;]+);',source)
    full=re.findall(r'\\(Academia\\[A-Za-z\\]+)',source)
    if namespace:
        for name in re.findall(r'\b(?:new\s+([A-Z]\w*)|([A-Z]\w*)::)',source):
            short=name[0] or name[1]
            if not any(value.rsplit('\\',1)[-1]==short for value in imports):
                full.append(namespace.group(1)+'\\'+short)
    inventory.append(dict(file=relative,bytes=file.stat().st_size,lines=len(source.splitlines()),max_line=max(map(len,source.splitlines()),default=0),namespace=namespace.group(1) if namespace else None,methods=methods,references=sorted(set(imports+full))))
    by_hash[hashlib.sha256(file.read_bytes()).hexdigest()].append(relative)
    for match in re.finditer(r'''(['"])((?:SELECT|INSERT|UPDATE|DELETE)\s[^\n]*?)\1''',source,re.I):
        sql=re.sub(r'\s+',' ',match[2]).strip()
        if len(sql)>20:sqls[sql].append(relative+':'+str(source.count('\n',0,match.start())+1))
(OUT/'source-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
classes={item['namespace']+'\\'+Path(item['file']).stem:item for item in inventory if item['namespace']}
graph={name:set(item['references'])&classes.keys() for name,item in classes.items()}
cycles=set()
def visit(node,path):
    for nxt in graph[node]:
        if nxt in path:
            cycle=path[path.index(nxt):]
            cycles.add(min(tuple(cycle[i:]+cycle[:i]) for i in range(len(cycle))))
        else:
            visit(nxt,path+[nxt])
for name in graph:visit(name,[name])
(OUT/'dependencies.json').write_text(json.dumps({'note':'Static imports, fully qualified and local class calls; not a runtime trace.','edges':{k:sorted(v) for k,v in graph.items()},'cycles':sorted(cycles)},ensure_ascii=False,indent=2),encoding='utf-8')
text=['# Inventario PHP y dependencias estáticas\n\nCada archivo activo y sus métodos se listan abajo. Las referencias son estáticas (imports y nombres completos), no un perfil de ejecución. Respaldos, archivos del usuario y runtime externo se excluyen.\n\n| Archivo | Bytes | Líneas | Métodos/funciones |\n|---|---:|---:|---|\n']
for item in inventory:
    text.append('| `'+item['file']+'` | '+str(item['bytes'])+' | '+str(item['lines'])+' | '+', '.join(item['methods'])+' |\n')
text.append('\n## Consultas repetidas candidatas\n\nExtracción textual conservadora: las cadenas interpoladas y construidas por fragmentos requieren lectura manual; no es un parser SQL. Dos coincidencias no implican redundancia en una misma solicitud.\n\n')
for sql,locations in sqls.items():
    if len(locations)>1:text.append('- `'+sql.replace('`','')+'` — '+', '.join(locations)+'\n')
text.append('\nArchivos idénticos activos: '+json.dumps([v for v in by_hash.values() if len(v)>1])+'.\n')
(OUT/'INVENTARIO-PHP.md').write_text(''.join(text),encoding='utf-8')
print(f'OK inventario: {len(routes)} endpoints, {len(files)} PHP activos; sin datos operativos ni credenciales.')
