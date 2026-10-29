<?php
declare(strict_types=1);
// Read-only: schema metadata, aggregate integrity checks and SELECT execution plans.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
$config=require dirname(__DIR__).'/config/application.php';
$db=new Academia\Support\Database($config);
$db->pdo->exec('START TRANSACTION READ ONLY');
try{
    $data=['date'=>date(DATE_ATOM),'runtime'=>['php'=>PHP_VERSION,'database'=>$db->run('SELECT VERSION()')->fetchColumn()],
        'configuration'=>['environment'=>$config['environment'],'root_database_user'=>$config['db_user']==='root','password_configured'=>$config['db_password']!=='','local_unlimited_login'=>$config['local_unlimited_login']]];
    $data['tables']=$db->run('SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME')->fetchAll();
    $data['columns']=$db->run('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION')->fetchAll();
    $data['indexes']=$db->run('SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) columns_list FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() GROUP BY TABLE_NAME,INDEX_NAME,NON_UNIQUE ORDER BY TABLE_NAME,INDEX_NAME')->fetchAll();
    $data['foreign_keys']=$db->run('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')->fetchAll();
    $data['integrity']=[];
    foreach($data['foreign_keys'] as $key){
        foreach($key as $identifier)if(!preg_match('/^[a-z_]+$/D',$identifier))throw new RuntimeException('Unexpected schema identifier');
        ['TABLE_NAME'=>$table,'COLUMN_NAME'=>$column,'REFERENCED_TABLE_NAME'=>$parent,'REFERENCED_COLUMN_NAME'=>$parentColumn]=$key;
        $data['integrity']['fk:'.$table.'.'.$column]=(int)$db->run("SELECT COUNT(*) FROM `$table` child LEFT JOIN `$parent` parent ON parent.`$parentColumn`=child.`$column` WHERE child.`$column` IS NOT NULL AND parent.`$parentColumn` IS NULL")->fetchColumn();
    }
    $queries=[
        'orphan_cover'=>'SELECT COUNT(*) FROM courses c LEFT JOIN files f ON f.id=c.cover_file_id WHERE c.cover_file_id IS NOT NULL AND (f.id IS NULL OR f.course_id<>c.id)',
        'invalid_score'=>'SELECT COUNT(*) FROM attempts WHERE score<0 OR score>20',
        'invalid_exam_json'=>'SELECT COUNT(*) FROM exams WHERE JSON_VALID(questions_json)=0',
        'incomplete_completed'=>"SELECT COUNT(*) FROM attempts WHERE status='completed' AND (score IS NULL OR submitted_at IS NULL)",
        'multiple_pending'=>"SELECT COUNT(*) FROM (SELECT enrollment_id FROM attempts WHERE status='pending' GROUP BY enrollment_id HAVING COUNT(*)>1) x",
        'multiple_active_popups'=>"SELECT GREATEST(COUNT(*)-1,0) FROM home_popup WHERE active=1",
        'trainer_employee_mismatch'=>"SELECT COUNT(*) FROM admins a LEFT JOIN employees e ON e.dni=a.dni WHERE a.role='capacitador' AND a.active=1 AND (e.dni IS NULL OR e.active<>1 OR NOT (a.site_id<=>e.site_id))",
        'incomplete_published'=>"SELECT COUNT(*) FROM courses c WHERE c.status='published' AND (NOT EXISTS(SELECT 1 FROM files f WHERE f.course_id=c.id) OR (c.exam_required=1 AND NOT EXISTS(SELECT 1 FROM exams x WHERE x.course_id=c.id)))",
    ];
    foreach($queries as $name=>$sql)$data['integrity'][$name]=(int)$db->run($sql)->fetchColumn();
    $before=(int)$db->run("SHOW SESSION STATUS LIKE 'Com_stmt_execute'")->fetch()['Value'];$start=hrtime(true);
    $summary=(new Academia\Repositories\ReportRepository($db))->summary();
    $elapsed=(hrtime(true)-$start)/1e6;$after=(int)$db->run("SHOW SESSION STATUS LIKE 'Com_stmt_execute'")->fetch()['Value'];
    $data['summary_measurement']=['courses_with_scores'=>count($summary['score_averages']),'prepared_queries'=>$after-$before-1,'elapsed_ms'=>round($elapsed,3),'note'=>'Una ejecución local; no es prueba de carga ni garantía de latencia.'];
    $latest="FROM courses c JOIN exams x ON x.course_id=c.id JOIN enrollments e ON e.exam_id=x.id JOIN (SELECT enrollment_id,MAX(id) id FROM attempts WHERE status='completed' GROUP BY enrollment_id) latest_attempt ON latest_attempt.enrollment_id=e.id JOIN attempts a ON a.id=latest_attempt.id WHERE c.status<>'archived'";
    $plans=[
        'summary_averages'=>'SELECT c.id,c.title,AVG(a.score) '.$latest.' GROUP BY c.id,c.title',
        'summary_top_scores'=>'SELECT course_id,score FROM (SELECT c.id course_id,a.score,ROW_NUMBER() OVER(PARTITION BY c.id ORDER BY a.score DESC,a.id DESC) rank_position '.$latest.') ranked WHERE rank_position<=3 ORDER BY course_id,rank_position',
    ];
    foreach($plans as $name=>$sql)$data['plans'][$name]=['sql'=>$sql,'explain'=>$db->run('EXPLAIN '.$sql)->fetchAll()];
    echo json_encode($data,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR).PHP_EOL;
}finally{$db->pdo->rollBack();}
