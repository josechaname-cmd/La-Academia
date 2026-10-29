<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
final class ContentViews {
    public function __construct(private Database $db,private AuthTool $auth) {}
    public function record(string $kind,int $id): array {
        $targets=['course'=>['courses',"status='published'"],'event'=>['events','active=1']];
        if(!isset($targets[$kind]))Http::fail(404,'Contenido no encontrado.');
        // PHP holds the session lock: simultaneous tabs cannot count the same item twice.
        // No names, IP addresses or browser fingerprints are stored for analytics.
        $seen=$_SESSION['content_views']??[];$key=$kind.':'.$id;
        if($this->auth->user()||isset($seen[$key])||count($seen)>=2048){
            $result=['recorded'=>false];
            if($kind==='course'){
                $count=$this->db->run("SELECT view_count FROM courses WHERE id=? AND status='published'",[$id])->fetchColumn();
                if($count!==false)$result['view_count']=(int)$count;
            }
            return $result;
        }
        [$table,$visible]=$targets[$kind];
        $count=$this->db->transaction(function()use($table,$visible,$id,$kind){
            // The update holds the row lock until the milestone is stored atomically.
            $changed=$this->db->run("UPDATE $table SET view_count=view_count+1,updated_at=updated_at WHERE id=? AND $visible",[$id])->rowCount();
            if(!$changed)Http::fail(404,'Contenido no disponible.');
            $row=$this->db->run("SELECT title,view_count FROM $table WHERE id=?",[$id])->fetch();
            $count=(int)$row['view_count'];
            if($count%10===0){
                (new \Academia\Repositories\ActivityRepository($this->db))->record(
                    'content.views',$kind,$id,'10 nuevas visitas',
                    $row['title'].' · Alcanzó '.$count.' visitas públicas.',
                    $kind==='course'?$id:null,null,'content.views:'.$kind.':'.$id.':'.$count
                );
            }
            return $count;
        });
        $_SESSION['content_views'][$key]=true;
        return ['recorded'=>true]+($kind==='course'?['view_count'=>$count]:[]);
    }
}
