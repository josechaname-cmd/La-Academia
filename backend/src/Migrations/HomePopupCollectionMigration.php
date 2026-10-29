<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class HomePopupCollectionMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM home_popup')->fetchAll();$id=$columns[0];
        if(!str_contains($id['Extra'],'auto_increment')){
            // Retire only the untouched empty singleton placeholder, never a saved announcement.
            $this->db->run("DELETE FROM home_popup WHERE id=1 AND title='' AND image_id IS NULL AND link_url='' AND active=0 AND revision=0");
            $this->db->pdo->exec('ALTER TABLE home_popup MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
        }
        if(!in_array('active_slot',array_column($columns,'Field'),true))$this->db->pdo->exec('ALTER TABLE home_popup ADD active_slot TINYINT GENERATED ALWAYS AS (IF(active=1,1,NULL)) STORED, ADD UNIQUE KEY one_active_popup(active_slot)');
        $this->db->pdo->exec('CREATE TABLE IF NOT EXISTS home_popup_guard (id TINYINT UNSIGNED PRIMARY KEY) ENGINE=InnoDB');
        $this->db->run('INSERT IGNORE INTO home_popup_guard(id) VALUES(1)');
    }
}
