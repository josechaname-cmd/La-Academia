<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';

use Academia\Http\ApiException;
use Academia\Services\AuthTool;
use Academia\Support\Database;
use Academia\Support\Validation;

$config=require dirname(__DIR__).'/backend/config/application.php';
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name']))throw new RuntimeException('Usa tests/isolated.php validation-security.php.');
$db=new Database($config);
session_save_path(dirname($config['storage']).'/sessions');
$_SERVER['SCRIPT_NAME']='/la-academia/index.php';$_SERVER['REMOTE_ADDR']='127.0.0.1';
$auth=new AuthTool($db,$config);$checks=0;
function verify(bool $condition,string $label): void {global $checks;if(!$condition)throw new RuntimeException($label);$checks++;}
function reject(callable $action,int $status,?string $field=null): void {
    try{$action();}catch(ApiException $error){verify($error->getCode()===$status,'Estado de validación');if($field!==null)verify(isset($error->fields[$field]),'Error asociado al campo '.$field);return;}
    throw new RuntimeException('Una entrada inválida fue aceptada.');
}

foreach([null,[],true,12,"Texto\0inválido","Texto\x01inválido","\xFF"] as $value)reject(fn()=>Validation::text(['title'=>$value],'title',3,30),422,'title');
reject(fn()=>Validation::text(['title'=>"\u{00A0} \n\t"],'title',1,30),422,'title');
verify(Validation::text(['title'=>" \nTexto válido\ncon detalle\t"],'title',3,100)==="Texto válido\ncon detalle",'Conserva los saltos del contenido');
verify(Validation::email(['email'=>' USER@EXAMPLE.INVALID '])==='user@example.invalid','Correo canónico');
foreach(['not-an-email',[],"a\0@example.invalid"] as $value)reject(fn()=>Validation::email(['email'=>$value]),422,'email');
foreach([[],true,1.5,'1e1','1.0','999999999999999999999999999'] as $value)reject(fn()=>Validation::number(['n'=>$value],'n',1,10),422,'n');
$rules=new Academia\Services\ExamRules();
$question=['prompt'=>'Pregunta de prueba','choices'=>['Opción uno','Opción dos','Opción tres'],'correct'=>0];
reject(fn()=>$rules->validate([$question,array_replace($question,['prompt'=>'  PREGUNTA   de prueba  '])]),422,'questions.1.prompt');
reject(fn()=>$rules->validate([array_replace($question,['choices'=>['Opción uno','OPCIÓN  uno','Distinta']])]),422,'questions.0.choices.1');
reject(fn()=>$rules->validate([array_replace($question,['prompt'=>[]])]),422,'questions.0.prompt');
reject(fn()=>$rules->validate([array_replace($question,['correct'=>true])]),422,'correct-0');
foreach(['0001-01-01T00:00','2026-02-30T10:00',[]] as $date)reject(fn()=>Academia\Services\ExamSchedule::validate(['opens_at'=>$date,'duration_minutes'=>30]),422,'opens_at');

