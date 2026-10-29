<?php
declare(strict_types=1);

namespace Academia\Http;

use Academia\Agents\AdminAgent;
use Academia\Agents\ContentAgent;
use Academia\Agents\ExamAgent;
use Academia\Agents\ReportAgent;
use Academia\Repositories\ActivityRepository;
use Academia\Repositories\CategoryRepository;
use Academia\Repositories\CourseRepository;
use Academia\Repositories\EventRepository;
use Academia\Repositories\ExamRepository;
use Academia\Repositories\PersonnelRepository;
use Academia\Repositories\ReportRepository;
use Academia\Repositories\SiteRepository;
use Academia\Repositories\UserRepository;
use Academia\Services\AttemptTool;
use Academia\Services\AuthTool;
use Academia\Services\CourseCreationTool;
use Academia\Services\DocumentPreviewTool;
use Academia\Services\ExamRules;
use Academia\Services\FileTool;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\PresentationTool;

final class AgentRegistry
{
    private array $agents;
    private \Academia\Middleware\CourseAccess $access;

    public function __construct(Database $db, AuthTool $auth, array $config)
    {
        $files = new FileTool($db, $config, new PresentationTool());
        $rules = new ExamRules();
        $mediaUploads = new \Academia\Services\MediaUpload($db, $files);
        $exams = new ExamRepository($db, $rules);
        $categories = new CategoryRepository($db);
        $courses = new CourseRepository($db, $categories);
        $personnel = new PersonnelRepository($db);
        $attempts = new AttemptTool($db, $exams, $personnel, $rules, $config['max_attempts']);
        $this->access = new \Academia\Middleware\CourseAccess($auth, new \Academia\Repositories\AccessRepository($db));

        $this->agents = [
            'slider' => new \Academia\Agents\HomeSliderAgent($auth,$mediaUploads,new \Academia\Repositories\HomeSliderRepository($db)),
            'popup' => new \Academia\Agents\HomePopupAgent($auth,$mediaUploads,new \Academia\Repositories\HomePopupRepository($db)),
            'view' => new \Academia\Agents\ViewAgent(new \Academia\Services\ContentViews($db, $auth)),
            'admin' => new AdminAgent(
                $auth,
                $files,
                new EventRepository($db, $categories),
                $categories,
                new UserRepository($db),
                new SiteRepository($db),
                $personnel,
                new \Academia\Services\PersonnelImportTool($personnel,$config),
                new ActivityRepository($db)
            ),
            'content' => new ContentAgent(
                $auth,
                $courses,
                $files,
                new CourseCreationTool($db, $courses, $files),
                $categories,
                new DocumentPreviewTool($db, $config),
                $this->access
            ),
            'exam' => new ExamAgent(
                $auth,
                $exams,
                $attempts,
                new \Academia\Services\ParticipantAccess($db, $attempts)
            ),
            'report' => new ReportAgent($auth, new ReportRepository($db)),
        ];
    }

    public function dispatch(string $agent, string $action, RequestContext $context): mixed
    {
        if (!isset($this->agents[$agent])) {
            Http::fail(404, 'Agente no encontrado.');
        }

        return $this->access->dispatch($agent, $action, $context, fn() => $this->agents[$agent]->execute($action, $context));
    }
}
