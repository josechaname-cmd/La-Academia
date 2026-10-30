<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;

final class PolicyTool {
 private const SELECT='SELECT p.*,s.name site_name,f.original_name,f.extension,f.size FROM policies p JOIN sites s ON s.id=p.site_id JOIN files f ON f.id=p.file_id';
 public function __construct(private Database $db,private FileTool $files) {}
 public function list(?array $actor=null): array {
  $site=$actor?CoursePolicy::siteId($actor):null;
  return $this->db->run(self::SELECT.($actor?($site!==null?' WHERE p.site_id=?':''):' WHERE p.active=1').' ORDER BY p.updated_at DESC,p.id DESC',$site!==null?[$site]:[])->fetchAll();
 }
 public function get(int $id,?array $actor=null): array {
  $row=$this->db->run(self::SELECT.' WHERE p.id=?'.($actor?'':' AND p.active=1'),[$id])->fetch();
  if(!$row)Http::fail(404,'Política no disponible.');
  if($actor)CoursePolicy::requireCourse($actor,$row);
  return $row;
 }
 public function save(array $data,?array $upload,?int $id,array $actor): array {
  $title=Validation::text($data,'title',3,160);$description=Validation::text($data,'description',10,1500);
  $active=Validation::number($data,'active',0,1);
  $hasFile=$upload&&($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE;
  if(!$id&&!$hasFile)Http::fail(422,'Selecciona el PDF de la política.',['file'=>'Adjunta un PDF.']);
  if($hasFile&&strtolower(pathinfo($upload['name']??'',PATHINFO_EXTENSION))!=='pdf')Http::fail(422,'Las políticas solo admiten archivos PDF.',['file'=>'Selecciona un PDF.']);
  return $this->db->transaction(function()use($data,$upload,$id,$actor,$title,$description,$active,$hasFile){
   if($id)$this->db->run('SELECT id FROM policies WHERE id=? FOR UPDATE',[$id])->fetch();
   $current=$id?$this->get($id,$actor):null;
   $site=$current?(int)$current['site_id']:($actor['role']==='superadmin'?Validation::number($data,'site_id',1,PHP_INT_MAX):CoursePolicy::siteId($actor));
   if(!$site||!$this->db->run('SELECT id FROM sites WHERE id=? AND active=1',[$site])->fetchColumn())Http::fail(422,'Selecciona una sede activa.',['site_id'=>'Selecciona una sede activa.']);
   CoursePolicy::requireCourse($actor,['site_id'=>$site]);
   $file=$hasFile?$this->files->add($upload,null):['id'=>$current['file_id']];
   if($id){
    $this->db->run('UPDATE policies SET title=?,description=?,active=?,file_id=? WHERE id=?',[$title,$description,$active,$file['id'],$id]);
    if($hasFile)$this->files->remove((int)$current['file_id']);
   }else{
    $this->db->run('INSERT INTO policies(site_id,created_by,title,description,active,file_id) VALUES(?,?,?,?,?,?)',[$site,$actor['id'],$title,$description,$active,$file['id']]);$id=(int)$this->db->pdo->lastInsertId();
   }
   return $this->get($id,$actor);
  });
 }
 public function remove(int $id,array $actor): array {
  return $this->db->transaction(function()use($id,$actor){
   $this->db->run('SELECT id FROM policies WHERE id=? FOR UPDATE',[$id])->fetch();$row=$this->get($id,$actor);
   $this->db->run('DELETE FROM policies WHERE id=?',[$id]);$this->files->remove((int)$row['file_id']);
   return ['deleted'=>true];
  });
 }
}
