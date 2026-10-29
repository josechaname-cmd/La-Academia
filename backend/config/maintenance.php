<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$config = require __DIR__.'/application.php';
// Explicit test configuration always wins; never fall back to real credentials in a test.
if (getenv('ACADEMIA_CONFIG')) return $config;
$path = getenv('ACADEMIA_MAINTENANCE_CONFIG') ?: (getenv('LOCALAPPDATA') ?: '').'/LaAcademia/private/maintenance.php';
if (is_file($path)) return array_replace($config, require $path, ['maintenance_config'=>$path]);
return $config;
