<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
if(array_diff(array_slice($argv,1),['--json'])){fwrite(STDERR,"Uso: php backend/scripts/check-database.php [--json]\n");exit(2);}
$db=new Academia\Support\Database(require dirname(__DIR__).'/config/maintenance.php');
// Consistent snapshot even when views or exams are being recorded concurrently.
$db->pdo->exec('START TRANSACTION READ ONLY');
try{$report=(new Academia\Support\DatabaseAudit($db))->run();}
finally{$db->pdo->rollBack();}
if(in_array('--json',$argv,true))echo json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR).PHP_EOL;
else{
    echo ($report['ok']?'OK':'REVISAR').' base de datos: '.count($report['checks'])." comprobaciones; diagnóstico de solo lectura.\n";
    foreach($report['checks'] as $check)if(!$check['ok'])echo $check['check'].': '.$check['failures']." incidencia(s).\n";
}
exit($report['ok']?0:1);
