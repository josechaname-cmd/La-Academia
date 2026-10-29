<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
use Academia\Support\Database;
use Academia\Http\ApiException;
use Academia\Services\{ExamRules,ExamPolicy,AttemptTool};
use Academia\Repositories\{ExamRepository,PersonnelRepository,ReportRepository,CourseRepository,CategoryRepository};

$config=require dirname(__DIR__).'/backend/config/application.php';
$db=new Database($config);
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',(string)$db->run('SELECT DATABASE()')->fetchColumn()))throw new RuntimeException('Run through tests/isolated.php only.');
$checks=0;
function verify(bool $ok,string $message): void {global $checks;if(!$ok)throw new RuntimeException($message);$checks++;}
function rejects(callable $fn,int $status,string $message): void {try{$fn();}catch(ApiException $e){verify($e->getCode()===$status,$message);return;}throw new RuntimeException($message.' was accepted');}
$rules=new ExamRules();$exams=new ExamRepository($db,$rules);$attempts=new AttemptTool($db,$exams,new PersonnelRepository($db),$rules,2);
$site=(int)$db->run('SELECT id FROM sites LIMIT 1')->fetchColumn();
$db->run("INSERT INTO courses(site_id,title,category,description,status) VALUES(?,'Política de examen sintética','Pruebas','Datos exclusivos de pruebas','published')",[$site]);$course=(int)$db->pdo->lastInsertId();
$questions=array_map(fn($i)=>['prompt'=>'Pregunta sintética número '.$i,'choices'=>['Correcta','Otra','Tercera'],'correct'=>0],range(1,10));
$input=['questions'=>$questions,'opens_at'=>date('Y-m-d H:i:s',time()-60),'closes_at'=>null,'duration_minutes'=>20,'max_attempts'=>3,'passing_score'=>14];
foreach(['max_attempts'=>[null,0,11,true,'2.5'],'passing_score'=>[null,0,21,true,'14.5']] as $field=>$values){
    foreach($values as $value)rejects(fn()=>$exams->save($course,array_replace($input,[$field=>$value])),422,'Invalid '.$field);
    $missing=$input;unset($missing[$field]);rejects(fn()=>$exams->save($course,$missing),422,'Required '.$field);
}
$exam=$exams->save($course,$input);verify((int)$exam['max_attempts']===3&&(int)$exam['passing_score']===14,'Creator settings persisted');
verify($exams->save($course,$input)['id']===$exam['id'],'Saving unchanged settings preserves version');
$person=static function(int $i)use($db,$site):array{$dni=(string)(76000000+$i);$db->run("INSERT INTO employees(dni,full_name,job_title,site_id) VALUES(?,'Persona sintética','Pruebas',?)",[$dni,$site]);return ['dni'=>$dni];};
$send=static function(array $worker,int $correct)use($attempts,$course):array{$a=$attempts->start($course,$worker);return [$a,$attempts->submit(['token'=>$a['token'],'answers'=>array_merge(array_fill(0,$correct,0),array_fill(0,10-$correct,1))])];};
$worker=$person(1);[$first,$grade]=$send($worker,6);
verify($first['max_attempts']===3&&$first['passing_score']===14,'Start carries authoritative criteria');
verify($grade['score']===12&&$grade['passed']===false&&$grade['remaining']===2&&$grade['retry_allowed'],'Below passing mark may retry');
[$second,$grade]=$send($worker,8);verify($grade['passed']===true&&$grade['remaining']===1&&$grade['retry_allowed'],'Passing with less than 90% may improve');
[$third,$grade]=$send($worker,8);verify($third['attempt']===3&&$grade['remaining']===0&&!$grade['retry_allowed'],'Configured third attempt consumed');
rejects(fn()=>$attempts->start($course,$worker+['max_attempts'=>10]),409,'Client cannot override attempt limit');
foreach([9,10] as $correct){
    $worker=$person($correct);[$a,$grade]=$send($worker,$correct);
    verify($grade['remaining']===0&&!$grade['retry_allowed']&&$grade['retry_block_reason']==='target_reached','90% and 100% prevent retries');
    rejects(fn()=>$attempts->start($course,$worker),409,'Target blocks a direct fresh request');
    $identified=$attempts->participant($course,$worker);verify($identified['exam_policy']['remaining']===0,'A fresh DNI lookup preserves target block');
    $again=$attempts->submit(['token'=>$a['token'],'answers'=>[]]);verify($again['score']===$grade['score']&&$again['remaining']===0,'Idempotent submission retains grade and retry restriction');
}
$report=new ReportRepository($db);$rows=$report->participants((int)$exam['id']);verify(count($rows)===3&&$rows[0]['passed']===true&&(int)$rows[0]['max_attempts']===3,'Reports use configured limit and pass mark');
$recent=$report->results();verify((int)$recent[0]['max_attempts']===3&&(int)$recent[0]['passing_score']===14,'Global reports carry criteria');
$public=(new CourseRepository($db,new CategoryRepository($db)))->get($course);verify((int)$public['exam']['max_attempts']===3&&(int)$public['exam']['passing_score']===14,'Public course exposes criteria without answers');
$workbook=(new Academia\Services\ReportExport($report))->workbook((int)$exam['id']);verify(str_starts_with($workbook,'PK'),'Result export still builds');
$updated=$exams->save($course,[...$input,'max_attempts'=>1]);verify((int)$updated['version']===2,'Changing attempts creates a version');
verify((int)$db->run('SELECT max_attempts FROM exams WHERE id=?',[$exam['id']])->fetchColumn()===3,'Prior version retains its limit');
$worker=$person(2);[$a,$grade]=$send($worker,7);verify($grade['passed']&&$grade['remaining']===0,'Single attempt and exact passing mark');
$pending=$attempts->start($course,$person(3));
$newer=$exams->save($course,[...$input,'max_attempts'=>1,'passing_score'=>18]);verify((int)$newer['version']===3,'Changing passing score creates a version');
$grade=$attempts->submit(['token'=>$pending['token'],'answers'=>array_merge(array_fill(0,7,0),array_fill(0,3,1))]);verify($grade['passing_score']===14&&$grade['passed'],'Pending original version retains original pass mark');
verify($exams->save($course,[...$input,'max_attempts'=>1,'passing_score'=>18,'duration_minutes'=>25])['id']===$newer['id'],'Schedule changes do not reset the policy/version');
$legacy=$exams->save($course,[...$input,'passing_score'=>20]);$db->run('UPDATE exams SET passing_score=NULL WHERE id=?',[$legacy['id']]);
$worker=$person(4);[$a,$grade]=$send($worker,7);verify($grade['passed']===null&&$grade['passing_score']===null,'Legacy results are not assigned an invented pass mark');
$strict=$exams->save($course,[...$input,'passing_score'=>20]);$worker=$person(5);[$a,$grade]=$send($worker,9);verify($grade['passed']===false&&$grade['remaining']===0,'90% stops retries even when creator requires 20');
$historical=$person(11);$db->run("INSERT INTO enrollments(exam_id,dni,name,job_title,phone,area) VALUES(?,?,'Histórico sintético','Prueba','','')",[$strict['id'],$historical['dni']]);$enrollment=(int)$db->pdo->lastInsertId();
$db->run("INSERT INTO attempts(enrollment_id,token_hash,status,score) VALUES(?,?,'completed',20)",[$enrollment,hash('sha256',random_bytes(32))]);
verify($attempts->participant($course,$historical)['exam_policy']['remaining']===0,'Historical grade without answers remains readable and prevents retry');
rejects(fn()=>$attempts->start($course,$historical),409,'Historical perfect grade also blocks new starts');
// Ratios near 90% must use counts, not a grade rounded to 18.00.
$near=['correct'=>8999,'review'=>array_fill(0,10000,[])];verify(!ExamPolicy::reachedTarget($near),'89.99% remains below the retry boundary');
verify(ExamPolicy::reachedTarget(['correct'=>9,'review'=>array_fill(0,10,[])]),'Exactly 90% reaches the boundary');
(new Academia\Migrations\ExamPolicyMigration($db))->run();(new Academia\Migrations\ExamPolicyMigration($db))->run();
verify($attempts->submit(['token'=>$a['token'],'answers'=>[]])['passing_score']===20,'Migration is repeatable without changing policy');
echo "OK $checks comprobaciones de intentos, aprobación, 90 %, historial, servidor y reportes.\n";
