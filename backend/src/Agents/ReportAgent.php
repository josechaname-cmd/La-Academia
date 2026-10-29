<?php
declare(strict_types=1);

namespace Academia\Agents;

use Academia\Http\RequestContext;
use Academia\Repositories\ReportRepository;
use Academia\Services\AuthTool;
use Academia\Support\Http;

final class ReportAgent implements AgentInterface
{
    public function __construct(private AuthTool $auth, private ReportRepository $reports) {}

    public function execute(string $action, RequestContext $context): mixed
    {
        $siteId = \Academia\Services\CoursePolicy::siteId($this->auth->requireAdmin());
        $context->requireMethod('GET');

        return match ($action) {
            'results' => $this->reports->results(isset($_GET['exam_id']) ? $context->id('exam_id') : null, $siteId),
            'exams' => $this->reports->exams($siteId),
            'export' => (new \Academia\Services\ReportExport($this->reports))->export($context->id(), $siteId),
            'summary' => $this->reports->summary($siteId),
            default => Http::fail(404, 'Acción no encontrada.'),
        };
    }
}
