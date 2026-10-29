<?php
declare(strict_types=1);

namespace Academia\Migrations;

use Academia\Support\Database;

final class PersonnelMigration
{
    public function __construct(private Database $db) {}

    public function run(): void
    {
        $this->db->pdo->exec("CREATE TABLE IF NOT EXISTS employees (
            dni CHAR(8) PRIMARY KEY,
            full_name VARCHAR(120) NOT NULL,
            job_title VARCHAR(160) NOT NULL,
            active TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_employee_active (active,full_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $columns = $this->db->run('SHOW COLUMNS FROM enrollments')->fetchAll(\PDO::FETCH_COLUMN);
        if (!in_array('job_title', $columns, true)) {
            $this->db->pdo->exec("ALTER TABLE enrollments ADD job_title VARCHAR(160) NOT NULL DEFAULT '' AFTER name");
        }
    }
}
