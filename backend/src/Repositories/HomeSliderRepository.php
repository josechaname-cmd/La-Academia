<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Validation;
use Academia\Support\Http;
use Academia\Services\PublicLink;
final class HomeSliderRepository {
    public function __construct(private Database $db) {}
    private function present(array $row): array {
        $row['image']=$row['image_id']?'api/v1/files/'.$row['image_id']:$row['legacy_image'];
        unset($row['legacy_image']);return $row;
    }
    public function list(bool $admin=false): array {
        return array_map(function($row)use($admin){
            $row=$this->present($row);
            if(!$admin&&$row['link_url']!==''&&!(new PublicLink($this->db))->available($row['link_url']))$row['link_url']='';
            return $row;
        },$this->db->run('SELECT * FROM home_slides'.($admin?'':' WHERE active=1').' ORDER BY position,id')->fetchAll());
    }
    public function get(int $id): array {
        $row=$this->db->run('SELECT * FROM home_slides WHERE id=?',[$id])->fetch();
        return $row?$this->present($row):Http::fail(404,'Imagen del slider no encontrada.');
    }
    public function save(array $data,?int $image=null,?int $id=null): array {
        $alt=Validation::text($data,'alt',1,160);$active=Validation::number($data,'active',0,1);
        $position=Validation::number($data,'position',1,9999);
        $fit=$data['fit']??'cover';$focal=$data['focal']??'center';
        if(!in_array($fit,['cover','contain'],true)||!in_array($focal,['center','top','bottom','left','right'],true))Http::fail(422,'Ajuste de imagen no válido.');
        return $this->db->transaction(function()use($data,$alt,$active,$position,$fit,$focal,$image,$id){
            if($id)$this->db->run('SELECT id FROM home_slides WHERE id=? FOR UPDATE',[$id])->fetch();
            $current=$id?$this->get($id):null;
            $options=$data+['title'=>$current['title']??'','subtitle'=>$current['subtitle']??'','link_url'=>$current['link_url']??''];
            $title=Validation::text($options,'title',0,160);$subtitle=Validation::text($options,'subtitle',0,300);$url=Validation::text($options,'link_url',0,1000);
            $style=$data+array_intersect_key($current??[],array_flip(['font_family','title_color','text_color','title_size','text_size','text_align']))+['font_family'=>'default','title_color'=>'#ffffff','text_color'=>'#ffffff','title_size'=>36,'text_size'=>17,'text_align'=>'left'];
            $font=Validation::choice($style,'font_family',['default','arial','georgia','trebuchet']);$align=Validation::choice($style,'text_align',['left','center','right']);
            $titleSize=Validation::number($style,'title_size',20,72);$textSize=Validation::number($style,'text_size',12,36);
            foreach(['title_color','text_color'] as $field){$style[$field]=strtolower(Validation::text($style,$field,7,7));if(!preg_match('/^#[a-f0-9]{6}$/D',$style[$field]))Http::fail(422,'Selecciona un color válido.',[''.$field=>'Usa un color hexadecimal de seis dígitos.']);}
            (new PublicLink($this->db))->validate($url);
            if(!$image&&!$current)Http::fail(422,'Selecciona una imagen.',['image'=>'Carga una imagen para el slider.']);
            if($image&&!$this->db->run("SELECT id FROM files WHERE id=? AND course_id IS NULL AND mime IN ('image/jpeg','image/png','image/webp')",[$image])->fetchColumn())Http::fail(422,'Imagen no válida.');
            if($id)$this->db->run('UPDATE home_slides SET alt=?,active=?,position=?,fit=?,focal=?,image_id=?,legacy_image=IF(? IS NULL,legacy_image,NULL),title=?,subtitle=?,link_url=? WHERE id=?',[$alt,$active,$position,$fit,$focal,$image??$current['image_id'],$image,$title,$subtitle,$url,$id]);
            else{$this->db->run('INSERT INTO home_slides(alt,active,position,fit,focal,image_id,title,subtitle,link_url) VALUES(?,?,?,?,?,?,?,?,?)',[$alt,$active,$position,$fit,$focal,$image,$title,$subtitle,$url]);$id=(int)$this->db->pdo->lastInsertId();}
            $this->db->run('UPDATE home_slides SET font_family=?,title_color=?,text_color=?,title_size=?,text_size=?,text_align=? WHERE id=?',[$font,$style['title_color'],$style['text_color'],$titleSize,$textSize,$align,$id]);
            return $this->get($id);
        });
    }
    public function setActive(int $id,int $active): array {
        if(!in_array($active,[0,1],true))Http::fail(422,'Estado no válido.');
        return $this->db->transaction(function()use($id,$active){$this->db->run('SELECT id FROM home_slides WHERE id=? FOR UPDATE',[$id]);$current=$this->get($id);if($active)(new PublicLink($this->db))->validate($current['link_url']);$this->db->run('UPDATE home_slides SET active=? WHERE id=?',[$active,$id]);return $this->get($id);});
    }
    public function remove(int $id): array {return $this->db->transaction(function()use($id){$this->get($id);$this->db->run('DELETE FROM home_slides WHERE id=?',[$id]);return ['deleted'=>true];});}
}
