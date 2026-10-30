<?php
declare(strict_types=1);
namespace Academia\Agents;
use Academia\Http\RequestContext;
use Academia\Services\AuthTool;
use Academia\Repositories\CourseRepository;
use Academia\Services\CourseCreationTool;
use Academia\Repositories\CategoryRepository;
use Academia\Services\FileTool;
use Academia\Support\Http;
final class ContentAgent implements AgentInterface {
    public function __construct(private AuthTool $auth,private CourseRepository $courses,private FileTool $files,private CourseCreationTool $creation,private CategoryRepository $categories,private \Academia\Services\DocumentPreviewTool $previews,private \Academia\Middleware\CourseAccess $access) {}
    public function execute(string $action,RequestContext $context): mixed {
        if($action==='categories.list'){$context->requireMethod('GET');$scope=$_GET['scope']??'course';if(!is_string($scope))Http::fail(422,'Ámbito de categoría no válido.');return $this->categories->list($scope);}
        if($action==='list'){$context->requireMethod('GET');return $this->courses->list();}
        if($action==='get'){$context->requireMethod('GET');return $this->courses->get($context->id());}
        if(in_array($action,['file','slides','thumbnail','preview','preview.status'],true)){
            $context->requireMethod('GET');$file=$this->files->get($context->id());
            if(!$this->files->visible($file))$this->access->requirePrivateFile($file);
            if($action==='preview.status')return $this->previews->status((int)$file['id']);
            if($action==='thumbnail'||$action==='preview')$this->previews->stream($file,$action==='preview');
            if($action==='file')$this->files->stream($file,isset($_GET['download']));
            return ['name'=>$file['original_name'],'slides'=>json_decode($file['slides_json']?:'[]',true)];
        }
        $actor=$this->auth->requireAdmin();
        if($action==='upload.options'){$context->requireMethod('GET');return $this->files->uploadOptions();}
        if($action==='admin.list'){$context->requireMethod('GET');return $this->courses->list(true,\Academia\Services\CoursePolicy::siteId($actor));}
        if($action==='admin.get'){$context->requireMethod('GET');return $this->courses->get($context->id(),true);}
        $context->requireMethod('POST');
        if($action==='preview.retry'){$file=$this->files->get($context->id());if(!$file['course_id'])Http::fail(422,'Selecciona un material de capacitación.');return $this->previews->enqueue((int)$file['id'],true);}
        if($action==='upload'){$course=$this->courses->get($context->id('course_id'),true);return $this->files->add($_FILES['file']??[],(int)$course['id']);}
        return match($action){
            'create'=>$this->creation->create($context->input,$_FILES['file']??[],$actor),
            'save'=>$this->courses->save($context->input,!empty($context->input['id'])?$context->id():null,$actor),
            'cover.upload'=>$this->creation->uploadCover($context->id(),$_FILES['file']??[]),
            'cover'=>$this->courses->cover($context->id(),$context->id('file_id')),
            'publish'=>$this->courses->publish($context->id()),
            'delete'=>$this->courses->archive($context->id()),
            'file.delete'=>$this->files->remove($context->id()),
            default=>Http::fail(404,'Acción no encontrada.'),
        };
    }
}
