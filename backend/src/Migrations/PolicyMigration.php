<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class PolicyMigration {
 public function __construct(private Database $db) {}
 public function run(): void {
  $this->db->pdo->exec("CREATE TABLE IF NOT EXISTS policies (
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, site_id BIGINT UNSIGNED NOT NULL,
   created_by BIGINT UNSIGNED NULL, title VARCHAR(160) NOT NULL, description TEXT NOT NULL,
   file_id BIGINT UNSIGNED NOT NULL UNIQUE, active TINYINT(1) NOT NULL DEFAULT 1,
   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   FOREIGN KEY(site_id) REFERENCES sites(id), FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE RESTRICT,
   INDEX idx_policy_site_active(site_id,active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 }
}
