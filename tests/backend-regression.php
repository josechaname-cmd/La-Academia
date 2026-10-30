<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';

use Academia\Http\ApiException;
use Academia\Http\AgentRegistry;
use Academia\Http\RequestContext;
use Academia\Services\AuthTool;
use Academia\Support\Database;

$config = require dirname(__DIR__).'/backend/config/application.php';
if (!preg_match('/^academia_test_[a-f0-9]{16}$/D', $config['db_name'])) throw new RuntimeException('Usa tests/isolated.php.');
$db = new Database($config);
session_save_path(dirname($config['storage']).'/sessions');
$_SERVER['SCRIPT_NAME']='/la-academia/index.php'; $_SERVER['REMOTE_ADDR']='127.0.0.1';
$auth = new AuthTool($db, $config);
$checks = 0;
function verify(bool $value, string $label): void {
    global $checks;
    if (!$value) { fwrite(STDERR, 'FAIL '.$label.PHP_EOL); throw new RuntimeException('Regression failed'); }
    $checks++;
}
function rejects(callable $fn, int $status, string $label): void {
    try { $fn(); } catch (ApiException $e) { verify($e->getCode()===$status, $label); return; }
    verify(false, $label);
}
$db->pdo->beginTransaction();
$storedPaths=[];
try {
    $siteA=(int)$db->run('SELECT id FROM sites ORDER BY id LIMIT 1')->fetchColumn();
    $db->run("INSERT INTO sites(name,address) VALUES('Otra sede de pruebas','')");$siteB=(int)$db->pdo->lastInsertId();
    $actors=[];
    foreach ([['superadmin',null],['capacitador',$siteA],['capacitador',$siteB]] as $i=>[$role,$site]) {
        $db->run('INSERT INTO admins(name,email,password_hash,role,site_id) VALUES(?,?,?,?,?)',['Actor sintético','actor'.$i.'@example.invalid',password_hash('Synthetic-test-password',PASSWORD_DEFAULT),$role,$site]);
        $actors[]=(int)$db->pdo->lastInsertId();
    }
    $categories=new Academia\Repositories\CategoryRepository($db);
    $courses=new Academia\Repositories\CourseRepository($db,$categories);
    $reports=new Academia\Repositories\ReportRepository($db);
    $exams=new Academia\Repositories\ExamRepository($db,new Academia\Services\ExamRules());
    $courseIds=[];$examIds=[];$fileIds=[];
    foreach ([$siteA,$siteB,$siteA,$siteA] as $i=>$site) {
        $course=$courses->save(['title'=>'Curso sintético '.$i,'category'=>'Pruebas','description'=>'Descripción sintética del curso.','site_id'=>$site],null,['id'=>$actors[0],'name'=>'Actor sintético','role'=>'superadmin']);
        $id=(int)$course['id'];$courseIds[]=$id;
        $key=bin2hex(random_bytes(24)).'.pdf';$storedPaths[]=$config['storage'].'/'.$key;file_put_contents(end($storedPaths),'%PDF-1.4 fixture');
        $db->run('INSERT INTO files(course_id,original_name,storage_key,mime,extension,size) VALUES(?,?,?,?,?,?)',[$id,'Fixture.pdf',$key,'application/pdf','pdf',16]);$fileIds[]=(int)$db->pdo->lastInsertId();
        $exam=$exams->save($id,['questions'=>[['prompt'=>'Pregunta sintética '.$i,'choices'=>['Sí','No','Otra'],'correct'=>0]],'opens_at'=>date('Y-m-d H:i:s',time()-60),'closes_at'=>null,'duration_minutes'=>10,'max_attempts'=>2,'passing_score'=>14]);
        $examIds[]=(int)$exam['id'];
        foreach ([4,8,12,16,20] as $j=>$score) {
            $db->run("INSERT INTO enrollments(exam_id,dni,name,job_title,phone,area) VALUES(?,?,?,'Pruebas','','')",[$exam['id'],sprintf('%08d',80000000+$i*100+$j),'Participante sintético '.$j]);$en=(int)$db->pdo->lastInsertId();
            foreach ([0,$score] as $value) $db->run("INSERT INTO attempts(enrollment_id,token_hash,status,score,answers_json,submitted_at) VALUES(?,?,'completed',?,'[0]',NOW())",[$en,hash('sha256',random_bytes(32)),$value]);
        }
        (new Academia\Repositories\ActivityRepository($db))->record('content.views','course',$id,'Visitas de prueba','Dato sintético',$id);
    }
    $_SESSION['admin']=['id'=>$actors[1],'auth_version'=>0];$auth->user(true);
    $registry=new AgentRegistry($db,$auth,$config);
    $call=fn(string $agent,string $action,array $input=[],string $method='POST')=>$registry->dispatch($agent,$action,new RequestContext($input,$method));
    foreach (['admin.get','save','publish','delete','purge','cover','cover.upload'] as $action) rejects(fn()=>$call('content',$action,['id'=>$courseIds[1],'file_id'=>$fileIds[1]],$action==='admin.get'?'GET':'POST'),403,'Sede ajena content '.$action);
    rejects(fn()=>$call('content','upload',['course_id'=>$courseIds[1]]),403,'Carga a otra sede');
    foreach (['file.delete','preview.retry'] as $action) rejects(fn()=>$call('content',$action,['id'=>$fileIds[1]]),403,'Archivo ajeno '.$action);
    foreach (['get','save','status'] as $action) rejects(fn()=>$call('exam',$action,['course_id'=>$courseIds[1]],$action==='get'?'GET':'POST'),403,'Examen ajeno '.$action);
    foreach (['slides','thumbnail','preview','preview.status'] as $action) rejects(fn()=>$call('content',$action,['id'=>$fileIds[1]],'GET'),403,'Derivado privado ajeno '.$action);
    rejects(fn()=>$call('report','export',['id'=>$examIds[1]],'GET'),403,'Exportación ajena');
    $_GET=['exam_id'=>(string)$examIds[1]];rejects(fn()=>$call('report','results',[],'GET'),403,'Resultados ajenos');$_GET=[];
    $list=$call('content','admin.list',[],'GET');verify(count($list)===3,'Lista administrativa filtrada');
    verify(count($call('report','exams',[],'GET'))===3,'Exámenes filtrados');
    verify(count($call('report','results',[],'GET'))===15,'Resultados filtrados antes del límite');
    $feed=$call('admin','notifications.list',[],'GET');verify(!in_array($courseIds[1],array_map('intval',array_column($feed['items'],'course_id')),true),'Campana sin otra sede');
    verify((int)$call('content','admin.get',['id'=>$courseIds[0]],'GET')['id']===$courseIds[0],'Lee su borrador');
    $summary=$call('report','summary',[],'GET');verify($summary['courses']===3&&$summary['evaluations']===30,'Contadores limitados por sede');
    foreach ($summary['score_averages'] as $row) verify($row['average_score']===12.0&&$row['top_scores']===[20.0,16.0,12.0,8.0,4.0]&&$row['participant_count']===5,'Última entrega, promedio y ranking con menos de diez resultados');
    $db->run('SAVEPOINT dashboard_top');
    foreach ([0,1,9,10,11,12,13,14,15,17,18,19] as $j=>$score) {
        $db->run("INSERT INTO enrollments(exam_id,dni,name,job_title,phone,area) VALUES(?,?,?,'Pruebas','','')",[$examIds[0],sprintf('%08d',81000000+$j),'Ranking sintético '.$j]);$en=(int)$db->pdo->lastInsertId();
        foreach ([20,$score] as $value) $db->run("INSERT INTO attempts(enrollment_id,token_hash,status,score,answers_json,submitted_at) VALUES(?,?,'completed',?,'[0]',NOW())",[$en,hash('sha256',random_bytes(32)),$value]);
        $db->run("INSERT INTO attempts(enrollment_id,token_hash,status) VALUES(?,?,'pending')",[$en,hash('sha256',random_bytes(32))]);
    }
    $ranking=$call('report','summary',[],'GET');$byCourse=array_column($ranking['score_averages'],null,'course_id');
    verify($byCourse[$courseIds[0]]['top_scores']===[20.0,19.0,18.0,17.0,16.0,15.0,14.0,13.0,12.0,12.0],'Top diez real, descendente, con empates y solo la última entrega completada');
    verify($byCourse[$courseIds[0]]['participant_count']===17&&$byCourse[$courseIds[0]]['minimum_score']===0.0,'El límite del ranking no recorta los datos del promedio');
    verify(count($byCourse[$courseIds[2]]['top_scores'])===5&&!isset($byCourse[$courseIds[1]]),'Ranking separado por capacitación y sede');
    $db->run("UPDATE courses SET status='archived' WHERE id=?",[$courseIds[0]]);
    verify(!in_array($courseIds[0],array_column($reports->summary($siteA)['score_averages'],'course_id'),true),'Ranking excluye capacitaciones archivadas');
    $db->run('ROLLBACK TO SAVEPOINT dashboard_top');$db->run('RELEASE SAVEPOINT dashboard_top');
    $before=(int)$db->run("SHOW SESSION STATUS LIKE 'Com_stmt_execute'")->fetch()['Value'];$reports->summary();$after=(int)$db->run("SHOW SESSION STATUS LIKE 'Com_stmt_execute'")->fetch()['Value'];
    verify($after-$before-1===3,'Resumen con tres consultas independientemente de N');
    $db->run("UPDATE courses SET created_at='2020-01-01 08:00:00' WHERE id=?",[$courseIds[1]]);
    $courses->publish($courseIds[1]);verify(count($call('content','list',[],'GET'))===1,'Catálogo publicado mantiene alcance público');
    $published=$courses->list()[0];
    $publication=$db->run("SELECT MAX(created_at) FROM activity_log WHERE entity_type='course' AND entity_id=? AND event_type='course.published'",[$courseIds[1]])->fetchColumn();
    verify($published['published_at']===$publication&&$published['published_at']!==$published['created_at'],'Inicio usa la publicación real aunque el borrador sea antiguo');
    $courses->publish($courseIds[1]);verify($courses->list()[0]['published_at']===$publication,'Publicar de nuevo un curso activo conserva su fecha');
    $db->run('SAVEPOINT publication_dates');
    $db->run("DELETE FROM activity_log WHERE entity_type='course' AND entity_id=? AND event_type='course.published'",[$courseIds[1]]);
    verify($courses->list()[0]['published_at']==='2020-01-01 08:00:00','Cursos históricos sin evento de publicación conservan su fecha disponible');
    $db->run('ROLLBACK TO SAVEPOINT publication_dates');$db->run('RELEASE SAVEPOINT publication_dates');
    verify(count($call('content','slides',['id'=>$fileIds[1]],'GET')['slides'])===0,'Material publicado permanece público entre sedes');
    $courses->archive($courseIds[1]);
    $files=new Academia\Services\FileTool($db,$config,new Academia\Support\PresentationTool());$files->remove($fileIds[1]);
    verify($db->run('SELECT status FROM courses WHERE id=?',[$courseIds[1]])->fetchColumn()==='archived','Eliminar último archivo no restaura archivado');
    $db->run("INSERT INTO file_previews(file_id,status,error_message) VALUES(?,'failed',?)",[$fileIds[0],'SQLSTATE secret-token private-password']);
    $preview=$call('content','preview.status',['id'=>$fileIds[0]],'GET');verify(!str_contains(json_encode($preview),'secret-token'),'Estado no revela error técnico histórico');
    $detail=$call('content','admin.get',['id'=>$courseIds[0]],'GET');verify(!str_contains(json_encode($detail),'SQLSTATE'),'Detalle no revela error SQL histórico');
    $payload=Academia\Http\ErrorHandler::payload(new PDOException('private-password SQL token'),str_repeat('a',16));verify(!str_contains(json_encode($payload),'private-password')&&$payload['error']['code']==='internal_error','Error público SQL saneado');
    $oldLog=ini_get('error_log');$log=dirname($config['storage']).'/log-test.jsonl';ini_set('error_log',$log);
    Academia\Support\Logger::failure(new PDOException('private-password'),'test',str_repeat('a',16),['password'=>'private-password','token'=>'private-token','body'=>'private-body','status'=>500]);
    ini_set('error_log',$oldLog);$logged=file_get_contents($log);verify(!str_contains($logged,'private-')&&str_contains($logged,'operation.failed')&&str_contains($logged,'request_id'),'Log excluye mensajes y campos sensibles');
    $people=new Academia\Repositories\PersonnelRepository($db);
    $result=$people->importRows([['dni'=>'71234567','name'=>'Colaborador sintético','job_title'=>'Prueba']],$siteA);verify($result['created']===1,'Importación sintética');
    rejects(fn()=>$people->importRows([['dni'=>'71234568','name'=>'Colaborador válido','job_title'=>'Prueba'],['dni'=>'incorrecto','name'=>'Colaborador inválido','job_title'=>'Prueba']],$siteA),422,'Valida todo el lote antes de escribir');
    verify(!$db->run('SELECT 1 FROM employees WHERE dni=?',['71234568'])->fetchColumn(),'Lote inválido no inserta filas');
    $db->run('UPDATE admins SET dni=? WHERE id=?',['71234567',$actors[1]]);
    $people->importRows([['dni'=>'71234567','name'=>'Colaborador sintético','job_title'=>'Prueba']],$siteB);
    verify((int)$db->run('SELECT site_id FROM admins WHERE id=?',[$actors[1]])->fetchColumn()===$siteB,'Importación sincroniza sede del acceso activo');
    $people->importRows([['dni'=>'71234567','name'=>'Colaborador sintético','job_title'=>'Prueba']],$siteA);
    $_SESSION['admin']=['id'=>$actors[0],'auth_version'=>0];$auth->user(true);verify(count($call('report','exams',[],'GET'))===4,'Superadmin conserva historial entre sedes');
    $_SESSION['admin']=['id'=>$actors[1],'auth_version'=>(int)$db->run('SELECT auth_version FROM admins WHERE id=?',[$actors[1]])->fetchColumn()];$auth->user(true);
    $db->run('UPDATE courses SET site_id=? WHERE id=?',[$siteB,$courseIds[0]]);
    rejects(fn()=>$call('exam','status',['course_id'=>$courseIds[0],'enabled'=>0]),403,'Reasignación se comprueba en servidor');
    $_SESSION=[];rejects(fn()=>$call('content','admin.get',['id'=>$courseIds[0]],'GET'),401,'Invitado no accede a borrador');
    // File callbacks follow the outer database boundary, not a nested savepoint.
    $effects=[];
    try{$db->transaction(function()use($db,&$effects){$db->transaction(function()use($db,&$effects){$db->afterCommit(function()use(&$effects){$effects[]='commit';});$db->afterRollback(function()use(&$effects){$effects[]='rollback';});});throw new RuntimeException('Synthetic rollback');});}catch(RuntimeException){}
    verify($effects===['rollback'],'Compensación de archivo sigue rollback externo');
    verify(Academia\Validators\Password::forCreation('  Password de prueba  ')==='  Password de prueba  ','Creación conserva espacios de contraseña');
    rejects(fn()=>Academia\Validators\Password::forCreation("Password de prueba\0"),422,'Contraseña con NUL no causa error interno');
    verify(isset(Academia\Validators\PersonnelRows::validate([['dni'=>71234567,'name'=>'Nombre de prueba','job_title'=>'Prueba']])[71234567]),'DNI entero heredado conserva compatibilidad');
    $db->run('UPDATE admins SET active=0 WHERE id=?',[$actors[2]]);
    $replacement=[['dni'=>'71234569','name'=>'Nuevo colaborador','job_title'=>'Prueba']];
    rejects(fn()=>$people->replaceRows($replacement),409,'Reemplazo CLI no desactiva a un capacitador');
    verify((int)$db->run('SELECT active FROM employees WHERE dni=?',['71234567'])->fetchColumn()===1,'Reemplazo rechazado no escribe');
    $people->importRows([['dni'=>'71234570','name'=>'Colaborador anterior','job_title'=>'Prueba']],$siteA);
    $replacement[]=['dni'=>'71234567','name'=>'Capacitador actualizado','job_title'=>'Prueba'];
    verify($people->replaceRows($replacement)===2,'Reemplazo CLI válido conserva total');
    verify((int)$db->run('SELECT active FROM employees WHERE dni=?',['71234570'])->fetchColumn()===0,'Reemplazo conserva desactivación de ausentes');
    $identificationCourse=$courseIds[2];$courses->publish($identificationCourse);
    $people->importRows([['dni'=>'74561001','name'=>'Persona identificada','job_title'=>'Prueba']],$siteA);
    $attemptService=new Academia\Services\AttemptTool($db,$exams,$people,new Academia\Services\ExamRules(),2);
    $identification=new Academia\Services\ParticipantAccess($db,$attemptService);
    $learner=['dni'=>'74561001'];$_SESSION['participant_access']=[];
    rejects(fn()=>$identification->start($identificationCourse,$learner),403,'Debe consultar DNI antes de recibir preguntas');
    verify($identification->identify($identificationCourse,$learner)['name']==='Persona identificada','Identificación previa consulta padrón');
    rejects(fn()=>$identification->start($identificationCourse,['dni'=>'74561002']),403,'Identificación no vale para otro DNI');
    rejects(fn()=>$identification->start($courseIds[3],$learner),403,'Identificación no vale para otro curso');
    $_SESSION['participant_access'][$identificationCourse]['expires_at']=time()-1;
    rejects(fn()=>$identification->start($identificationCourse,$learner),403,'Identificación vencida se vuelve a consultar');
    $identification->identify($identificationCourse,$learner);
    $db->run('UPDATE employees SET active=0 WHERE dni=?',[$learner['dni']]);
    rejects(fn()=>$identification->start($identificationCourse,$learner),404,'Revalida colaborador al iniciar');
    $db->run('UPDATE employees SET active=1,site_id=NULL WHERE dni=?',[$learner['dni']]);
    rejects(fn()=>$identification->identify($identificationCourse,$learner),403,'No acepta colaborador sin sede');
    $db->run('UPDATE employees SET site_id=? WHERE dni=?',[$siteB,$learner['dni']]);
    rejects(fn()=>$identification->identify($identificationCourse,$learner),403,'No acepta colaborador de otra sede');
    $db->run('UPDATE employees SET site_id=? WHERE dni=?',[$siteA,$learner['dni']]);
    $identification->identify($identificationCourse,$learner);
    $identifiedAttempt=$identification->start($identificationCourse,$learner);
    verify(!isset($identifiedAttempt['questions'][0]['correct']),'Identificado recibe preguntas sin clave');
    $_SERVER['REMOTE_ADDR']='192.0.2.10';$lookupHash=hash('sha256','participant:192.0.2.10');
    for($i=0;$i<30;$i++)$db->run('INSERT INTO auth_attempts(ip_hash) VALUES(?)',[$lookupHash]);
    rejects(fn()=>$identification->identify($identificationCourse,$learner),429,'Límite de identificación también aplica en entorno local');
    $_SERVER['REMOTE_ADDR']='127.0.0.1';
    echo 'OK '.$checks." regresiones: sedes, archivos, reportes, errores, logs e importación. Resumen: 3 consultas para 4 cursos.\n";
} finally {
    if($db->pdo->inTransaction())$db->pdo->rollBack();
    foreach($storedPaths as $path)if(is_file($path))unlink($path);
    $_SESSION=[];session_destroy();
}
