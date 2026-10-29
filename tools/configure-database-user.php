<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/backend/bootstrap.php';
if (($argv[1] ?? '') !== '--apply') exit("Uso: php tools/configure-database-user.php --apply. Requiere copia privada y autorización de mantenimiento.\n");
$root = dirname(__DIR__);
$config = require $root.'/backend/config/application.php';
$db = new Academia\Support\Database($config);
$private = (getenv('LOCALAPPDATA') ?: '').'/LaAcademia/private/maintenance.php';
if (!is_dir(dirname($private)) || is_file($private) || $config['db_user'] !== 'root') throw new RuntimeException('Precondiciones de mantenimiento no satisfechas.');
$account = 'la_academia_app';
$host = '127.0.0.1';
if ($config['db_host'] !== $host || !preg_match('/^[a-zA-Z0-9_]+$/D', $config['db_name'])) throw new RuntimeException('Configuración no compatible con este procedimiento local.');
if ($db->run('SELECT 1 FROM mysql.user WHERE User=? AND Host=?', [$account,$host])->fetchColumn()) throw new RuntimeException('La cuenta ya existe; revisar antes de modificarla.');
$grants = require $root.'/backend/config/database-permissions.php';
$password = bin2hex(random_bytes(32));
$identity = $db->pdo->quote($account).'@'.$db->pdo->quote($host);
$created = false;
try {
    $db->pdo->exec('CREATE USER '.$identity.' IDENTIFIED BY '.$db->pdo->quote($password));
    $created = true;
    foreach ($grants as $table=>$permissions) $db->pdo->exec('GRANT '.$permissions.' ON `'.$config['db_name'].'`.`'.$table.'` TO '.$identity);
    $runtime = array_replace($config, ['db_user'=>$account, 'db_password'=>$password]);
    $connection = new Academia\Support\Database($runtime);
    foreach (array_keys($grants) as $table) $connection->run('SELECT 1 FROM `'.$table.'` LIMIT 0');
    // Original configuration is kept once outside the document root, with private NTFS ACLs.
    if (!copy($root.'/storage/config.php', $private)) throw new RuntimeException('No se pudo preservar configuración de mantenimiento.');
    $temporary = $root.'/storage/config-runtime.pending.php';
    if (file_put_contents($temporary, "<?php\ndeclare(strict_types=1);\nreturn ".var_export($runtime,true).";\n", LOCK_EX) === false) throw new RuntimeException('No se pudo preparar configuración.');
    // Windows rename replaces the existing destination; no period without a config file.
    if (!rename($temporary, $root.'/storage/config.php')) throw new RuntimeException('No se pudo activar la cuenta de aplicación.');
    echo "OK cuenta de aplicación local con permisos por tabla; credenciales excluidas de la salida.\n";
} catch (Throwable $error) {
    if ($created) $db->pdo->exec('DROP USER '.$identity);
    throw $error;
}
