<?php
declare(strict_types=1);
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/bootstrap.php';
$config=require dirname(__DIR__).'/config/maintenance.php';
$db=new Academia\Support\Database($config);
$sql=file_get_contents(dirname(__DIR__).'/database/schema.sql');
foreach (explode(';',$sql) as $statement) if (trim($statement)!=='') $db->pdo->exec($statement);
(new Academia\Migrations\HomePopupCollectionMigration($db))->run();
(new Academia\Migrations\PortalMediaMigration($db))->run();
(new Academia\Migrations\SliderContentMigration($db))->run();
(new Academia\Migrations\VideoMaterialsMigration($db))->run();
(new Academia\Migrations\TrainingEditorMigration($db))->run();
(new Academia\Migrations\CatalogMigration($db))->run();
(new Academia\Migrations\AccessMigration($db))->run();
(new Academia\Migrations\ExamScheduleMigration($db))->run();
(new Academia\Migrations\ExamPolicyMigration($db))->run();
(new Academia\Migrations\ContentViewsMigration($db))->run();
(new Academia\Migrations\CourseExamMigration($db))->run();
(new Academia\Migrations\PersonnelMigration($db))->run();
(new Academia\Migrations\OrganizationMigration($db))->run();
(new Academia\Migrations\PreviewMigration($db))->run();
$db->pdo->exec('INSERT IGNORE INTO event_images(event_id,file_id,position) SELECT id,image_id,0 FROM events WHERE image_id IS NOT NULL');
if (!is_dir($config['storage'])&&!mkdir($config['storage'],0700,true)) throw new RuntimeException('No se pudo crear el almacenamiento privado.');
$db->run("INSERT INTO activity_log(event_key,event_type,entity_type,entity_id,course_id,exam_id,title,body,created_at)
 SELECT CONCAT('attempt.submitted:',a.id),'attempt.submitted','attempt',a.id,x.course_id,x.id,'Resultado recibido',CONCAT(c.title,' · Examen v',x.version,'. Evaluación registrada.'),a.submitted_at
 FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id JOIN courses c ON c.id=x.course_id
 WHERE a.status='completed' AND a.submitted_at IS NOT NULL
 ON DUPLICATE KEY UPDATE id=activity_log.id");
(new Academia\Repositories\ActivityRepository($db))->synchronizeClosed();
echo "Migración aplicada: La Academia\n";
