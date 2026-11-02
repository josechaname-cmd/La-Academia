<?php
declare(strict_types=1);
namespace Academia\Support;

use Academia\Migrations\DatabaseIntegrityMigration;

/** Read-only diagnostics. Reports counts and schema names, never row contents. */
final class DatabaseAudit {
    public function __construct(private Database $db) {}

    public function run(): array {
        $checks=[];
        $check=static function(string $name,int $failures)use(&$checks){$checks[]=['check'=>$name,'ok'=>$failures===0,'failures'=>$failures];};
        $tables=$this->db->run('SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchAll();
        $required=array_keys(require dirname(__DIR__,2).'/config/database-permissions.php');
        $missing=array_diff($required,array_column($tables,'TABLE_NAME'));
        foreach($missing as $table)$check('missing_table:'.$table,1);
        if($missing)return ['ok'=>false,'checks'=>$checks];
        foreach($tables as $table){
            $check('storage:'.$table['TABLE_NAME'],(int)($table['ENGINE']!=='InnoDB'||!str_starts_with($table['TABLE_COLLATION']??'','utf8mb4_')));
        }
        $keys=$this->db->run('SELECT TABLE_NAME,COLUMN_NAME,CONSTRAINT_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION')->fetchAll();
        $relations=[];$groups=[];
        foreach($keys as $key){
            $relations[$key['TABLE_NAME'].'.'.$key['COLUMN_NAME']]=$key['REFERENCED_TABLE_NAME'].'.'.$key['REFERENCED_COLUMN_NAME'];
            $groups[$key['TABLE_NAME'].'.'.$key['CONSTRAINT_NAME']][]=$key;
        }
        foreach([
            'employees.site_id'=>'sites.id','admins.site_id'=>'sites.id','admins.dni'=>'employees.dni',
            'courses.site_id'=>'sites.id','courses.created_by'=>'admins.id','courses.custom_cover_id'=>'files.id',
            'files.course_id'=>'courses.id','file_previews.file_id'=>'files.id','exams.course_id'=>'courses.id',
            'enrollments.exam_id'=>'exams.id','attempts.enrollment_id'=>'enrollments.id',
            'events.image_id'=>'files.id','event_images.event_id'=>'events.id','event_images.file_id'=>'files.id',
            'home_slides.image_id'=>'files.id','home_popup.image_id'=>'files.id',
            'policies.file_id'=>'files.id','policies.cover_image_id'=>'files.id',
        ] as $column=>$reference)$check('relation:'.$column,(int)(($relations[$column]??null)!==$reference));
        $quote=static function(string $identifier): string {
            if(!preg_match('/^[a-zA-Z0-9_]+$/D',$identifier))throw new \RuntimeException('Identificador de esquema no compatible.');
            return '`'.$identifier.'`';
        };
        foreach($groups as $name=>$columns){
            $joins=[];$present=[];
            foreach($columns as $key){$child='c.'.$quote($key['COLUMN_NAME']);$joins[]=$child.'=p.'.$quote($key['REFERENCED_COLUMN_NAME']);$present[]=$child.' IS NOT NULL';}
            $sql='SELECT COUNT(*) FROM '.$quote($columns[0]['TABLE_NAME']).' c LEFT JOIN '.$quote($columns[0]['REFERENCED_TABLE_NAME']).' p ON '.implode(' AND ',$joins).' WHERE '.implode(' AND ',$present).' AND p.'.$quote($columns[0]['REFERENCED_COLUMN_NAME']).' IS NULL';
            $check('orphans:'.$name,(int)$this->db->run($sql)->fetchColumn());
        }
        $missingIndexes=(new DatabaseIntegrityMigration($this->db))->missing();
        foreach(DatabaseIntegrityMigration::INDEXES as $name=>$definition)$check('index:'.$name,(int)isset($missingIndexes[$name]));
        foreach([
            'duplicate_admin_dni'=>"SELECT COUNT(*) FROM (SELECT dni FROM admins WHERE dni IS NOT NULL GROUP BY dni HAVING COUNT(*)>1) d",
            'course_document_cover'=>"SELECT COUNT(*) FROM courses c LEFT JOIN files f ON f.id=c.cover_file_id WHERE c.cover_file_id IS NOT NULL AND (f.id IS NULL OR f.course_id IS NULL OR f.course_id<>c.id OR f.extension NOT IN ('pdf','ppt','pptx'))",
            'course_image_cover'=>"SELECT COUNT(*) FROM courses c LEFT JOIN files f ON f.id=c.custom_cover_id WHERE c.custom_cover_id IS NOT NULL AND (f.id IS NULL OR f.course_id IS NOT NULL OR f.mime NOT IN ('image/jpeg','image/png','image/webp'))",
            'published_material'=>"SELECT COUNT(*) FROM courses c WHERE status='published' AND NOT EXISTS(SELECT 1 FROM files f WHERE f.course_id=c.id)",
            'published_exam'=>"SELECT COUNT(*) FROM courses c WHERE status='published' AND exam_required=1 AND NOT EXISTS(SELECT 1 FROM exams e WHERE e.course_id=c.id)",
            'completed_result'=>"SELECT COUNT(*) FROM attempts WHERE status='completed' AND (score IS NULL OR score<0 OR score>20 OR submitted_at IS NULL)",
            'exam_json'=>"SELECT COUNT(*) FROM exams WHERE NOT JSON_VALID(questions_json)",
            'policy_document'=>"SELECT COUNT(*) FROM policies p JOIN files f ON f.id=p.file_id WHERE f.extension<>'pdf' OR f.course_id IS NOT NULL",
            'policy_cover'=>"SELECT COUNT(*) FROM policies p JOIN files f ON f.id=p.cover_image_id WHERE f.course_id IS NOT NULL OR f.mime NOT IN ('image/jpeg','image/png','image/webp')",
        ] as $name=>$sql)$check($name,(int)$this->db->run($sql)->fetchColumn());
        return ['ok'=>!array_filter($checks,fn($row)=>!$row['ok']),'checks'=>$checks];
    }
}
