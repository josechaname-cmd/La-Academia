<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__).'/bootstrap.php';

use Academia\Support\Database;

$config = require dirname(__DIR__).'/config/application.php';
$db = new Database($config);

$payload = json_decode(file_get_contents('php://stdin'), true);
if (!is_array($payload) || array_is_list($payload) === false) {
    throw new RuntimeException('La entrada debe ser una lista JSON de colaboradores.');
}

$count = (new Academia\Repositories\PersonnelRepository($db))->replaceRows($payload);
echo 'Personal sincronizado: '.$count." colaboradores activos.\n";
