<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
use Academia\Support\Http;
use Academia\Services\AuthTool;
use Academia\Repositories\HomePopupRepository;
final class HomePopupAgent implements AgentInterface {
    public function __construct(private AuthTool $auth,private \Academia\Services\MediaUpload $uploads,private HomePopupRepository $popups) {}
    public function execute(string $action,RequestContext $context): mixed {
        if($action==='public'){$context->requireMethod('GET');return $this->popups->get();}
        $this->auth->requireSuperAdmin();
        if($action==='list'){$context->requireMethod('GET');return $this->popups->list();}
        if($action==='get'){$context->requireMethod('GET');return $this->popups->get(true,$context->id());}
        if($action==='status'){$context->requireMethod('POST');return $this->popups->setActive($context->id(),\Academia\Support\Validation::number($context->input,'active',0,1));}
        if($action==='delete'){$context->requireMethod('POST');return $this->popups->remove($context->id());}
        if($action!=='save')Http::fail(404,'Acción no encontrada.');
        $context->requireMethod('POST');
        return $this->uploads->save($_FILES['file']??null,fn(?int $image)=>$this->popups->save($context->input,$image,isset($context->input['id'])?$context->id():null));
    }
}
