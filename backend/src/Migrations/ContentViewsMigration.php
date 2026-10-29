<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class ContentViewsMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        foreach(['courses','events'] as $table){
            $columns=$this->db->run("SHOW COLUMNS FROM $table")->fetchAll(\PDO::FETCH_COLUMN);
            if(!in_array('view_count',$columns,true))$this->db->pdo->exec("ALTER TABLE $table ADD view_count BIGINT UNSIGNED NOT NULL DEFAULT 0");
        }
    }
}
