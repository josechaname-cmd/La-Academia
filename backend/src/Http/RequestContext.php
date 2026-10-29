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
        $type=$_SERVER['CONTENT_TYPE']??'';
        if(str_contains($type,'application/json')){
            $raw=file_get_contents('php://input');
            if(strlen($raw)>1024*1024)Http::fail(413,'La solicitud supera el tamaño permitido.');
            try{$data=json_decode($raw,false,64,JSON_THROW_ON_ERROR);}catch(\JsonException){Http::fail(400,'JSON no válido.');}
            if(!is_object($data))Http::fail(400,'Se esperaba un objeto JSON.');
            $this->input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
        }elseif($this->method!=='GET'&&!str_contains($type,'multipart/form-data')){Http::fail(415,'Usa application/json o multipart/form-data.');}
        else $this->input=$_POST;
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
