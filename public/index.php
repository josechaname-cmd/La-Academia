<?php
declare(strict_types=1);

// The only PHP entry point. No business logic or credentials belong in public/.
$backend = dirname(__DIR__).'/backend';
if (!is_file($backend.'/bootstrap.php')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit('La Academia no está disponible temporalmente. Contacta con soporte.');
}
require $backend.'/bootstrap.php';
Academia\Http\WebKernel::handle(require $backend.'/config/application.php');
