<?php
declare(strict_types=1);
namespace Academia\Migrations;

use Academia\Support\Database;

/** Additive repair for both fresh schemas and installations upgraded over time. */
final class DatabaseIntegrityMigration {
    public const INDEXES = [
        'uq_admin_dni'=>['admins',['dni'],true],
        'idx_employee_site'=>['employees',['site_id','active','full_name'],false],
        'idx_course_site'=>['courses',['site_id','status','created_at'],false],
        'idx_activity_publication'=>['activity_log',['entity_type','entity_id','event_type','created_at'],false],
        'idx_preview_hash'=>['file_previews',['source_hash'],false],
    ];
    public function __construct(private Database $db) {}

    public function missing(): array {
        $missing=[];
        foreach(self::INDEXES as $name=>[$table,$columns,$unique]){
            $indexes=[];
            foreach($this->db->run("SHOW INDEX FROM `$table`")->fetchAll() as $row)$indexes[$row['Key_name']][]=$row;
            foreach($indexes as $rows){
                usort($rows,fn($a,$b)=>(int)$a['Seq_in_index']<=>(int)$b['Seq_in_index']);
                $prefix=array_slice($rows,0,count($columns));
                if(array_column($prefix,'Column_name')===$columns
                    && !array_filter($prefix,fn($row)=>$row['Sub_part']!==null||($row['Visible']??'YES')==='NO')
                    && (!$unique||(!(int)$rows[0]['Non_unique']&&count($rows)===count($columns))))continue 2;
            }
            $missing[$name]=[$table,$columns,$unique];
        }
        return $missing;
    }

    public function run(): void {
        $missing=$this->missing();
        // DDL commits implicitly: detect conflicts before starting any ALTER TABLE.
        foreach($missing as $name=>[$table,$columns,$unique]){
            if($this->db->run("SHOW INDEX FROM `$table` WHERE Key_name=?",[$name])->fetch())throw new \RuntimeException("Revisa la definición del índice $name antes de migrar.");
            if($unique&&$this->db->run('SELECT 1 FROM admins WHERE dni IS NOT NULL GROUP BY dni HAVING COUNT(*)>1 LIMIT 1')->fetchColumn())throw new \RuntimeException('Hay accesos duplicados por DNI. Revisa el directorio antes de migrar; no se eliminó ningún registro.');
        }
        foreach($missing as $name=>[$table,$columns,$unique]){
            $this->db->pdo->exec("ALTER TABLE `$table` ADD ".($unique?'UNIQUE ':'')."INDEX `$name` (`".implode('`,`',$columns).'`)');
        }
    }
}
