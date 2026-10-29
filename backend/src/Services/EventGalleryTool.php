<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class EventGalleryTool {
    public const MIN_IMAGES=3;
    public const MAX_IMAGES=12;
    public function __construct(private Database $db) {}
    public function validate(mixed $images,bool $published): array {
        if(!is_array($images)||!array_is_list($images)||count($images)>self::MAX_IMAGES)Http::fail(422,'Agrega hasta 12 imágenes por evento.');
        $ids=[];
        foreach($images as $image){$id=Validation::number(['id'=>$image],'id',1,PHP_INT_MAX);if(in_array($id,$ids,true))Http::fail(422,'Las imágenes del evento no deben repetirse.');$ids[]=$id;}
        if($published&&count($ids)<self::MIN_IMAGES)Http::fail(422,'Agrega al menos 3 imágenes para publicar el evento.');
        if($ids){$marks=implode(',',array_fill(0,count($ids),'?'));$count=(int)$this->db->run("SELECT COUNT(*) FROM files WHERE id IN ($marks) AND course_id IS NULL AND mime IN ('image/jpeg','image/png','image/webp')",$ids)->fetchColumn();if($count!==count($ids))Http::fail(422,'Hay imágenes no válidas en la galería.');}
        return $ids;
    }
    public function replace(int $eventId,array $ids): void {
        $this->db->run('DELETE FROM event_images WHERE event_id=?',[$eventId]);
        foreach($ids as $position=>$image)$this->db->run('INSERT INTO event_images(event_id,file_id,position) VALUES(?,?,?)',[$eventId,$image,$position]);
    }
    public function attach(array $events,bool $admin): array {
        $photos=$this->db->run('SELECT ei.event_id,f.id,f.original_name FROM event_images ei JOIN files f ON f.id=ei.file_id JOIN events e ON e.id=ei.event_id'.($admin?'':' WHERE e.active=1').' ORDER BY ei.event_id,ei.position')->fetchAll();
        $byEvent=[];foreach($photos as $photo)$byEvent[$photo['event_id']][]=['id'=>(int)$photo['id'],'name'=>$photo['original_name']];
        foreach($events as &$event){
            $event['images']=$byEvent[$event['id']]??[];
            $cover=(int)($event['image_id']??0);
            if($cover){
                $index=array_search($cover,array_column($event['images'],'id'),true);
                if($index!==false&&$index>0){$photo=$event['images'][$index];array_splice($event['images'],$index,1);array_unshift($event['images'],$photo);}
            }
        }
        return $events;
    }
}
