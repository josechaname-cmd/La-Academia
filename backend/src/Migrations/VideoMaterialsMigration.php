<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;

final class VideoMaterialsMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $existing=array_column($this->db->run('SHOW COLUMNS FROM files')->fetchAll(),'Field');
        foreach(['duration_seconds'=>'DECIMAL(12,3) NULL','video_width'=>'INT UNSIGNED NULL','video_height'=>'INT UNSIGNED NULL','video_codec'=>'VARCHAR(24) NULL','audio_codec'=>'VARCHAR(24) NULL'] as $name=>$definition){
            if(!in_array($name,$existing,true))$this->db->pdo->exec("ALTER TABLE files ADD $name $definition");
        }
    }
}
