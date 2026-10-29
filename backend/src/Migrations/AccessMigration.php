<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class AccessMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM admins')->fetchAll(\PDO::FETCH_COLUMN);
        foreach(['role'=>"ENUM('capacitador','superadmin') NOT NULL DEFAULT 'capacitador'",'active'=>'TINYINT(1) NOT NULL DEFAULT 1','site_id'=>'BIGINT UNSIGNED NULL','auth_version'=>'INT UNSIGNED NOT NULL DEFAULT 0'] as $column=>$definition){
            if(!in_array($column,$columns,true))$this->db->pdo->exec("ALTER TABLE admins ADD $column $definition");
        }
        if(!$this->db->run("SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admins' AND COLUMN_NAME='site_id' AND REFERENCED_TABLE_NAME='sites'")->fetchColumn())$this->db->pdo->exec('ALTER TABLE admins ADD CONSTRAINT fk_admin_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE RESTRICT');
        if(!in_array('role',$columns,true)&&!$this->db->run("SELECT id FROM admins WHERE role='superadmin' LIMIT 1")->fetchColumn()){
            $first=$this->db->run('SELECT id FROM admins WHERE active=1 ORDER BY id LIMIT 1')->fetchColumn();
            if($first){$this->db->run("UPDATE admins SET role='superadmin' WHERE id=?",[$first]);echo "El primer administrador conserva su acceso y ahora es superadministrador.\n";}
        }
    }
}
