<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class CatalogMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $nullable=$this->db->run("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='courses' AND COLUMN_NAME='duration'")->fetchColumn();
        if($nullable==='NO')$this->db->pdo->exec('ALTER TABLE courses MODIFY duration INT UNSIGNED NULL DEFAULT NULL');
        $defaults=[
            'course'=>['SSOMA','Salud Ocupacional','Medio Ambiente','Bienestar'],
            'event'=>['Inducción de personal nuevo','Capacitación interna','Seguridad y prevención','Salud y bienestar','Medio ambiente','Integración'],
        ];
        foreach($defaults as $scope=>$names)foreach($names as $name)$this->db->run('INSERT IGNORE INTO categories(scope,name) VALUES(?,?)',[$scope,$name]);
        $this->db->pdo->exec("INSERT IGNORE INTO categories(scope,name) SELECT 'course',category FROM courses WHERE TRIM(category)<>''");
        $this->db->pdo->exec("INSERT IGNORE INTO categories(scope,name) SELECT 'event',category FROM events WHERE TRIM(category)<>''");
    }
}
