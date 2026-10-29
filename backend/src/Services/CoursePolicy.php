<?php
declare(strict_types=1);
namespace Academia\Services;

use Academia\Support\Http;

/** The documented administrative boundary; published content remains public. */
final class CoursePolicy
{
    public static function siteId(array $actor): ?int
    {
        if (($actor['role'] ?? null) === 'superadmin') return null;
        if (($actor['role'] ?? null) !== 'capacitador' || (int)($actor['site_id'] ?? 0) < 1) {
            Http::fail(403, 'Tu acceso necesita una sede asignada. Contacta con superadministración.');
        }
        return (int)$actor['site_id'];
    }

    public static function requireCourse(array $actor, array $course): void
    {
        $site = self::siteId($actor);
        if ($site !== null && (int)($course['site_id'] ?? 0) !== $site) {
            Http::fail(403, 'Solo puedes gestionar capacitaciones de tu sede.');
        }
    }
}
