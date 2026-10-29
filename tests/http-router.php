<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli-server'){http_response_code(404);exit;}
$config=require dirname(__DIR__).'/backend/config/application.php';
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name'])){http_response_code(403);exit;}
$_SERVER['SCRIPT_NAME']='/la-academia/index.php';
require dirname(__DIR__).'/public/index.php';
