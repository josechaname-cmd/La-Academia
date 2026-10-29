<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
use Academia\Services\AuthTool;
use Academia\Repositories\EventRepository;
use Academia\Repositories\CategoryRepository;
use Academia\Repositories\UserRepository;
use Academia\Repositories\SiteRepository;
use Academia\Repositories\PersonnelRepository;
use Academia\Services\FileTool;
use Academia\Services\PersonnelImportTool;
use Academia\Support\Http;
final class AdminAgent implements AgentInterface {
    public function __construct(private AuthTool $auth,private FileTool $files,private EventRepository $events,private CategoryRepository $categories,private UserRepository $users,private SiteRepository $sites,private PersonnelRepository $personnel,private PersonnelImportTool $personnelImport,private \Academia\Repositories\ActivityRepository $activity) {}
    public function execute(string $action,RequestContext $context): mixed {
        if($action==='session'){$context->requireMethod('GET');return $this->auth->session();}
        if(in_array($action,['setup','login','logout'],true)){$context->requireMethod('POST');return $this->auth->$action($context->input);}
        if($action==='announcements.public'){$context->requireMethod('GET');return [];}
        if($action==='events.public'){$context->requireMethod('GET');return $this->events->list();}
        $this->auth->requireAdmin();
        if($action==='notifications.list'){$context->requireMethod('GET');return $this->activity->feed(\Academia\Services\CoursePolicy::siteId($this->auth->requireAdmin()));}
        if(in_array($action,['users.list','sites.list','personnel.list','users.save','sites.save','personnel.create','personnel.update','personnel.delete','personnel.preview','personnel.import'],true)){
            $actor=$this->auth->requireSuperAdmin();
            $context->requireMethod(str_ends_with($action,'.list')?'GET':'POST');
            $id=!empty($context->input['id'])?$context->id():null;
            return match($action){
                'users.list'=>$this->users->list(),'sites.list'=>$this->sites->list(),'personnel.list'=>$this->personnel->list(),
                'users.save'=>$this->users->save($context->input,$id,(int)$actor['id']),
                'sites.save'=>$this->sites->save($context->input,$id),
                'personnel.create'=>$this->personnel->save($context->input),
                'personnel.update'=>$this->personnel->save($context->input,true),
                'personnel.delete'=>$this->personnel->remove($context->input),
                'personnel.preview'=>$this->personnelImport->import($_FILES['file']??[],empty($context->input['site_id'])?0:$context->id('site_id'),true),
                'personnel.import'=>$this->personnelImport->import($_FILES['file']??[],empty($context->input['site_id'])?0:$context->id('site_id'),false,\Academia\Support\Validation::text($context->input,'preview_token',64,64)),
            };
        }
        if(str_starts_with($action,'announcements.'))Http::fail(410,'Los avisos manuales fueron retirados. La campana muestra actividad automática.');
        if($action==='events.list'){$context->requireMethod('GET');return $this->events->list(true);}
        $context->requireMethod('POST');
        return match($action){
            'categories.create'=>$this->categories->create($context->input),
            'events.save'=>$this->events->save($context->input,!empty($context->input['id'])?$context->id():null),
            'events.delete'=>$this->events->remove($context->id()),
            'image.upload'=>$this->files->add($_FILES['file']??[],null,true),
            default=>Http::fail(404,'Acción no encontrada.'),
        };
    }
}
