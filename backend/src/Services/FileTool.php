<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\PresentationTool;
final class FileTool {
    public function __construct(private Database $db,private array $config,private PresentationTool $presentations) {}
    public function add(array $upload,?int $courseId,bool $image=false): array {
        if(($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)Http::fail(422,'No se recibió el archivo o supera el límite de carga.');
        $name=basename(str_replace('\\','/',$upload['name']));$ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        $allowed=$image?['jpg','jpeg','png','webp']:['pdf','ppt','pptx'];
        if(!in_array($ext,$allowed,true))Http::fail(422,$image?'Utiliza JPG, PNG o WEBP.':'Solo se permiten PDF, PPT y PPTX.');
        $size=filesize($upload['tmp_name']);if(!$size||$size>($image?8*1024*1024:$this->config['max_file_size']))Http::fail(422,'Tamaño de archivo no permitido.');
        $mime=(new \finfo(FILEINFO_MIME_TYPE))->file($upload['tmp_name']);$slides=null;
        if($image){$dimensions=@getimagesize($upload['tmp_name']);if(!$dimensions||!in_array($mime,['image/jpeg','image/png','image/webp'],true)||$dimensions[0]>8000||$dimensions[1]>8000)Http::fail(422,'Imagen no válida.');$ext=match($mime){'image/jpeg'=>'jpg','image/png'=>'png',default=>'webp'};}
        elseif($ext==='pdf'){if($mime!=='application/pdf'||!str_starts_with(file_get_contents($upload['tmp_name'],false,null,0,5),'%PDF-'))Http::fail(422,'PDF no válido.');}
        else{$slides=$this->presentations->read($upload['tmp_name'],$ext);$mime=$ext==='ppt'?'application/vnd.ms-powerpoint':'application/vnd.openxmlformats-officedocument.presentationml.presentation';}
        $key=bin2hex(random_bytes(24)).'.'.$ext;$path=$this->config['storage'].'/'.$key;
        if(!is_dir($this->config['storage']))Http::fail(503,'Ejecuta la migración para preparar el almacenamiento.');
        if(!move_uploaded_file($upload['tmp_name'],$path))Http::fail(500,'No se pudo guardar el archivo.');
        try{return $this->db->transaction(function()use($courseId,$name,$key,$mime,$ext,$size,$slides){
            $this->db->afterRollback(fn()=>$this->discardStored(['storage_key'=>$key]));
            $this->db->run('INSERT INTO files(course_id,original_name,storage_key,mime,extension,size,slides_json) VALUES(?,?,?,?,?,?,?)',[$courseId,mb_substr($name,0,220),$key,$mime,$ext,$size,$slides?json_encode($slides,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR):null]);
            $id=(int)$this->db->pdo->lastInsertId();
            if($courseId)(new DocumentPreviewTool($this->db,$this->config))->enqueue($id);
            if($courseId)(new \Academia\Repositories\ActivityRepository($this->db))->course($courseId,'material.added','Material agregado');
            return ['id'=>$id,'name'=>$name,'extension'=>$ext,'size'=>$size];
        });}catch(\Throwable $e){@unlink($path);throw $e;}
    }
    public function get(int $id): array { $file=$this->db->run('SELECT * FROM files WHERE id=?',[$id])->fetch();return $file?:Http::fail(404,'Archivo no encontrado.'); }
    public function visible(array $file): bool {
        if($file['course_id'])return (bool)$this->db->run("SELECT id FROM courses WHERE id=? AND status='published'",[$file['course_id']])->fetchColumn();
        return (bool)$this->db->run("SELECT a.id FROM announcements a WHERE kind='banner' AND image_id=? AND active=1 AND (course_id IS NULL OR EXISTS(SELECT 1 FROM courses c WHERE c.id=a.course_id AND c.status='published')) UNION ALL SELECT e.id FROM event_images ei JOIN events e ON e.id=ei.event_id WHERE ei.file_id=? AND e.active=1 UNION ALL SELECT p.id FROM home_popup p WHERE p.image_id=? AND p.active=1 UNION ALL SELECT c.id FROM courses c WHERE c.custom_cover_id=? AND c.status='published' UNION ALL SELECT s.id FROM home_slides s WHERE s.image_id=? AND s.active=1 LIMIT 1",[$file['id'],$file['id'],$file['id'],$file['id'],$file['id']])->fetchColumn();
    }
    public function remove(int $id): array {
        $file=$this->get($id);
        if($this->db->run('SELECT id FROM courses WHERE custom_cover_id=?',[$id])->fetchColumn())Http::fail(409,'Reemplaza primero la portada personalizada.');
        if($this->db->run('SELECT id FROM home_slides WHERE image_id=?',[$id])->fetchColumn())Http::fail(409,'Quita primero la imagen del slider.');
        if($this->db->run('SELECT id FROM home_popup WHERE image_id=?',[$id])->fetchColumn())Http::fail(409,'Reemplaza primero la imagen del popup de Inicio.');
        if($this->db->run('SELECT event_id FROM event_images WHERE file_id=? LIMIT 1',[$id])->fetchColumn())Http::fail(409,'Quita la imagen de la galería del evento antes de eliminarla.');
        if($this->db->run('SELECT id FROM announcements WHERE image_id=? LIMIT 1',[$id])->fetchColumn())Http::fail(409,'Quita la imagen del banner o aviso antes de eliminarla.');
        if($file['course_id'])$this->db->transaction(function()use($file,$id){$this->db->run('SELECT id FROM courses WHERE id=? FOR UPDATE',[$file['course_id']]);$this->db->run('UPDATE courses SET cover_file_id=NULL WHERE id=? AND cover_file_id=?',[$file['course_id'],$id]);$this->db->run('DELETE FROM files WHERE id=?',[$id]);if(!$this->db->run('SELECT id FROM files WHERE course_id=? LIMIT 1',[$file['course_id']])->fetchColumn())$this->db->run("UPDATE courses SET status='draft' WHERE id=? AND status='published'",[$file['course_id']]);(new \Academia\Repositories\ActivityRepository($this->db))->course((int)$file['course_id'],'material.removed','Material retirado');});
        else $this->db->run('DELETE FROM files WHERE id=?',[$id]);
        $this->db->afterCommit(fn()=>$this->discardStored($file));return ['deleted'=>true];
    }
    public function discardStored(array $file): void { $path=$this->path($file);if(is_file($path)&&!@unlink($path))\Academia\Support\Logger::write('warning','storage','file.cleanup_failed'); }
    private function path(array $file): string {
        if(!preg_match('/^[a-f0-9]{48}\.[a-z0-9]+$/',$file['storage_key']))Http::fail(500,'Referencia de archivo no válida.');
        return $this->config['storage'].'/'.$file['storage_key'];
    }
    public function stream(array $file,bool $download=false): never {
        $path=$this->path($file);if(!is_file($path))Http::fail(404,'Archivo no disponible.');
        header('Content-Type: '.$file['mime']);header('X-Content-Type-Options: nosniff');header('Cache-Control: private, no-store');
        header('Content-Security-Policy: sandbox');
        $disposition=$download||!in_array($file['extension'],['pdf','png','jpg','webp'],true)?'attachment':'inline';
        header("Content-Disposition: $disposition; filename=\"archivo.".$file['extension']."\"; filename*=UTF-8''".rawurlencode($file['original_name']));
        header('Content-Length: '.filesize($path));session_write_close();readfile($path);exit;
    }
}
