<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
use Academia\Services\AuthTool;
use Academia\Services\PolicyTool;
use Academia\Support\Http;
final class PolicyAgent implements AgentInterface {
 public function __construct(private AuthTool $auth,private PolicyTool $policies) {}
 public function execute(string $action,RequestContext $context): mixed {
  if(in_array($action,['list','get'],true)){$context->requireMethod('GET');return $action==='list'?$this->policies->list():$this->policies->get($context->id());}
  $actor=$this->auth->requireAdmin();
  if(in_array($action,['admin.list','admin.get'],true)){$context->requireMethod('GET');return $action==='admin.list'?$this->policies->list($actor):$this->policies->get($context->id(),$actor);}
  $context->requireMethod('POST');
  return match($action){
   'create'=>$this->policies->save($context->input,$_FILES['file']??null,null,$actor),
   'save'=>$this->policies->save($context->input,$_FILES['file']??null,$context->id(),$actor),
   'delete'=>$this->policies->remove($context->id(),$actor),
   default=>Http::fail(404,'Acción no encontrada.'),
  };
 }
}
