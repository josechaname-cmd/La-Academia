<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class TrainingEditorMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $fields=array_column($this->db->run('SHOW COLUMNS FROM courses')->fetchAll(),'Field');
        if(!in_array('custom_cover_id',$fields,true))$this->db->pdo->exec('ALTER TABLE courses ADD custom_cover_id BIGINT UNSIGNED NULL, ADD CONSTRAINT course_custom_cover FOREIGN KEY(custom_cover_id) REFERENCES files(id) ON DELETE RESTRICT');
        $fields=array_column($this->db->run('SHOW COLUMNS FROM exams')->fetchAll(),'Field');
        if(!in_array('created_by',$fields,true))$this->db->pdo->exec('ALTER TABLE exams ADD created_by BIGINT UNSIGNED NULL, ADD creator_name VARCHAR(120) NULL');
        $score=$this->db->run("SHOW COLUMNS FROM attempts LIKE 'score'")->fetch();
        if(strtolower($score['Type'])!=='decimal(5,2)')$this->db->pdo->exec('ALTER TABLE attempts MODIFY score DECIMAL(5,2) NULL');
    }
}
