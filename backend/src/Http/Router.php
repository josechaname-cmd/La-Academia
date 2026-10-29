<?php
declare(strict_types=1);
namespace Academia\Http;
use Academia\Support\Http;
final class Router {
    public function __construct(private array $routes) {}
    public function resolve(string $method,string $path): array {
        $allowed=[];
        foreach($this->routes as [$verb,$template,$agent,$action,$access,$status]){
            $regex=preg_replace('/\\\{([a-z_]+)\\\}/','(?P<$1>[1-9][0-9]*)',preg_quote($template,'~'));
            if(!preg_match('~^'.$regex.'$~D',$path,$matches))continue;
            $allowed[]=$verb;if($method!==$verb)continue;
            $params=array_filter($matches,fn($key)=>is_string($key),ARRAY_FILTER_USE_KEY);
            return compact('agent','action','access','status','params','template');
        }
        if($allowed){header('Allow: '.implode(', ',$allowed));Http::fail(405,'Método no permitido.');}
        Http::fail(404,'Ruta no encontrada.');
    }
}
