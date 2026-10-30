<?php
declare(strict_types=1);
namespace Academia\Http;
use Academia\Support\Database;
use Academia\Services\AuthTool;
use Academia\Support\Http;
use Academia\Support\FileCache;
final class ApiKernel {
    public static function handle(string $path, array $config): never {
        $requestId=bin2hex(random_bytes(8));header('X-Request-Id: '.$requestId);
        try{
            $method=$_SERVER['REQUEST_METHOD']??'GET';
            $route=(new Router(require dirname(__DIR__,2).'/routes/api.php'))->resolve($method,rtrim($path,'/')?:'/');
            $db=new Database($config);
            if($route['action']==='health'){
                foreach(['admins','auth_attempts','sites','employees','categories','courses','files','announcements','events','event_images','exams','enrollments','attempts','activity_log','file_previews','home_popup','home_slides'] as $table)$db->run("SELECT 1 FROM $table LIMIT 1");
                Http::json(['data'=>['app'=>'La Academia','status'=>'ok','database'=>'connected','environment'=>$config['environment']],'meta'=>['request_id'=>$requestId,'api_version'=>'v1']]);
            }
            $background=$route['action']==='notifications.list'&&($_GET['background']??null)==='1';
            $auth=new AuthTool($db,$config,!$background);
            if($route['access']==='admin')$auth->requireAdmin();
            if($route['access']==='superadmin')$auth->requireSuperAdmin();
            if(!in_array($method,['GET','HEAD'],true))$auth->csrf();
            $request=new RequestContext();
            $input=$request->input;
            // Route identity is authoritative; body IDs cannot change the target resource.
            if(in_array($method,['POST','PUT','PATCH'],true)&&!isset($route['params']['id'])&&isset($input['id']))Http::fail(422,'No envíes id al crear un recurso.',['id'=>'Usa la ruta del recurso para editar.']);
            $input=array_replace($input,$route['params']);
            $context=new RequestContext($input,in_array($method,['GET','HEAD'],true)?'GET':'POST',$route['params']);
            $registry=new AgentRegistry($db,$auth,$config);
            $cache=new FileCache($config['cache_directory']);
            $load=fn()=>$registry->dispatch($route['agent'],$route['action'],$context);
            // Whitelist only non-personal lists. Permissions, files, sessions, exams and results stay live.
            $cacheable=$method==='GET'&&(($route['agent']==='content'&&$route['action']==='list')||(in_array($route['agent'],['popup','slider'],true)&&$route['action']==='public')||in_array($route['action'],['categories.list','events.public','announcements.public','notifications.list'],true));
            if($cacheable){
                $scope=$_GET['scope']??'course';
                if(!is_string($scope)||!in_array($scope,['course','event'],true))Http::fail(422,'Ámbito de categoría no válido.');
                $audience=$route['action']==='announcements.public'&&$auth->user()?'authenticated':'public';
                $notificationScope=$route['action']==='notifications.list'?(\Academia\Services\CoursePolicy::siteId($auth->requireAdmin())??'all'):'public';
                $key='v6:'.$route['agent'].':'.$route['action'].':'.$scope.':'.$audience.':'.$notificationScope;
                $ttl=in_array($route['action'],['announcements.public','notifications.list'],true)?15:(int)$config['cache_ttl'];
                $data=$cache->remember($key,$ttl,$load,$hit);
                header('X-App-Cache: '.($hit?'HIT':'MISS'));
            }else{
                $data=$load();
                header('X-App-Cache: BYPASS');
            }
            $newCourseView=$route['agent']==='view'&&$route['action']==='course'&&($data['recorded']??false);
            if($newCourseView||(!in_array($method,['GET','HEAD'],true)&&$route['agent']!=='view'&&($route['agent']!=='exam'||in_array($route['action'],['save','status','submit'],true))&&!in_array($route['action'],['login','logout','setup'],true)))$cache->invalidate();
            $documentWork=in_array($route['action'],['preview.retry','preview.status'],true)||($route['action']==='upload'&&($data['media_type']??'document')!=='video')||($route['action']==='create'&&array_filter($data['materials']??[],fn($file)=>in_array($file['extension'],['pdf','ppt','pptx'],true)));
            if($route['agent']==='content'&&$documentWork)\Academia\Services\DocumentPreviewTool::kick($config);
            if(!in_array($method,['GET','HEAD'],true)&&$route['agent']!=='view'&&!in_array($route['action'],['participant','start'],true))\Academia\Support\Logger::write('info',$route['agent'],'operation.succeeded',$requestId,['route'=>$route['template'],'method'=>$method,'status'=>$route['status'],'actor_id'=>(int)($_SESSION['admin']['id']??0)]);
            Http::json(['data'=>$data,'meta'=>['request_id'=>$requestId,'api_version'=>'v1']],$route['status']);
        }catch(\Throwable $error){
            ErrorHandler::respond($error,$requestId,$route??[],$method??'');
        }

    }
}
