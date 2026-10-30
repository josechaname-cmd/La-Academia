<?php
declare(strict_types=1);
namespace Academia\Middleware;

use Academia\Http\RequestContext;
use Academia\Repositories\AccessRepository;
use Academia\Services\AuthTool;
use Academia\Services\CoursePolicy;
use Academia\Support\Http;

final class CourseAccess
{
    public function __construct(private AuthTool $auth, private AccessRepository $records) {}

    public function dispatch(string $agent, string $action, RequestContext $context, callable $next): mixed
    {
        $course = null;
        if ($agent === 'content') {
            if (in_array($action, ['admin.get','save','publish','delete','purge','cover','cover.upload'], true)) $course = $context->id();
            elseif ($action === 'upload') $course = $context->id('course_id');
            elseif (in_array($action, ['file.delete','preview.retry'], true)) {
                $this->auth->requireAdmin();
                $course = $this->records->fileCourse($context->id());
            }
        } elseif ($agent === 'exam' && in_array($action, ['get','save','status'], true)) {
            $course = $context->id('course_id');
        } elseif ($agent === 'report' && ($action === 'export' || ($action === 'results' && isset($_GET['exam_id'])))) {
            $this->auth->requireAdmin();
            $course = $this->records->examCourse($context->id($action === 'export' ? 'id' : 'exam_id'));
        }
        if ($course === null) return $next();
        $actor = $this->auth->requireAdmin();
        $check = static function (array $row) use ($actor, $next): mixed {
            CoursePolicy::requireCourse($actor, $row);
            return $next();
        };
        // Authorization and mutation share a row lock, including concurrent reassignment.
        return $context->method === 'GET' ? $check($this->records->course($course)) : $this->records->withinCourse($course, $check);
    }

    public function requirePrivateFile(array $file): void
    {
        $actor = $this->auth->user();
        if (!$actor) Http::fail(404, 'Archivo no disponible.');
        if (CoursePolicy::siteId($actor) === null) return;
        if($policy=$this->records->filePolicy((int)$file['id'])){CoursePolicy::requireCourse($actor,$policy);return;}
        if ($file['course_id']) {
            CoursePolicy::requireCourse($actor, $this->records->course((int)$file['course_id']));
            return;
        }
        if ($this->records->restrictedPortalImage((int)$file['id'])) Http::fail(403, 'Archivo reservado a superadministración.');
        foreach ($this->records->privateImageCourses((int)$file['id']) as $course) CoursePolicy::requireCourse($actor, $course);
        // Unassigned event images have no owner column; retain the shared event workflow.
    }
}
