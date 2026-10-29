<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class SliderContentMigration {
    public function __construct(private Database $db) {}
    public function run(): void {
        $columns=array_column($this->db->run('SHOW COLUMNS FROM home_slides')->fetchAll(),'Field');
        foreach(['title'=>160,'subtitle'=>300,'link_url'=>1000] as $field=>$length){
            if(!in_array($field,$columns,true))$this->db->pdo->exec("ALTER TABLE home_slides ADD $field VARCHAR($length) NOT NULL DEFAULT ''");
        }
        foreach(['font_family'=>"VARCHAR(20) NOT NULL DEFAULT 'default'",'title_color'=>"CHAR(7) NOT NULL DEFAULT '#ffffff'",'text_color'=>"CHAR(7) NOT NULL DEFAULT '#ffffff'",'title_size'=>'TINYINT UNSIGNED NOT NULL DEFAULT 36','text_size'=>'TINYINT UNSIGNED NOT NULL DEFAULT 17','text_align'=>"VARCHAR(10) NOT NULL DEFAULT 'left'"] as $field=>$definition){
            if(!in_array($field,$columns,true))$this->db->pdo->exec("ALTER TABLE home_slides ADD $field $definition");
        }
    }
}
