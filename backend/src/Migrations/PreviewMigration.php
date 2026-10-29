<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class PreviewMigration {
 public function __construct(private Database $db) {}
 public function run(): void {
  $columns=$this->db->run('SHOW COLUMNS FROM courses')->fetchAll(\PDO::FETCH_COLUMN);
  if(!in_array('cover_file_id',$columns,true))$this->db->pdo->exec('ALTER TABLE courses ADD cover_file_id BIGINT UNSIGNED NULL');
  $this->db->pdo->exec("CREATE TABLE IF NOT EXISTS file_previews (
   file_id BIGINT UNSIGNED PRIMARY KEY,status ENUM('queued','processing','ready','failed') NOT NULL DEFAULT 'queued',
   source_hash CHAR(64) NULL,error_message VARCHAR(250) NULL,attempts INT NOT NULL DEFAULT 0,
   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE, INDEX idx_preview_queue(status,updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $this->db->run("INSERT IGNORE INTO file_previews(file_id) SELECT id FROM files WHERE course_id IS NOT NULL AND extension IN ('pdf','ppt','pptx')");
 }
}
