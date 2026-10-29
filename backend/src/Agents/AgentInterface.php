<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
interface AgentInterface { public function execute(string $action,RequestContext $context): mixed; }
