<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
$root=dirname(__DIR__);$config=require $root.'/backend/config/application.php';
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name']))throw new RuntimeException('Usa tests/isolated.php http-isolated.php.');
$db=new Academia\Support\Database($config);$directory=dirname($config['storage']);
$siteA=(int)$db->run('SELECT id FROM sites ORDER BY id LIMIT 1')->fetchColumn();
$db->run("INSERT INTO sites(name,address) VALUES('Sede HTTP sintética','')");$siteB=(int)$db->pdo->lastInsertId();
$fixture=['password'=>'Synthetic-http-private-password','routes'=>require $root.'/backend/routes/api.php','courses'=>[],'files'=>[],'exams'=>[]];
foreach([$siteA,$siteB] as $i=>$site){
    $db->run("INSERT INTO admins(name,email,password_hash,role,site_id) VALUES('Prueba HTTP',?,?,'capacitador',?)",['http'.$i.'@example.invalid',password_hash($fixture['password'],PASSWORD_DEFAULT),$site]);
    $db->run("INSERT INTO courses(site_id,title,category,description,exam_required) VALUES(?,'Curso HTTP sintético','Pruebas','Descripción de prueba',0)",[$site]);$id=(int)$db->pdo->lastInsertId();$fixture['courses'][]=$id;
    $key=bin2hex(random_bytes(24)).'.pdf';file_put_contents($config['storage'].'/'.$key,'%PDF-1.4 synthetic');
    $db->run("INSERT INTO files(course_id,original_name,storage_key,mime,extension,size) VALUES(?,'Fixture.pdf',?,'application/pdf','pdf',18)",[$id,$key]);$fixture['files'][]=(int)$db->pdo->lastInsertId();
    $db->run("INSERT INTO exams(course_id,version,questions_json) VALUES(?,1,?)",[$id,json_encode([['prompt'=>'Pregunta de prueba','choices'=>['A','B','C'],'correct'=>0,'explanation'=>'']])]);$fixture['exams'][]=(int)$db->pdo->lastInsertId();
    (new Academia\Repositories\ActivityRepository($db))->record('content.views','course',$id,'Visitas HTTP','Contenido sintético',$id);
}
// Public examination fixtures are separate from administrative contract fixtures.
$db->run("INSERT INTO admins(name,email,password_hash,role) VALUES('Superadmin HTTP','http2@example.invalid',?,'superadmin')",[password_hash($fixture['password'],PASSWORD_DEFAULT)]);
$db->run("INSERT INTO courses(site_id,title,category,description,status) VALUES(?,'Identificación HTTP','Pruebas','Prueba de identificación','published')",[$siteA]);
$fixture['identification_course']=(int)$db->pdo->lastInsertId();
(new Academia\Repositories\ExamRepository($db,new Academia\Services\ExamRules()))->save($fixture['identification_course'],['questions'=>[['prompt'=>'Pregunta identificada','choices'=>['A','B','C'],'correct'=>0]],'opens_at'=>date('Y-m-d H:i:s',time()-60),'duration_minutes'=>10,'max_attempts'=>2,'passing_score'=>14]);
foreach([['74560001',$siteA,1],['74560002',$siteB,1],['74560003',null,1],['74560004',$siteA,0]] as [$dni,$site,$active])$db->run("INSERT INTO employees(dni,full_name,job_title,site_id,active) VALUES(?,'Participante de prueba','Prueba',?,?)",[$dni,$site,$active]);
$socket=stream_socket_server('tcp://127.0.0.1:0',$errno,$message);if(!$socket)throw new RuntimeException('Port allocation failed');
$address=stream_socket_get_name($socket,false);fclose($socket);
$log=$directory.'/http-test.log';
$testUser='academia_http_'.bin2hex(random_bytes(6));$testPassword=bin2hex(random_bytes(32));$testIdentity=$db->pdo->quote($testUser)."@'127.0.0.1'";
$db->pdo->exec('CREATE USER '.$testIdentity.' IDENTIFIED BY '.$db->pdo->quote($testPassword));
$server=null;
try {
foreach(require $root.'/backend/config/database-permissions.php' as $table=>$grants)$db->pdo->exec('GRANT '.$grants.' ON `'.$config['db_name'].'`.`'.$table.'` TO '.$testIdentity);
$serverConfig=$directory.'/http-config.php';
file_put_contents($serverConfig,'<?php return array_replace(require '.var_export(getenv('ACADEMIA_CONFIG'),true).', '.var_export(['db_user'=>$testUser,'db_password'=>$testPassword],true).');');
$serverEnvironment=getenv();$serverEnvironment['ACADEMIA_CONFIG']=$serverConfig;
$server=proc_open([PHP_BINARY,'-d','session.save_path='.$directory.'/sessions','-d','error_log='.$log,'-S',$address,'-t',$root.'/public',$root.'/tests/http-router.php'],[0=>['file','NUL','r'],1=>['file',$log,'a'],2=>['file',$log,'a']],$pipes,$root,$serverEnvironment,['bypass_shell'=>true,'create_no_window'=>true]);
if(!is_resource($server))throw new RuntimeException('HTTP test server failed');
    $ready=false;
    for($i=0;$i<100;$i++){$connection=@stream_socket_client('tcp://'.$address,$errno,$message,0.05);if($connection){fclose($connection);$ready=true;break;}usleep(50000);}
    if(!$ready)throw new RuntimeException('HTTP test server timeout');
    putenv('ACADEMIA_TEST_BASE=http://'.$address.'/la-academia/');
    putenv('PYTHONIOENCODING=utf-8');
    foreach(['http-contract.py','media-http.py'] as $script){
        $process=proc_open(['python',$root.'/tests/'.$script],[0=>['pipe','r'],1=>STDOUT,2=>STDERR],$childPipes,$root,null,['bypass_shell'=>true,'create_no_window'=>true]);
        if(!is_resource($process))throw new RuntimeException('Python tests failed to start');
        if($script==='http-contract.py')fwrite($childPipes[0],json_encode($fixture));fclose($childPipes[0]);
        if(proc_close($process)!==0)throw new RuntimeException('HTTP contract failed: '.$script);
    }
    if(str_contains(file_get_contents($log),$fixture['password']))throw new RuntimeException('Sensitive data reached HTTP log');
    echo "OK HTTP aislado: cuenta SQL con privilegios mínimos, log sin contraseña y almacenamiento separado.\n";
}finally{if(is_resource($server)){proc_terminate($server);proc_close($server);}putenv('ACADEMIA_TEST_BASE');$db->pdo->exec('DROP USER '.$testIdentity);}
