<?php
declare(strict_types=1);
namespace Academia\Services;

use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Logger;

/** Removes one authorized course and its owned content, after explicit confirmation. */
final class CourseDeletionTool {
    public function __construct(private Database $db,private FileTool $files,private array $config) {}

    public function remove(int $id,array $input): array {
        if(($input['confirm_delete']??null)!==true)Http::fail(422,'Confirma la eliminación definitiva de la capacitación.');
        $dir=$this->config['preview_directory'];if(!is_dir($dir))mkdir($dir,0700,true);
        $lock=fopen($dir.'/worker.lock','c');
        if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){
            if(is_resource($lock))fclose($lock);
            Http::fail(409,'Se están procesando materiales. Espera un momento y vuelve a eliminar.');
        }
        $release=static function()use(&$lock){if(is_resource($lock)){flock($lock,LOCK_UN);fclose($lock);}$lock=null;};
        try{return $this->db->transaction(function()use($id,$release){
            $this->db->afterRollback($release);
            $course=$this->db->run('SELECT id,custom_cover_id FROM courses WHERE id=? FOR UPDATE',[$id])->fetch();
            if(!$course)Http::fail(404,'Capacitación no disponible.');
            $owned=$this->db->run('SELECT f.*,p.source_hash FROM files f LEFT JOIN file_previews p ON p.file_id=f.id WHERE f.course_id=?',[$id])->fetchAll();
            $images=$this->db->run('SELECT image_id FROM announcements WHERE course_id=? AND image_id IS NOT NULL',[$id])->fetchAll(\PDO::FETCH_COLUMN);
            if($course['custom_cover_id'])$images[]=$course['custom_cover_id'];
            $this->db->run("DELETE FROM activity_log WHERE course_id=? OR (entity_type='course' AND entity_id=?) OR exam_id IN (SELECT id FROM exams WHERE course_id=?) OR (entity_type='exam' AND entity_id IN (SELECT id FROM exams WHERE course_id=?))",[$id,$id,$id,$id]);
            $this->db->run('DELETE FROM announcements WHERE course_id=?',[$id]);
            // Foreign keys remove files/previews, all exam versions, enrollments and attempts.
            $this->db->run('DELETE FROM courses WHERE id=?',[$id]);
            foreach(array_unique($images) as $image){
                $file=$this->db->run('SELECT * FROM files WHERE id=? AND course_id IS NULL FOR UPDATE',[$image])->fetch();
                if(!$file)continue;
                $referenced=$this->db->run('SELECT id FROM courses WHERE custom_cover_id=? UNION ALL SELECT id FROM announcements WHERE image_id=? UNION ALL SELECT id FROM events WHERE image_id=? UNION ALL SELECT event_id FROM event_images WHERE file_id=? UNION ALL SELECT id FROM home_popup WHERE image_id=? UNION ALL SELECT id FROM home_slides WHERE image_id=? UNION ALL SELECT id FROM policies WHERE cover_image_id=? LIMIT 1',array_fill(0,7,$image))->fetchColumn();
                if($referenced)continue;
                $this->db->run('DELETE FROM files WHERE id=?',[$image]);$owned[]=$file;
            }
            $hashes=[];
            foreach($owned as $file){
                $hash=$file['source_hash']??'';
                // Failed conversion may have written a derivative before marking the queue ready.
                if($hash===''&&in_array($file['extension'],['pdf','ppt','pptx'],true)&&preg_match('/^[a-f0-9]{48}\.(pdf|ppt|pptx)$/D',$file['storage_key'])){
                    $source=$this->config['storage'].'/'.$file['storage_key'];
                    if(is_file($source))$hash=hash_file('sha256',$source);
                }
                if(preg_match('/^[a-f0-9]{64}$/D',$hash)&&!$this->db->run('SELECT file_id FROM file_previews WHERE source_hash=? LIMIT 1',[$hash])->fetchColumn())$hashes[$hash]=true;
            }
            // Keep the worker lock until the OUTERMOST transaction finishes, including site authorization.
            $this->db->afterCommit(function()use($owned,$hashes,$release){
                try{
                    foreach($owned as $file){
                        $this->files->discardStored($file);
                        if(preg_match('/^([a-f0-9]{48})\.(ppt|pptx)$/D',$file['storage_key'],$match)){
                            $temporary=$this->config['preview_directory'].'/'.$match[1].'.pdf';
                            if(is_file($temporary)&&!@unlink($temporary))Logger::write('warning','storage','preview.cleanup_failed');
                        }
                    }
                    foreach(array_keys($hashes) as $hash)foreach(['.jpg','.pdf','-pending.jpg'] as $suffix){
                        $path=$this->config['preview_directory'].'/'.$hash.$suffix;
                        if(is_file($path)&&!@unlink($path))Logger::write('warning','storage','preview.cleanup_failed');
                    }
                }finally{$release();}
            });
            return ['deleted'=>true,'permanent'=>true];
        });}catch(\Throwable $error){$release();throw $error;}
    }
}
