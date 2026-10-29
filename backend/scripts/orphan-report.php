<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
$db=new Academia\Support\Database(require dirname(__DIR__).'/config/application.php');
// Read-only maintenance report: never removes files automatically.
$rows=$db->run("SELECT f.id,f.original_name,f.created_at,f.size FROM files f WHERE f.course_id IS NULL AND f.created_at<NOW()-INTERVAL 1 DAY AND NOT EXISTS(SELECT 1 FROM announcements a WHERE a.image_id=f.id) AND NOT EXISTS(SELECT 1 FROM events e WHERE e.image_id=f.id) AND NOT EXISTS(SELECT 1 FROM event_images ei WHERE ei.file_id=f.id) AND NOT EXISTS(SELECT 1 FROM home_popup hp WHERE hp.image_id=f.id) AND NOT EXISTS(SELECT 1 FROM home_slides hs WHERE hs.image_id=f.id) AND NOT EXISTS(SELECT 1 FROM courses c WHERE c.custom_cover_id=f.id) ORDER BY f.id")->fetchAll();
echo json_encode(['unlinked_files'=>$rows,'count'=>count($rows),'action'=>'review_only'],JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT)."\n";
