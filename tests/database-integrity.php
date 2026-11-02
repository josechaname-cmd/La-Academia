<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
use Academia\Support\Database;
use Academia\Support\DatabaseAudit;
use Academia\Migrations\DatabaseIntegrityMigration;

$config=require dirname(__DIR__).'/backend/config/application.php';
if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name']))throw new RuntimeException('Usa tests/isolated.php.');
$db=new Database($config);
if($db->run('SELECT DATABASE()')->fetchColumn()!==$config['db_name'])throw new RuntimeException('Base aislada no verificada.');
$checks=0;
function verify(bool $condition,string $label): void {global $checks;if(!$condition){fwrite(STDERR,'FAIL '.$label.PHP_EOL);throw new RuntimeException('Database regression failed');}$checks++;}

// Rebuild only this invocation's disposable database: exercise an actual clean install.
$tables=$db->run('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach($tables as $table)if(!preg_match('/^[a-z_]+$/D',$table))throw new RuntimeException('Tabla de prueba inesperada.');
$db->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
try{foreach($tables as $table)$db->pdo->exec("DROP TABLE `$table`");}finally{$db->pdo->exec('SET FOREIGN_KEY_CHECKS=1');}
$migrate=static function(){require dirname(__DIR__).'/backend/scripts/migrate.php';};
$migrate();$migrate();
verify((new DatabaseAudit($db))->run()['ok'],'Instalación nueva y migración repetida completas');
$db->run("INSERT INTO sites(name) VALUES('Sede sintética')");$site=(int)$db->pdo->lastInsertId();
$db->run("INSERT INTO employees(dni,full_name,job_title,site_id) VALUES('71234567','Persona sintética','Pruebas',?)",[$site]);
$db->run("INSERT INTO admins(name,dni,email,password_hash,site_id) VALUES('Acceso sintético','71234567','one@example.invalid','synthetic-not-a-password',?)",[$site]);
$db->run("INSERT INTO courses(site_id,title,category,description) VALUES(?,'Curso sintético','Pruebas','Descripción sintética')",[$site]);$course=(int)$db->pdo->lastInsertId();
$db->run("INSERT INTO files(course_id,original_name,storage_key,mime,extension,size) VALUES(?,'Prueba.pdf',?,'application/pdf','pdf',1)",[$course,str_repeat('a',48).'.pdf']);$file=(int)$db->pdo->lastInsertId();
$db->run('INSERT INTO file_previews(file_id,source_hash) VALUES(?,?)',[$file,str_repeat('b',64)]);

// Simulate older/fresh installs where columns exist but compound/unique indexes were skipped.
foreach(['admins'=>'dni','employees'=>'site_id','courses'=>'site_id'] as $table=>$column)$db->pdo->exec("ALTER TABLE `$table` ADD INDEX test_fk_support (`$column`)");
foreach(DatabaseIntegrityMigration::INDEXES as $name=>[$table])$db->pdo->exec("ALTER TABLE `$table` DROP INDEX `$name`");
$migration=new DatabaseIntegrityMigration($db);verify(count($migration->missing())===5,'Detecta índices omitidos con columnas existentes');
$db->run("INSERT INTO admins(name,dni,email,password_hash) VALUES('Duplicado sintético','71234567','two@example.invalid','synthetic-not-a-password')");$duplicate=(int)$db->pdo->lastInsertId();
try{$migration->run();verify(false,'Rechaza duplicados antes del DDL');}catch(RuntimeException $error){verify(str_contains($error->getMessage(),'duplicados por DNI'),'Explica conflicto sin exponer DNI');}
verify(count($migration->missing())===5,'Prevalidación no aplica migración parcial');
$db->run('DELETE FROM admins WHERE id=?',[$duplicate]);
$db->transaction(function()use($db,$course){
    for($i=0;$i<1201;$i++)$db->run('INSERT INTO activity_log(event_key,event_type,entity_type,entity_id,course_id,title,body) VALUES(?,?,?,?,?,?,?)',['synthetic:'.$i,$i===1200?'course.published':'course.saved','course',$course,$course,'Prueba','Prueba']);
});
$sql="EXPLAIN SELECT MAX(l.created_at) FROM activity_log l WHERE l.entity_type='course' AND l.entity_id=? AND l.event_type='course.published'";
$before=$db->run($sql,[$course])->fetch();
$migration->run();$migration->run();
verify(!$migration->missing(),'Actualización repetible sin índices duplicados');
$after=$db->run($sql,[$course])->fetch();
verify((int)$before['rows']>100&&(int)($after['rows']??0)<=1,'Publicación deja de examinar todo el historial del curso');
verify($db->run('EXPLAIN SELECT file_id FROM file_previews WHERE source_hash=? LIMIT 1',[str_repeat('b',64)])->fetch()['key']==='idx_preview_hash','Consulta de derivados utiliza el índice del hash');
verify((int)$db->run('SELECT COUNT(*) FROM activity_log')->fetchColumn()===1201,'La migración conserva el historial');
try{$db->run("INSERT INTO admins(name,dni,email,password_hash) VALUES('Duplicado sintético','71234567','three@example.invalid','synthetic-not-a-password')");verify(false,'Unicidad de acceso por trabajador');}catch(PDOException $error){verify(($error->errorInfo[1]??null)===1062,'DNI duplicado rechazado por base de datos');}
$db->pdo->exec('START TRANSACTION READ ONLY');
try{$report=(new DatabaseAudit($db))->run();}finally{$db->pdo->rollBack();}
verify($report['ok'],'Diagnóstico funciona en transacción de solo lectura');
verify(!str_contains(json_encode($report),'71234567')&&!str_contains(json_encode($report),'example.invalid'),'Diagnóstico no expone datos personales');
$db->run('UPDATE courses SET cover_file_id=? WHERE id=?',[$file+100,$course]);
$broken=(new DatabaseAudit($db))->run();$checksByName=array_column($broken['checks'],null,'check');
verify(!$broken['ok']&&$checksByName['course_document_cover']['failures']===1,'Detecta referencias lógicas no protegidas por FK');
$db->run('UPDATE courses SET cover_file_id=NULL WHERE id=?',[$course]);
echo "OK $checks comprobaciones BD: instalación limpia, actualización, duplicados, conservación, diagnóstico privado y EXPLAIN publicación ".$before['rows'].' -> '.($after['rows']??0)." filas estimadas.\n";
