<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;

final class ExamPolicyMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM exams')->fetchAll(\PDO::FETCH_COLUMN);
        foreach(['max_attempts'=>'TINYINT UNSIGNED NOT NULL DEFAULT 2','passing_score'=>'TINYINT UNSIGNED NULL'] as $column=>$definition){
            if(!in_array($column,$columns,true))$this->db->pdo->exec("ALTER TABLE exams ADD $column $definition");
        }
        // Existing results have no creator-defined pass mark; do not invent one retrospectively.
    }
}
