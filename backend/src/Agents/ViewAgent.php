<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
use Academia\Services\ContentViews;
final class ViewAgent implements AgentInterface {
    public function __construct(private ContentViews $views) {}
    public function execute(string $action,RequestContext $context): mixed {
        $context->requireMethod('POST');
        return $this->views->record($action,$context->id());
    }
}
