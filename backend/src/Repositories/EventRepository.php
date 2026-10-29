<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Services\EventGalleryTool;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class EventRepository {
    public function __construct(private Database $db,private CategoryRepository $categories) {}
    public function list(bool $admin=false): array {
        $events=$this->db->run('SELECT * FROM events'.($admin?'':' WHERE active=1').' ORDER BY starts_at DESC,id DESC')->fetchAll();
        if(!$admin)foreach($events as &$event)unset($event['view_count']);
        return (new EventGalleryTool($this->db))->attach($events,$admin);
    }
    public function save(array $data,?int $id): array {
        $title=Validation::text($data,'title',3,160);
        $description=Validation::text($data,'description',10,2000);
        $category=Validation::text($data+['category'=>''],'category',0,80);
        if($category!=='')$category=$this->categories->resolve($category,'event');
        $location=Validation::text($data,'location',2,160);
        $starts=Validation::text($data,'starts_at',16,16);
        $parsed=\DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$starts);
        if(!$parsed||$parsed->format('Y-m-d\TH:i')!==$starts||(int)$parsed->format('Y')<1000)Http::fail(422,'Indica una fecha y hora válidas.');
        $active=Validation::number($data,'active',0,1);
        $gallery=new EventGalleryTool($this->db);
        $images=$gallery->validate($data['image_ids']??[],(bool)$active);
        $cover=null;
        if($images){
            $cover=Validation::number($data,'cover_image_id',1,PHP_INT_MAX);
            if(!in_array($cover,$images,true))Http::fail(422,'Selecciona como portada una imagen de la galería.');
        }elseif(!empty($data['cover_image_id']))Http::fail(422,'La portada debe pertenecer a la galería del evento.');
        $values=[$title,$description,$category,$location,$parsed->format('Y-m-d H:i:s'),$cover,$active];
        $creating=$id===null;
        return $this->db->transaction(function()use($values,$id,$images,$gallery,$creating){
        if($id){
            $current=$this->db->run('SELECT * FROM events WHERE id=? FOR UPDATE',[$id])->fetch();
            if(!$current)Http::fail(404,'Evento no encontrado.');
            $previous=[$current['title'],$current['description'],$current['category'],$current['location'],$current['starts_at'],$current['image_id'],(int)$current['active']];
            $previousImages=array_map('intval',$this->db->run('SELECT file_id FROM event_images WHERE event_id=? ORDER BY position',[$id])->fetchAll(\PDO::FETCH_COLUMN));
            if($previous==$values&&$previousImages===array_map('intval',$images))return ['id'=>$id];
            $this->db->run('UPDATE events SET title=?,description=?,category=?,location=?,starts_at=?,image_id=?,active=? WHERE id=?',[...$values,$id]);
        }else{
            $this->db->run('INSERT INTO events(title,description,category,location,starts_at,image_id,active) VALUES(?,?,?,?,?,?,?)',$values);
            $id=(int)$this->db->pdo->lastInsertId();
        }
        $gallery->replace($id,$images);
        (new ActivityRepository($this->db))->record($creating?'event.created':'event.updated','event',$id,$creating?'Nuevo evento':'Evento actualizado',$values[0]);
        return ['id'=>$id];
        });
    }
    public function remove(int $id): array {
        return $this->db->transaction(function()use($id){
            $name=$this->db->run('SELECT title FROM events WHERE id=? FOR UPDATE',[$id])->fetchColumn();
            if(!$name)Http::fail(404,'Evento no encontrado.');
            $this->db->run('DELETE FROM events WHERE id=?',[$id]);
            (new ActivityRepository($this->db))->record('event.deleted','event',$id,'Evento eliminado',(string)$name);
            return ['deleted'=>true];
        });
    }
}
