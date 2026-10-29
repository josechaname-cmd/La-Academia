<?php
declare(strict_types=1);

namespace Academia\Agents;

use Academia\Http\RequestContext;
use Academia\Repositories\ExamRepository;
use Academia\Services\AttemptTool;
use Academia\Services\AuthTool;
use Academia\Support\Http;

final class ExamAgent implements AgentInterface
{
    public function __construct(
        private AuthTool $auth,
        private ExamRepository $exams,
        private AttemptTool $attempts,
        private \Academia\Services\ParticipantAccess $participants
    ) {}

    public function execute(string $action, RequestContext $context): mixed
    {
        if ($action === 'participant') {
            $context->requireMethod('POST');
            return $this->participants->identify($context->id('course_id'), $context->input);
        }

        if ($action === 'start') {
            $context->requireMethod('POST');
            return $this->participants->start($context->id('course_id'), $context->input);
        }

        if ($action === 'submit') {
            $context->requireMethod('POST');
            return $this->attempts->submit($context->input);
        }

        $this->auth->requireAdmin();

        if ($action === 'get') {
            $context->requireMethod('GET');
            return $this->exams->latest($context->id('course_id'));
        }

        if ($action === 'status') {
            $context->requireMethod('POST');
            return $this->exams->setEnabled($context->id('course_id'), $context->input);
        }

        if ($action === 'save') {
            $context->requireMethod('POST');
            return $this->exams->save($context->id('course_id'), $context->input, $this->auth->requireAdmin());
        }

        Http::fail(404, 'Acción no encontrada.');
    }
}
