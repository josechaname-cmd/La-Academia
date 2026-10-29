<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class CourseExamMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM courses')->fetchAll(\PDO::FETCH_COLUMN);
        if(!in_array('exam_required',$columns,true))$this->db->pdo->exec('ALTER TABLE courses ADD exam_required TINYINT(1) NOT NULL DEFAULT 1');
    }
}
