<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class ExamScheduleMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM exams')->fetchAll(\PDO::FETCH_COLUMN);
        foreach(['opens_at'=>'DATETIME NULL','closes_at'=>'DATETIME NULL','duration_minutes'=>'INT UNSIGNED NULL','enabled'=>'TINYINT(1) NOT NULL DEFAULT 1'] as $column=>$definition){
            if(!in_array($column,$columns,true))$this->db->pdo->exec("ALTER TABLE exams ADD $column $definition");
        }
    }
}
