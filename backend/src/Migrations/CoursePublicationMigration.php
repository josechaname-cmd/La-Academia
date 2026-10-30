<?php
declare(strict_types=1);
namespace Academia\Migrations;
use Academia\Support\Database;
final class CoursePublicationMigration {
 public function __construct(private Database $db) {}
 public function run(): void {
  $columns=$this->db->run('SHOW COLUMNS FROM courses')->fetchAll(\PDO::FETCH_COLUMN);
  if(!in_array('first_published_at',$columns,true))$this->db->pdo->exec('ALTER TABLE courses ADD first_published_at DATETIME NULL');
  // Preserve the lifecycle of existing published, archived and previously published drafts.
  $this->db->run("UPDATE courses c SET first_published_at=COALESCE((SELECT MIN(l.created_at) FROM activity_log l WHERE l.course_id=c.id AND l.event_type='course.published'),c.created_at) WHERE c.first_published_at IS NULL AND (c.status IN ('published','archived') OR EXISTS(SELECT 1 FROM activity_log l WHERE l.course_id=c.id AND l.event_type='course.published') OR EXISTS(SELECT 1 FROM exams x JOIN enrollments e ON e.exam_id=x.id JOIN attempts a ON a.enrollment_id=e.id WHERE x.course_id=c.id))");
 }
}
