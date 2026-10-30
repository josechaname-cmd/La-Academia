<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/backend/bootstrap.php';
if(($argv[1]??'')!=='--apply')exit("Uso: php tools/sync-database-permissions.php --apply\n");
$root=dirname(__DIR__);$runtime=require $root.'/backend/config/application.php';
$maintenance=require $root.'/backend/config/maintenance.php';
if($runtime['db_name']!==$maintenance['db_name']||$runtime['db_host']!==$maintenance['db_host']||!preg_match('/^[a-zA-Z0-9_]+$/D',$runtime['db_name']))throw new RuntimeException('La base de mantenimiento debe coincidir con la aplicación.');
$connection=new Academia\Support\Database($runtime);
$account=$connection->run('SELECT CURRENT_USER()')->fetchColumn();$separator=strrpos($account,'@');
if($separator===false||substr($account,0,$separator)==='root')throw new RuntimeException('Configura primero una cuenta web separada de mantenimiento.');
$db=new Academia\Support\Database($maintenance);
$identity=$db->pdo->quote(substr($account,0,$separator)).'@'.$db->pdo->quote(substr($account,$separator+1));
foreach(require $root.'/backend/config/database-permissions.php' as $table=>$permissions){
    if(!preg_match('/^[a-z_]+$/D',$table)||!preg_match('/^(SELECT|INSERT|UPDATE|DELETE)(,(SELECT|INSERT|UPDATE|DELETE))*$/D',$permissions))throw new RuntimeException('Permiso no permitido en la matriz de aplicación.');
    $db->pdo->exec('GRANT '.$permissions.' ON `'.$runtime['db_name'].'`.`'.$table.'` TO '.$identity);
}
echo "OK permisos por tabla sincronizados; sin cambiar contraseñas ni otorgar DDL o administración.\n";
