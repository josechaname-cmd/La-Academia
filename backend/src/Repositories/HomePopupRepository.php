<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Validation;
use Academia\Support\Http;
final class HomePopupRepository {
    private const FIELDS='id,title,image_id,link_url,link_label,active,revision,updated_at,display_size,image_format,image_focus';
    public function __construct(private Database $db) {}
    public function list(): array {return $this->db->run('SELECT '.self::FIELDS.' FROM home_popup ORDER BY active DESC,updated_at DESC,id DESC')->fetchAll();}
    public function get(bool $admin=false,?int $id=null): ?array {
        $row=$this->db->run('SELECT '.self::FIELDS.' FROM home_popup WHERE '.($admin?'id=?':'active=1 AND image_id IS NOT NULL').' LIMIT 1',$admin?[$id]:[])->fetch();
        if($admin&&!$row)Http::fail(404,'Popup no encontrado.');
        if($row&&!$admin&&$row['link_url']!==''&&!$this->targetExists($row['link_url'])){$row['link_url']='';$row['link_label']='';}
        return $row?:null;
    }
    private function lock(): void {$this->db->run('SELECT id FROM home_popup_guard WHERE id=1 FOR UPDATE')->fetch();}
    private function externalUrl(string $url): bool {
        if(!filter_var($url,FILTER_VALIDATE_URL)||preg_match('/[\x00-\x20\x7f\\\\]/',$url))return false;
        $parts=parse_url($url);
        return is_array($parts)&&in_array(strtolower($parts['scheme']??''),['http','https'],true)&&!isset($parts['user'])&&!isset($parts['pass']);
    }
    private function targetExists(string $url): bool {
        if($this->externalUrl($url))return true;
        if(!preg_match('~^#(curso|eventos)/([1-9][0-9]*)$~D',$url,$match))return false;
        return (bool)$this->db->run($match[1]==='curso'?"SELECT id FROM courses WHERE id=? AND status='published'":'SELECT id FROM events WHERE id=? AND active=1',[$match[2]])->fetchColumn();
    }
    private function validateTarget(string $url): void {if($url!==''&&!$this->targetExists($url))Http::fail(422,'El destino ya no está publicado. Selecciona otro o usa el modo informativo.',['link_url'=>'El destino no está disponible.']);}
    private function deactivateOthers(?int $id): void {$this->db->run('UPDATE home_popup SET active=0,revision=revision+1 WHERE active=1 AND id<>?',[$id??0]);}
    public function save(array $data,?int $uploadedImage=null,?int $id=null): array {
        $title=Validation::text($data+['title'=>''],'title',0,160);$active=Validation::number($data,'active',0,1);
        $url=Validation::text($data,'link_url',0,1000);$label=Validation::text($data+['link_label'=>''],'link_label',0,80);
        if($url!==''&&!$this->externalUrl($url)&&!preg_match('~^#(?:curso|eventos)/[1-9][0-9]*$~D',$url))Http::fail(422,'Selecciona un destino interno o escribe un enlace HTTP/HTTPS válido.',['link_url'=>'Revisa el enlace del popup.']);
        if($url!==''&&$label==='')$label=mb_substr($title!==''?$title:'Abrir anuncio',0,80);
        if($url==='')$label='';
        $size=$data['display_size']??'standard';if(!in_array($size,['compact','standard'],true))Http::fail(422,'Tamaño del popup no válido.');
        $format=$data['image_format']??'original';$focus=$data['image_focus']??'center';
        if(!in_array($format,['original','landscape','square'],true)||!in_array($focus,['center','top','bottom','left','right'],true))Http::fail(422,'Encuadre del popup no válido.');
        return $this->db->transaction(function()use($title,$active,$url,$label,$uploadedImage,$id,$size,$format,$focus){
            $this->lock();$current=$id?$this->get(true,$id):null;$this->validateTarget($url);
            $image=$uploadedImage??($current['image_id']??null);
            if(!$image)Http::fail(422,'Carga una imagen para guardar el popup.',['image'=>'Selecciona una imagen.']);
            if(!$this->db->run("SELECT id FROM files WHERE id=? AND course_id IS NULL AND mime IN ('image/jpeg','image/png','image/webp')",[$image])->fetchColumn())Http::fail(422,'Selecciona una imagen válida.');
            if($current&&[$current['title'],(int)$current['active'],$current['link_url'],$current['link_label'],$current['image_id'],$current['display_size'],$current['image_format'],$current['image_focus']]==[$title,$active,$url,$label,$image,$size,$format,$focus])return $current;
            if($active)$this->deactivateOthers($id);
            if($id)$this->db->run('UPDATE home_popup SET title=?,active=?,link_url=?,link_label=?,image_id=?,display_size=?,image_format=?,image_focus=?,revision=revision+1 WHERE id=?',[$title,$active,$url,$label,$image,$size,$format,$focus,$id]);
            else{$this->db->run('INSERT INTO home_popup(title,active,link_url,link_label,image_id,display_size,image_format,image_focus,revision) VALUES(?,?,?,?,?,?,?,?,1)',[$title,$active,$url,$label,$image,$size,$format,$focus]);$id=(int)$this->db->pdo->lastInsertId();}
            return $this->get(true,$id);
        });
    }
    public function setActive(int $id,int $active): array {
        if(!in_array($active,[0,1],true))Http::fail(422,'Estado no válido.');
        return $this->db->transaction(function()use($id,$active){
            $this->lock();$current=$this->get(true,$id);
            if($active){if(!$current['image_id'])Http::fail(422,'Carga una imagen antes de activar.');$this->validateTarget($current['link_url']);$this->deactivateOthers($id);}
            if((int)$current['active']!==$active)$this->db->run('UPDATE home_popup SET active=?,revision=revision+1 WHERE id=?',[$active,$id]);
            return $this->get(true,$id);
        });
    }
    public function remove(int $id): array {return $this->db->transaction(function()use($id){$this->lock();$this->get(true,$id);$this->db->run('DELETE FROM home_popup WHERE id=?',[$id]);return ['deleted'=>true];});}
}
