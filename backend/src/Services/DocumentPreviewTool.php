<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\FileCache;
use Academia\Support\Http;
final class DocumentPreviewTool {
 public function __construct(private Database $db,private array $config) {}
 public function enqueue(int $id,bool $retry=false): array {
  if(!$this->db->run("SELECT id FROM files WHERE id=? AND course_id IS NOT NULL AND extension IN ('pdf','ppt','pptx')",[$id])->fetchColumn())Http::fail(422,'Las vistas previas se generan únicamente para PDF y PowerPoint.');
  $this->db->run('INSERT IGNORE INTO file_previews(file_id) VALUES(?)',[$id]);
  if($retry)$this->db->run("UPDATE file_previews SET status='queued',error_message=NULL,attempts=0 WHERE file_id=? AND status='failed'",[$id]);
  return $this->status($id);
 }
 public function status(int $id): array {
  $row=$this->db->run('SELECT status,source_hash,error_message FROM file_previews WHERE file_id=?',[$id])->fetch();
  if($row)$row['error_message']=\Academia\Exceptions\PreviewException::publicMessage($row['error_message']);
  return $row?:['status'=>'unavailable','source_hash'=>null,'error_message'=>'Este archivo no tiene vista previa.'];
 }
 public static function kick(array $config): void {
  if(!($config['preview_worker_enabled']??true))return;
  if(PHP_OS_FAMILY!=='Windows')return; // On other hosts run the documented CLI worker through the service manager.
  $script=dirname(__DIR__,3).'/tools/start-preview-worker.ps1';
  $p=@proc_open(['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe','-NoProfile','-NonInteractive','-WindowStyle','Hidden','-File',$script],[0=>['file','NUL','r'],1=>['file','NUL','a'],2=>['file','NUL','a']],$pipes,null,null,['bypass_shell'=>true,'create_no_window'=>true]);
  if(is_resource($p))proc_close($p);
 }
 public function stream(array $file,bool $pdf=false): never {
  $state=$this->status((int)$file['id']);
  if($state['status']!=='ready')Http::fail(409,'La vista previa todavía no está disponible.');
  $hash=$state['source_hash'];if(!preg_match('/^[a-f0-9]{64}$/',(string)$hash))Http::fail(404,'Vista previa no disponible.');
  $path=$this->config['preview_directory'].'/'.$hash.($pdf?'.pdf':'.jpg');
  if(!is_file($path))Http::fail(404,'Vista previa no disponible. Reintenta el procesamiento.');
  // Permission is checked by ContentAgent before conditional responses or file access.
  $etag='"'.$hash.($pdf?'-pdf':'-jpg').'"';header('Cache-Control: private, no-cache');header('ETag: '.$etag);
  if(($_SERVER['HTTP_IF_NONE_MATCH']??'')===$etag){http_response_code(304);exit;}
  header('Content-Type: '.($pdf?'application/pdf':'image/jpeg'));header('X-Content-Type-Options: nosniff');
  header('Content-Disposition: inline');header('Content-Length: '.filesize($path));session_write_close();readfile($path);exit;
 }
 private function runProcess(array $args,int $timeout=120): void {
  $log=$this->config['preview_directory'].'/conversion.log';
  $p=proc_open($args,[0=>['file',PHP_OS_FAMILY==='Windows'?'NUL':'/dev/null','r'],1=>['file',$log,'w'],2=>['file',$log,'a']],$pipes,null,null,['bypass_shell'=>true,'create_no_window'=>true]);
  if(!is_resource($p))throw new \Academia\Exceptions\PreviewException('No se pudo iniciar el conversor.');
  $start=time();$exit=-1;
  do{$state=proc_get_status($p);if(!$state['running']){$exit=$state['exitcode'];break;}
   if(time()-$start>$timeout){
    if(PHP_OS_FAMILY==='Windows'){$kill=proc_open(['C:\\Windows\\System32\\taskkill.exe','/PID',(string)$state['pid'],'/T','/F'],[0=>['file','NUL','r'],1=>['file','NUL','a'],2=>['file','NUL','a']],$kp,null,null,['bypass_shell'=>true,'create_no_window'=>true]);if(is_resource($kill))proc_close($kill);}
    proc_terminate($p);proc_close($p);throw new \Academia\Exceptions\PreviewException('El archivo excedió el tiempo de procesamiento.');
   }usleep(100000);
  }while(true);
  proc_close($p);if($exit!==0)throw new \Academia\Exceptions\PreviewException('No se pudo convertir el archivo. Comprueba que no esté dañado ni protegido.');
 }
 public function process(array $file): string {
  if(!preg_match('/^[a-f0-9]{48}\.(pdf|ppt|pptx)$/',$file['storage_key']))throw new \Academia\Exceptions\PreviewException('Referencia de material no válida.');
  $source=$this->config['storage'].'/'.$file['storage_key'];
  if(!is_file($source))throw new \Academia\Exceptions\PreviewException('No se encuentra el archivo original.');
  $dir=$this->config['preview_directory'];if(!is_dir($dir))mkdir($dir,0700,true);
  $hash=hash_file('sha256',$source);$jpg=$dir.'/'.$hash.'.jpg';$pdf=$dir.'/'.$hash.'.pdf';
  if(is_file($jpg)&&is_file($pdf))return $hash;
  if(!is_file($this->config['pdftoppm']))throw new \Academia\Exceptions\PreviewException('Falta configurar el conversor de PDF.');
  if($file['extension']==='pdf'){if(!copy($source,$pdf))throw new \Academia\Exceptions\PreviewException('No se pudo preparar el PDF.');}
  else{
   if(!is_file($this->config['soffice']))throw new \Academia\Exceptions\PreviewException('Falta configurar LibreOffice para PowerPoint.');
   $profile=$dir.'/office-profile';if(!is_dir($profile.'/user'))mkdir($profile.'/user',0700,true);
   file_put_contents($profile.'/user/registrymodifications.xcu','<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>');
   $this->runProcess([$this->config['soffice'],'-env:UserInstallation=file:///'.str_replace(' ','%20',str_replace('\\','/',$profile)),'--headless','--norestore','--nodefault','--convert-to','pdf:impress_pdf_Export','--outdir',$dir,$source]);
   $converted=$dir.'/'.pathinfo($file['storage_key'],PATHINFO_FILENAME).'.pdf';
   if(!is_file($converted)||filesize($converted)<10)throw new \Academia\Exceptions\PreviewException('No se pudo convertir la presentación.');
   if(!rename($converted,$pdf))throw new \Academia\Exceptions\PreviewException('No se pudo guardar la vista previa.');
  }
  $prefix=$dir.'/'.$hash.'-pending';
  $this->runProcess([$this->config['pdftoppm'],'-f','1','-singlefile','-scale-to','1200','-jpeg','-jpegopt','quality=85',$pdf,$prefix]);
  if(!is_file($prefix.'.jpg')||!getimagesize($prefix.'.jpg'))throw new \Academia\Exceptions\PreviewException('No se pudo generar la primera página.');
  if(!rename($prefix.'.jpg',$jpg))throw new \Academia\Exceptions\PreviewException('No se pudo guardar la portada.');
  return $hash;
 }
 public function work(): int {
  $dir=$this->config['preview_directory'];if(!is_dir($dir))mkdir($dir,0700,true);
  $lock=fopen($dir.'/worker.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))return 0;
  $done=0;
  try{
   $this->db->run("UPDATE file_previews SET status=IF(attempts<3,'queued','failed'),error_message='Procesamiento interrumpido. Puedes reintentar.' WHERE status='processing' AND updated_at<NOW()-INTERVAL 10 MINUTE");
   while($file=$this->db->run("SELECT f.* FROM file_previews p JOIN files f ON f.id=p.file_id WHERE p.status='queued' ORDER BY p.file_id LIMIT 1")->fetch()){
    $this->db->run("UPDATE file_previews SET status='processing',attempts=attempts+1,error_message=NULL WHERE file_id=?",[$file['id']]);
    try{$hash=$this->process($file);$this->db->run("UPDATE file_previews SET status='ready',source_hash=?,error_message=NULL WHERE file_id=?",[$hash,$file['id']]);}
    catch(\Throwable $error){$message=$error instanceof \Academia\Exceptions\PreviewException?\Academia\Exceptions\PreviewException::publicMessage($error->getMessage()):\Academia\Exceptions\PreviewException::GENERIC;\Academia\Support\Logger::failure($error,'preview');$this->db->run("UPDATE file_previews SET status='failed',error_message=? WHERE file_id=?",[mb_substr($message,0,250),$file['id']]);}
    (new FileCache($this->config['cache_directory']))->invalidate();$done++;
   }
  }finally{flock($lock,LOCK_UN);fclose($lock);}
  return $done;
 }
}
