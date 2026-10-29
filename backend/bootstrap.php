<?php
declare(strict_types=1);
spl_autoload_register(static function(string $class): void {
    $prefix='Academia\\';
    if(!str_starts_with($class,$prefix))return;
    $relative=substr($class,strlen($prefix));
    $file=__DIR__.'/src/'.str_replace('\\','/',$relative).'.php';
    if(is_file($file))require_once $file;
});
date_default_timezone_set('America/Lima');
ini_set('display_errors','0');
set_exception_handler([Academia\Http\ErrorHandler::class, 'uncaught']);
