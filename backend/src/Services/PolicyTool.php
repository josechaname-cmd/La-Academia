<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;

final class PolicyTool {
 private const SELECT='SELECT p.id,p.created_by,p.title,p.description,p.file_id,p.cover_image_id,p.active,p.created_at,p.updated_at,f.original_name,f.extension,f.size FROM policies p JOIN files f ON f.id=p.file_id';
 public function __construct(private Database $db,private FileTool $files) {}
 public function list(?array $actor=null): array {
  return $this->db->run(self::SELECT.($actor?'':' WHERE p.active=1').' ORDER BY p.updated_at DESC,p.id DESC')->fetchAll();
 }
 public function get(int $id,?array $actor=null): array {
  $row=$this->db->run(self::SELECT.' WHERE p.id=?'.($actor?'':' AND p.active=1'),[$id])->fetch();
  if(!$row)Http::fail(404,'Política no disponible.');
  return $row;
 }
 public function save(array $data,?array $upload,?int $id,array $actor,?array $coverUpload=null): array {
  $title=Validation::text($data,'title',3,160);$description=Validation::text($data,'description',10,1500);
  $active=Validation::number($data,'active',0,1);
  $hasFile=$upload&&($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE;
  $hasCover=$coverUpload&&($coverUpload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE;
  if(!$id&&!$hasFile)Http::fail(422,'Selecciona el PDF de la política.',['file'=>'Adjunta un PDF.']);
  if(!$id&&!$hasCover)Http::fail(422,'Selecciona una imagen de portada.',['cover_image'=>'Adjunta una imagen JPG, PNG o WEBP.']);
  if($hasFile&&strtolower(pathinfo($upload['name']??'',PATHINFO_EXTENSION))!=='pdf')Http::fail(422,'Las políticas solo admiten archivos PDF.',['file'=>'Selecciona un PDF.']);
  return $this->db->transaction(function()use($upload,$coverUpload,$id,$actor,$title,$description,$active,$hasFile,$hasCover){
   if($id)$this->db->run('SELECT id FROM policies WHERE id=? FOR UPDATE',[$id])->fetch();
   $current=$id?$this->get($id,$actor):null;
   $file=$hasFile?$this->files->add($upload,null):['id'=>$current['file_id']];
   try{$cover=$hasCover?$this->files->add($coverUpload,null,true):['id'=>$current['cover_image_id']??null];}
   catch(\Academia\Http\ApiException $error){
    if($error->getCode()!==422)throw $error;
    throw new \Academia\Http\ApiException($error->getCode(),$error->getMessage(),['cover_image'=>$error->getMessage()],$error->errorCode);
   }
   if($id){
    $this->db->run('UPDATE policies SET title=?,description=?,active=?,file_id=?,cover_image_id=? WHERE id=?',[$title,$description,$active,$file['id'],$cover['id'],$id]);
    if($hasFile)$this->files->remove((int)$current['file_id']);
    if($hasCover&&$current['cover_image_id'])$this->files->remove((int)$current['cover_image_id']);
   }else{
    $this->db->run('INSERT INTO policies(created_by,title,description,active,file_id,cover_image_id) VALUES(?,?,?,?,?,?)',[$actor['id'],$title,$description,$active,$file['id'],$cover['id']]);$id=(int)$this->db->pdo->lastInsertId();
   }
   return $this->get($id,$actor);
  });
 }
 public function remove(int $id,array $actor): array {
  return $this->db->transaction(function()use($id,$actor){
   $this->db->run('SELECT id FROM policies WHERE id=? FOR UPDATE',[$id])->fetch();$row=$this->get($id,$actor);
   $this->db->run('DELETE FROM policies WHERE id=?',[$id]);$this->files->remove((int)$row['file_id']);
   if($row['cover_image_id'])$this->files->remove((int)$row['cover_image_id']);
   return ['deleted'=>true];
  });
 }
}
