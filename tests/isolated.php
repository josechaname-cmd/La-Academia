<?php
declare(strict_types=1);

// Copies table definitions only. No production rows or credentials are copied.
if (PHP_SAPI !== 'cli') exit(1);
require dirname(__DIR__).'/backend/bootstrap.php';

use Academia\Support\Database;

$root = dirname(__DIR__);
$targets = array_slice($argv, 1) ?: ['run.php', 'backend-regression.php'];
if (count($targets) > 1) {
    // Suites that intentionally commit concurrency fixtures must not contaminate each other.
    foreach ($targets as $target) {
        $child = proc_open([PHP_BINARY, __FILE__, $target], [0=>['pipe','r'],1=>STDOUT,2=>STDERR], $childPipes, $root, null, ['bypass_shell'=>true,'create_no_window'=>true]);
        if (!is_resource($child)) throw new RuntimeException('No se pudo iniciar el aislamiento.');
        fclose($childPipes[0]);
        if (proc_close($child) !== 0) exit(1);
    }
    exit;
}
$config = require $root.'/backend/config/maintenance.php';
$source = new Database($config);
$name = 'academia_test_'.bin2hex(random_bytes(8));
$directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.$name;
if (!mkdir($directory, 0700)) throw new RuntimeException('No se pudo crear el entorno de pruebas.');
$created = false;
$previous = getenv('ACADEMIA_CONFIG');
$remove = static function (string $path) use (&$remove, $directory): void {
    $resolved = realpath($path);
    $base = realpath($directory);
    if ($resolved === false || $base === false || ($resolved !== $base && !str_starts_with($resolved, $base.DIRECTORY_SEPARATOR))) {
        throw new RuntimeException('Limpieza fuera del temporal de pruebas rechazada.');
    }
    if (is_dir($path) && !is_link($path)) {
        foreach (array_diff(scandir($path), ['.', '..']) as $child) $remove($path.DIRECTORY_SEPARATOR.$child);
        rmdir($path);
    } else unlink($path);
};
try {
    $definitions = [];
    foreach ($source->run('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
        if (!preg_match('/^[a-z_]+$/D', $table)) throw new RuntimeException('Tabla inesperada.');
        $definition = $source->run('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        $definitions[] = preg_replace('/ AUTO_INCREMENT=\d+/', '', $definition);
    }
    $source->pdo->exec('CREATE DATABASE `'.$name.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
    $created = true;
    $test = new Database(array_replace($config, ['db_name' => $name]));
    if ($test->run('SELECT DATABASE()')->fetchColumn() !== $name) throw new RuntimeException('Aislamiento de base incorrecto.');
    $test->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach ($definitions as $definition) $test->pdo->exec($definition);
    $test->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    (new Academia\Migrations\ExamPolicyMigration($test))->run();
    (new Academia\Migrations\SliderContentMigration($test))->run();
    $test->run("INSERT INTO sites(name,address) VALUES('Sede de pruebas','')");
    $test->run("INSERT INTO categories(scope,name) VALUES('course','Pruebas'),('event','Pruebas')");
    $test->run('INSERT INTO home_popup_guard(id) VALUES(1)');
    foreach (['files', 'previews', 'cache', 'sessions'] as $folder) mkdir($directory.'/'.$folder, 0700);
    $private = $previous ?: ($config['maintenance_config'] ?? $root.'/storage/config.php');
    $overrides = ['db_name'=>$name, 'environment'=>'test', 'preview_worker_enabled'=>false, 'storage'=>$directory.'/files', 'preview_directory'=>$directory.'/previews', 'cache_directory'=>$directory.'/cache'];
    $configFile = $directory.'/config.php';
    file_put_contents($configFile, '<?php return array_replace(is_file('.var_export($private, true).') ? require '.var_export($private, true).' : [], '.var_export($overrides, true).');');
    putenv('ACADEMIA_CONFIG='.$configFile);
    foreach ($targets as $target) {
        if (!in_array($target, ['run.php', 'backend-regression.php', 'concurrency.php', 'personnel-import.php', 'http-isolated.php', 'exam-policy.php'], true)) throw new RuntimeException('Suite no permitida.');
        $process = proc_open([PHP_BINARY, $root.'/tests/'.$target], [0=>['pipe','r'],1=>STDOUT,2=>STDERR], $pipes, $root, null, ['bypass_shell'=>true,'create_no_window'=>true]);
        if (!is_resource($process)) throw new RuntimeException('No se pudo iniciar la suite.');
        fclose($pipes[0]);
        if (proc_close($process) !== 0) throw new RuntimeException('Falló la suite '.$target);
    }
    echo "OK aislamiento: esquema temporal y archivos sintéticos; sin copiar filas reales.\n";
} finally {
    putenv($previous === false ? 'ACADEMIA_CONFIG' : 'ACADEMIA_CONFIG='.$previous);
    // Only the database created by this invocation can be removed.
    if ($created && preg_match('/^academia_test_[a-f0-9]{16}$/D', $name) && $name !== $config['db_name']) {
        unset($test);
        $source->pdo->exec('DROP DATABASE `'.$name.'`');
    }
    $remove($directory);
}
