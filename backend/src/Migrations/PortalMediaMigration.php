<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
use Academia\Services\SliderImages;
final class PortalMediaMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=$this->db->run('SHOW COLUMNS FROM home_popup')->fetchAll();
        if(!in_array('display_size',array_column($columns,'Field'),true))$this->db->pdo->exec("ALTER TABLE home_popup ADD display_size VARCHAR(16) NOT NULL DEFAULT 'standard'");
        foreach(['image_format'=>"VARCHAR(16) NOT NULL DEFAULT 'original'",'image_focus'=>"VARCHAR(16) NOT NULL DEFAULT 'center'"] as $field=>$definition)if(!in_array($field,array_column($columns,'Field'),true))$this->db->pdo->exec("ALTER TABLE home_popup ADD $field $definition");
        $this->db->pdo->exec("CREATE TABLE IF NOT EXISTS home_slides (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, image_id BIGINT UNSIGNED NULL,
            legacy_image VARCHAR(1000) NULL, alt VARCHAR(160) NOT NULL,
            fit VARCHAR(16) NOT NULL DEFAULT 'cover', focal VARCHAR(16) NOT NULL DEFAULT 'center',
            position INT UNSIGNED NOT NULL DEFAULT 1, active TINYINT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX slides_order(active,position,id), FOREIGN KEY(image_id) REFERENCES files(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB");
        $this->db->pdo->exec('CREATE TABLE IF NOT EXISTS portal_media_migrations (name VARCHAR(80) PRIMARY KEY) ENGINE=InnoDB');
        $this->db->transaction(function(){
            // Transactional marker: imports old images once, including after an interrupted run.
            $insert=$this->db->run("INSERT IGNORE INTO portal_media_migrations(name) VALUES('slider-import-v1')");
            if(!$insert->rowCount())return;
            $images=(new SliderImages(dirname(__DIR__,3).'/public/assets/slider'))->list();
            foreach($images as $position=>$image)$this->db->run('INSERT INTO home_slides(legacy_image,alt,position,active) VALUES(?,?,?,1)',[$image['image'],mb_substr($image['alt'],0,160),$position+1]);
        });
    }
}