$db->pdo->beginTransaction();
try{
    $db->run("INSERT INTO admins(name,email,password_hash,role) VALUES('Actor de pruebas','validation@example.invalid',?,'superadmin')",[password_hash('Synthetic validation password',PASSWORD_DEFAULT)]);
    $actor=(int)$db->pdo->lastInsertId();$site=(int)$db->run('SELECT id FROM sites LIMIT 1')->fetchColumn();
    $users=new Academia\Repositories\UserRepository($db);$sites=new Academia\Repositories\SiteRepository($db);$categories=new Academia\Repositories\CategoryRepository($db);
    $people=new Academia\Repositories\PersonnelRepository($db);$courses=new Academia\Repositories\CourseRepository($db,$categories);$events=new Academia\Repositories\EventRepository($db,$categories);
    $files=new Academia\Services\FileTool($db,$config,new Academia\Support\PresentationTool());
    $policies=new Academia\Services\PolicyTool($db,$files);
    // Each editor's backend must reject invalid types even when JavaScript is bypassed.
    foreach([
        fn()=>$users->save(['name'=>[]],null,$actor),
        fn()=>$sites->save(['name'=>[]],null),
        fn()=>$people->save(['dni'=>[]]),
        fn()=>$courses->save(['title'=>[]],null),
        fn()=>$events->save(['title'=>[]],null),
        fn()=>(new Academia\Repositories\HomeSliderRepository($db))->save(['alt'=>[]]),
        fn()=>(new Academia\Repositories\HomePopupRepository($db))->save(['title'=>[]]),
        fn()=>$policies->save(['title'=>[]],null,null,['id'=>$actor]),
        fn()=>$auth->setup(['name'=>[]]),
        fn()=>$auth->login(['email'=>[],'password'=>'Synthetic validation password']),
        fn()=>$files->add(['error'=>[UPLOAD_ERR_OK]],null,true),
    ] as $action)reject($action,422);
    $base=['name'=>'Usuario de prueba','email'=>'duplicate@example.invalid','role'=>'superadmin','active'=>1,'site_id'=>'','dni'=>'','job_title'=>'','password'=>'Synthetic user password'];
    foreach(['dni','job_title','site_id'] as $field)reject(fn()=>$users->save(array_replace($base,[$field=>[]]),null,$actor),422,$field);
    $saved=$users->save($base,null,$actor);
    reject(fn()=>$users->save(array_replace($base,['email'=>' DUPLICATE@EXAMPLE.INVALID ']),null,$actor),409,'email');
    reject(fn()=>$users->save(array_replace($base,['email'=>'dni-first@example.invalid','dni'=>'00224466']),null,$actor),422,'dni');
    $people->save(['dni'=>'00224466','name'=>'Colaborador de prueba','job_title'=>'Prueba','site_id'=>$site,'active'=>1]);
    $dniUser=$users->save(array_replace($base,['email'=>'dni-first@example.invalid','dni'=>'00224466']),null,$actor);
    reject(fn()=>$users->save(array_replace($base,['email'=>'dni-second@example.invalid','dni'=>'00224466']),null,$actor),409,'dni');
    $sites->save(['name'=>'Sede   normalizada','address'=>'','active'=>1],null);
    reject(fn()=>$sites->save(['name'=>' sede normalizada ','address'=>'','active'=>1],null),409,'name');
    $categories->create(['scope'=>'event','name'=>'Categoría  validada']);
    reject(fn()=>$categories->create(['scope'=>'event','name'=>' CATEGORÍA validada ']),409,'name');
    $worker=['dni'=>'00335577','name'=>'Trabajador de prueba','job_title'=>'Prueba','site_id'=>$site,'active'=>1];
    $people->save($worker);reject(fn()=>$people->save($worker),409,'dni');
    $policy=['title'=>'Política de prueba','description'=>'Descripción de la política','active'=>0];
    reject(fn()=>$policies->save($policy,['error'=>[0],'name'=>['nested.pdf']],null,['id'=>$actor],['error'=>0]),422,'file');

    $_SESSION['admin']=['id'=>$saved['id'],'auth_version'=>0];$_SESSION['last_seen']=time();$_SESSION['authenticated_at']=time();
    $users->save(array_replace($base,['site_id'=>$site,'password'=>'']),$saved['id'],$actor);
    verify($auth->user(true)===null,'Cambiar sede revoca sesiones existentes');
    $_SESSION['admin']=['id'=>$actor,'auth_version'=>0];$_SESSION['last_seen']=time();$_SESSION['authenticated_at']=time()-43200;
    $previousId=session_id();$previousCsrf=$_SESSION['csrf'];new AuthTool($db,$config);
    verify(!isset($_SESSION['admin'])&&session_id()!==$previousId&&$_SESSION['csrf']!==$previousCsrf,'Caducidad absoluta y rotación');
    $_SESSION['admin']=['id'=>$actor,'auth_version'=>0];$_SESSION['last_seen']=time()-3600;$_SESSION['authenticated_at']=time();new AuthTool($db,$config);
    verify(!isset($_SESSION['admin']),'Caducidad por inactividad en el límite');
    $_SESSION['admin']=['id'=>$actor,'auth_version'=>0];$_SESSION['last_seen']=time()-30;$_SESSION['authenticated_at']=time();$seen=$_SESSION['last_seen'];new AuthTool($db,$config,false);
    verify($_SESSION['last_seen']===$seen,'Consultar notificaciones no prolonga la sesión');
    $_SERVER['HTTP_X_CSRF_TOKEN']='bad';reject(fn()=>$auth->csrf(),403);$_SERVER['HTTP_X_CSRF_TOKEN']=$_SESSION['csrf'];$auth->csrf();$checks++;
    foreach([[],str_repeat('á',37),"invalid\0password"] as $password)reject(fn()=>$auth->login(['email'=>'validation@example.invalid','password'=>$password]),422,'password');
    $prod=new AuthTool($db,array_replace($config,['environment'=>'production','local_unlimited_login'=>true]));
    reject(fn()=>$prod->setup(['name'=>'Actor local']),403);
    $db->run('DELETE FROM auth_attempts');
    for($i=0;$i<5;$i++)reject(fn()=>$prod->login(['email'=>'absent@example.invalid','password'=>'Wrong synthetic password']),401);
    reject(fn()=>$prod->login(['email'=>'absent@example.invalid','password'=>'Wrong synthetic password']),429);
    verify((int)$db->run('SELECT COUNT(*) FROM auth_attempts')->fetchColumn()===5,'Producción limita también loopback');
}finally{$db->pdo->rollBack();}

session_write_close();session_id('');$_SESSION=[];
new AuthTool($db,array_replace($config,['environment'=>'production']));
$cookie=session_get_cookie_params();
verify($cookie['secure']&&$cookie['httponly']&&$cookie['samesite']==='Strict'&&$cookie['domain']===''&&$cookie['lifetime']===0,'Cookie HTTPS privada del host en producción');
verify(ini_get('session.use_strict_mode')==='1'&&ini_get('session.use_only_cookies')==='1'&&ini_get('session.use_trans_sid')==='0','Sesión solo por cookies');
session_destroy();
echo 'OK '.$checks." validaciones: todos los editores, tipos, duplicados, campos de examen, revocación, caducidad, CSRF y cookies de producción.\n";
