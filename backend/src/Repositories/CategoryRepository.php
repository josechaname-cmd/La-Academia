<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class CategoryRepository {
    public function __construct(private Database $db) {}
    private function scope(string $scope): string {
        return Validation::choice(['scope'=>$scope],'scope',['course','event']);
    }
    private function name(array $data,string $scope): string {
        $name=Validation::text($data,'name',2,$scope==='course'?40:80);
        return preg_replace('/\s+/u',' ',$name);
    }
    public function list(string $scope): array {
        return $this->db->run('SELECT name FROM categories WHERE scope=? ORDER BY id',[$this->scope($scope)])->fetchAll(\PDO::FETCH_COLUMN);
    }
    public function resolve(string $name,string $scope): string {
        $scope=$this->scope($scope);
        $canonical=$this->db->run('SELECT name FROM categories WHERE scope=? AND name=?',[$scope,$this->name(['name'=>$name],$scope)])->fetchColumn();
        return $canonical!==false?$canonical:Http::fail(422,'Selecciona una categoría registrada.');
    }
    public function create(array $data): array {
        $scope=Validation::choice($data,'scope',['course','event']);$name=$this->name($data,$scope);
        if(mb_strlen($name)<2)Http::fail(422,'Escribe al menos 2 caracteres para la categoría.');
        try{$this->db->run('INSERT INTO categories(scope,name) VALUES(?,?)',[$scope,$name]);}
        catch(\PDOException $error){if(($error->errorInfo[1]??null)===1062)Http::fail(409,'Esta categoría ya existe. Selecciónala en la lista.');throw $error;}
        return ['id'=>(int)$this->db->pdo->lastInsertId(),'scope'=>$scope,'name'=>$name];
    }
}
