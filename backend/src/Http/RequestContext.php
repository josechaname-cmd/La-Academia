<?php
declare(strict_types=1);
namespace Academia\Http;
use Academia\Support\Http;
final class RequestContext {
    public readonly array $input;
    public readonly string $method;
    public function __construct(?array $input=null,?string $method=null,private array $params=[]) {
        $this->method=$method??($_SERVER['REQUEST_METHOD']??'GET');
        if($input!==null){$this->input=$input;return;}
        $type=strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]));
        if($type==='application/json'){
            $raw=file_get_contents('php://input',false,null,0,1024*1024+1);
            if(strlen($raw)>1024*1024)Http::fail(413,'La solicitud supera el tamaño permitido.');
            try{$data=json_decode($raw,false,64,JSON_THROW_ON_ERROR);}catch(\JsonException){Http::fail(400,'JSON no válido.');}
            if(!is_object($data))Http::fail(400,'Se esperaba un objeto JSON.');
            $this->input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
        }elseif(!in_array($this->method,['GET','HEAD'],true)&&!($type==='multipart/form-data'&&$this->method==='POST')){Http::fail(415,'Usa application/json; las cargas multipart/form-data requieren POST.');}
        else {
            $max=\Academia\Services\MaterialUploadPolicy::bytes(ini_get('post_max_size'));
            if($type==='multipart/form-data'&&$max>0&&(int)($_SERVER['CONTENT_LENGTH']??0)>$max)Http::fail(413,'La carga supera el límite del servidor. Selecciona un archivo más pequeño.',['file'=>'Archivo demasiado grande para esta instalación.']);
            $this->input=$_POST;
        }
    }
    public static function validateQuery(): void {
        // PHP otherwise silently keeps only the last repeated scalar parameter.
        $seen=[];
        foreach(explode('&',$_SERVER['QUERY_STRING']??'') as $pair){
            if($pair==='')continue;
            $key=urldecode(explode('=',$pair,2)[0]);
            $key=str_replace(['.',' '],'_',$key);
            if($key===''||str_contains($key,'[')||str_contains($key,']')||preg_match('/[\x00-\x1F\x7F]/',$key)||isset($seen[$key]))Http::fail(400,'La consulta contiene parámetros repetidos o no válidos.');
            $seen[$key]=true;
        }
        foreach($_GET as $value)if(!is_string($value))Http::fail(400,'Los parámetros de consulta deben ser valores simples.');
        foreach(['background','download'] as $key)if(isset($_GET[$key])&&!in_array($_GET[$key],['0','1'],true))Http::fail(422,'Parámetro de consulta no válido.',[$key=>'Usa 0 o 1.']);
    }
    public function id(string $key='id'): int {
        $value=$this->params[$key]??$this->input[$key]??$_GET[$key]??null;
        if(!is_int($value)&&!(is_string($value)&&preg_match('/^[1-9][0-9]*$/D',$value)))Http::fail(422,'Identificador no válido.',[$key=>'Selecciona un registro válido.']);
        $id=filter_var($value,FILTER_VALIDATE_INT);
        if($id===false||$id<1)Http::fail(422,'Identificador no válido.',[$key=>'Selecciona un registro válido.']);
        return $id;
    }
    public function requireMethod(string $method): void {if($this->method!==$method)Http::fail(405,'Método no permitido.');}
}
