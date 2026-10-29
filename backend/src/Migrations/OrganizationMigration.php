<?php
declare(strict_types=1);

namespace Academia\Migrations;

use Academia\Support\Database;

final class OrganizationMigration
{
    public function __construct(private Database $db) {}

    private function columns(string $table): array
    {
        return $this->db->run("SHOW COLUMNS FROM $table")->fetchAll(\PDO::FETCH_COLUMN);
    }

    private function hasForeignKey(string $table, string $column, string $referenced): bool
    {
        return (bool) $this->db->run(
            'SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? AND REFERENCED_TABLE_NAME=?',
            [$table, $column, $referenced]
        )->fetchColumn();
    }

    public function run(): void
    {
        $employeeColumns = $this->columns('employees');
        if (!in_array('site_id', $employeeColumns, true)) {
            $this->db->pdo->exec('ALTER TABLE employees ADD site_id BIGINT UNSIGNED NULL AFTER job_title, ADD INDEX idx_employee_site (site_id,active,full_name)');
        }
        if (!$this->hasForeignKey('employees', 'site_id', 'sites')) {
            $this->db->pdo->exec('ALTER TABLE employees ADD CONSTRAINT fk_employee_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT');
        }

        $adminColumns = $this->columns('admins');
        if (!in_array('dni', $adminColumns, true)) {
            $this->db->pdo->exec("ALTER TABLE admins ADD dni CHAR(8) NULL AFTER name, ADD job_title VARCHAR(160) NOT NULL DEFAULT '' AFTER dni, ADD UNIQUE KEY uq_admin_dni (dni)");
        }
        $roleType = (string) $this->db->run("SHOW COLUMNS FROM admins LIKE 'role'")->fetch()['Type'];
        if (str_contains($roleType, "'admin'")) {
            $this->db->pdo->exec("ALTER TABLE admins MODIFY role ENUM('admin','capacitador','superadmin') NOT NULL DEFAULT 'capacitador'");
            $this->db->pdo->exec("UPDATE admins SET role='capacitador' WHERE role='admin'");
            $this->db->pdo->exec("ALTER TABLE admins MODIFY role ENUM('capacitador','superadmin') NOT NULL DEFAULT 'capacitador'");
        }
        if (!$this->hasForeignKey('admins', 'dni', 'employees')) {
            $this->db->pdo->exec('ALTER TABLE admins ADD CONSTRAINT fk_admin_employee FOREIGN KEY (dni) REFERENCES employees(dni) ON DELETE RESTRICT ON UPDATE CASCADE');
        }

        $courseColumns = $this->columns('courses');
        if (!in_array('site_id', $courseColumns, true)) {
            $this->db->pdo->exec("ALTER TABLE courses ADD site_id BIGINT UNSIGNED NULL AFTER id, ADD created_by BIGINT UNSIGNED NULL AFTER site_id, ADD creator_name VARCHAR(120) NOT NULL DEFAULT '' AFTER created_by, ADD INDEX idx_course_site (site_id,status,created_at)");
        }
        if (!$this->hasForeignKey('courses', 'site_id', 'sites')) {
            $this->db->pdo->exec('ALTER TABLE courses ADD CONSTRAINT fk_course_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT');
        }
        if (!$this->hasForeignKey('courses', 'created_by', 'admins')) {
            $this->db->pdo->exec('ALTER TABLE courses ADD CONSTRAINT fk_course_creator FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL');
        }

        $brena = $this->db->run("SELECT id FROM sites WHERE LOWER(name) IN ('breña','brena') ORDER BY active DESC,id LIMIT 1")->fetchColumn();
        if ($brena) {
            $this->db->run('UPDATE employees SET site_id=? WHERE site_id IS NULL', [(int) $brena]);
            $this->db->run('UPDATE courses SET site_id=? WHERE site_id IS NULL', [(int) $brena]);
        }

        $legacyAuthor = $this->db->run("SELECT id,name FROM admins WHERE role='superadmin' AND active=1 ORDER BY id LIMIT 1")->fetch();
        if ($legacyAuthor) {
            $this->db->run("UPDATE courses SET created_by=?,creator_name=? WHERE created_by IS NULL AND creator_name=''", [(int) $legacyAuthor['id'], $legacyAuthor['name']]);
        }
    }
}
