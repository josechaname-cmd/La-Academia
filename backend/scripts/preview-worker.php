<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/bootstrap.php';
$config=require dirname(__DIR__).'/config/application.php';
$db=new Academia\Support\Database($config);
echo 'Materiales procesados: '.(new Academia\Services\DocumentPreviewTool($db,$config))->work().PHP_EOL;
