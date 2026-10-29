<?php
declare(strict_types=1);
namespace Academia\Repositories;

use Academia\Support\Database;
use Academia\Support\Http;

final class AccessRepository
{
    public function __construct(private Database $db) {}

    public function course(int $id, bool $lock = false): array
    {
        return $this->db->run('SELECT id,site_id,status FROM courses WHERE id=?'.($lock ? ' FOR UPDATE' : ''), [$id])->fetch()
            ?: Http::fail(404, 'Capacitación no disponible.');
    }

    public function examCourse(int $id): int
    {
        $course = $this->db->run('SELECT course_id FROM exams WHERE id=?', [$id])->fetchColumn();
        return $course === false ? Http::fail(404, 'Examen no encontrado.') : (int)$course;
    }

    public function fileCourse(int $id): ?int
    {
        $file = $this->db->run('SELECT course_id FROM files WHERE id=?', [$id])->fetch();
        if (!$file) Http::fail(404, 'Archivo no encontrado.');
        return $file['course_id'] === null ? null : (int)$file['course_id'];
    }

    public function privateImageCourses(int $id): array
    {
        return $this->db->run('SELECT id,site_id FROM courses WHERE custom_cover_id=?', [$id])->fetchAll();
    }

    public function restrictedPortalImage(int $id): bool
    {
        return (bool)$this->db->run('SELECT id FROM home_popup WHERE image_id=? UNION ALL SELECT id FROM home_slides WHERE image_id=? LIMIT 1', [$id, $id])->fetchColumn();
    }

    public function withinCourse(int $id, callable $operation): mixed
    {
        return $this->db->transaction(fn() => $operation($this->course($id, true)));
    }
}
