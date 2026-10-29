<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
$config=require dirname(__DIR__).'/backend/config/application.php';
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name']))throw new RuntimeException('Usa tests/isolated.php concurrency.php.');
$db=new Academia\Support\Database($config);
$rules=new Academia\Services\ExamRules();
$exams=new Academia\Repositories\ExamRepository($db,$rules);
$attempts=new Academia\Services\AttemptTool($db,$exams,new Academia\Repositories\PersonnelRepository($db),$rules,2);
if(in_array('--worker',$argv,true)){
    $job=json_decode(stream_get_contents(STDIN),true,32,JSON_THROW_ON_ERROR);
    $barrier=dirname($config['storage']).'/'.$job['barrier'];
    file_put_contents($barrier.'.'.$job['worker'],'ready');
    $deadline=microtime(true)+10;
    while(!is_file($barrier.'.go')){if(microtime(true)>$deadline)throw new RuntimeException('Barrier timeout');usleep(10000);}
    try{
        if($job['operation']==='submit')$result=$attempts->submit(['token'=>$job['token'],'answers'=>[$job['answer']??1]]);
        elseif($job['operation']==='start')$result=$attempts->start($job['course'],['dni'=>$job['dni']]);
        else $result=(new Academia\Repositories\HomePopupRepository($db))->setActive($job['id'],1);
        echo json_encode(['status'=>200,'score'=>$result['score']??null]);
    }catch(Academia\Http\ApiException $e){echo json_encode(['status'=>$e->getCode()]);}
    exit;
}
function pair(array $jobs,array $config): array {
    $barrier='barrier-'.bin2hex(random_bytes(6));$processes=[];
    foreach($jobs as $i=>$job){
        $process=proc_open([PHP_BINARY,__FILE__,'--worker'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true,'create_no_window'=>true]);
        if(!is_resource($process))throw new RuntimeException('Worker start failed');
        fwrite($pipes[0],json_encode($job+['barrier'=>$barrier,'worker'=>$i]));fclose($pipes[0]);
        $processes[]=[$process,$pipes];
    }
    $path=dirname($config['storage']).'/'.$barrier;$deadline=microtime(true)+10;
    while(!is_file($path.'.0')||!is_file($path.'.1')){
        if(microtime(true)>$deadline){foreach($processes as [$p])proc_terminate($p);throw new RuntimeException('Worker barrier timeout');}
        usleep(10000);
    }
    file_put_contents($path.'.go','go');$results=[];
    foreach($processes as [$process,$pipes]){
        $out=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
        if(proc_close($process)!==0){fwrite(STDERR,$error);throw new RuntimeException('Concurrent operation failed');}
        $results[]=json_decode($out,true,32,JSON_THROW_ON_ERROR);
    }
    return $results;
}
$site=(int)$db->run('SELECT id FROM sites ORDER BY id LIMIT 1')->fetchColumn();
$db->run("INSERT INTO courses(site_id,title,category,description,status) VALUES(?,'Concurrencia sintética','Pruebas','Prueba aislada','published')",[$site]);$course=(int)$db->pdo->lastInsertId();
$exam=$exams->save($course,['questions'=>[['prompt'=>'Pregunta de concurrencia','choices'=>['A','B','C'],'correct'=>0]],'opens_at'=>date('Y-m-d H:i:s',time()-60),'duration_minutes'=>20,'max_attempts'=>2,'passing_score'=>14]);
$checks=0;
for($i=0;$i<10;$i++){
    $dni=(string)(73000000+$i);$db->run("INSERT INTO employees(dni,full_name,job_title,site_id) VALUES(?,'Persona sintética','Prueba',?)",[$dni,$site]);
    $first=$attempts->start($course,['dni'=>$dni]);
    $job=['operation'=>'submit','token'=>$first['token']];$result=pair([$job,$job],$config);
    if(array_column($result,'score')!==[0,0])throw new RuntimeException('Concurrent idempotence failed');$checks++;
    $pending=$attempts->start($course,['dni'=>$dni]);
    $result=pair([['operation'=>'start','course'=>$course,'dni'=>$dni],['operation'=>'submit','token'=>$pending['token']]],$config);
    foreach($result as $r){if(!in_array($r['status'],[200,404,409],true))throw new RuntimeException('Unexpected concurrent result');$checks++;}
    $counts=$db->run("SELECT SUM(a.status='pending') pending,SUM(a.status='completed') completed FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id WHERE e.exam_id=? AND e.dni=?",[$exam['id'],$dni])->fetch();
    if((int)$counts['pending']>1||(int)$counts['completed']>2)throw new RuntimeException('Attempt invariant failed');$checks++;
}
$dni='73999999';$db->run("INSERT INTO employees(dni,full_name,job_title,site_id) VALUES(?,'Persona perfecta','Prueba',?)",[$dni,$site]);
$perfect=$attempts->start($course,['dni'=>$dni]);$attempts->submit(['token'=>$perfect['token'],'answers'=>[0]]);
$result=pair([['operation'=>'start','course'=>$course,'dni'=>$dni],['operation'=>'start','course'=>$course,'dni'=>$dni]],$config);
if(array_column($result,'status')!==[409,409])throw new RuntimeException('Concurrent perfect retry blocked');$checks++;
$db->run("INSERT INTO files(original_name,storage_key,mime,extension,size) VALUES('Synthetic.png',?,'image/png','png',1)",[bin2hex(random_bytes(24)).'.png']);$image=(int)$db->pdo->lastInsertId();
$popups=new Academia\Repositories\HomePopupRepository($db);$ids=[];
for($i=0;$i<2;$i++)$ids[]=(int)$popups->save(['title'=>'Prueba','active'=>0,'link_url'=>'','link_label'=>''],$image)['id'];
for($i=0;$i<5;$i++){
    $result=pair([['operation'=>'popup','id'=>$ids[0]],['operation'=>'popup','id'=>$ids[1]]],$config);
    if(array_column($result,'status')!==[200,200]||(int)$db->run('SELECT COUNT(*) FROM home_popup WHERE active=1')->fetchColumn()!==1)throw new RuntimeException('Exclusive popup failed');$checks++;
}
echo 'OK '.$checks." verificaciones concurrentes: 26 pares de procesos, idempotencia, inicio/envío y popup exclusivo.\n";
