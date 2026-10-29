<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class SiteRepository {
    public function __construct(private Database $db) {}
    public function list(): array { return $this->db->run('SELECT s.*,(SELECT COUNT(*) FROM admins a WHERE a.site_id=s.id AND a.active=1) users,(SELECT COUNT(*) FROM employees e WHERE e.site_id=s.id AND e.active=1) employees FROM sites s ORDER BY active DESC,name')->fetchAll(); }
    public function save(array $data,?int $id): array {
        $name=Validation::text($data,'name',2,100);$address=Validation::text($data,'address',0,250);$active=Validation::number($data,'active',0,1);
        return $this->db->transaction(function()use($name,$address,$active,$id){
            if($id){
                if(!$this->db->run('SELECT id FROM sites WHERE id=? FOR UPDATE',[$id])->fetchColumn())Http::fail(404,'Sede no encontrada.');
                if(!$active&&$this->db->run('SELECT id FROM admins WHERE site_id=? AND active=1 LIMIT 1',[$id])->fetchColumn())Http::fail(409,'Reasigna o desactiva los usuarios de esta sede antes de desactivarla.');
                if(!$active&&$this->db->run('SELECT dni FROM employees WHERE site_id=? AND active=1 LIMIT 1',[$id])->fetchColumn())Http::fail(409,'Reasigna o desactiva a los colaboradores de esta sede antes de desactivarla.');
            }
            try{
                if($id)$this->db->run('UPDATE sites SET name=?,address=?,active=? WHERE id=?',[$name,$address,$active,$id]);
                else{$this->db->run('INSERT INTO sites(name,address,active) VALUES(?,?,?)',[$name,$address,$active]);$id=(int)$this->db->pdo->lastInsertId();}
            }catch(\PDOException $error){if(($error->errorInfo[1]??null)===1062)Http::fail(409,'Ya existe una sede con ese nombre.');throw $error;}
            return ['id'=>$id];
        });
    }
}
