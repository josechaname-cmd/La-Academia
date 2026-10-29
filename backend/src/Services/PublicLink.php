<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;

final class PublicLink {
    public function __construct(private Database $db) {}
    public static function external(string $url): bool {
        if(!filter_var($url,FILTER_VALIDATE_URL)||preg_match('/[\x00-\x20\x7f\\\\]/',$url))return false;
        $parts=parse_url($url);
        return is_array($parts)&&in_array(strtolower($parts['scheme']??''),['http','https'],true)&&!isset($parts['user'])&&!isset($parts['pass']);
    }
    public function available(string $url): bool {
        if(self::external($url))return true;
        if(in_array($url,['#inicio','#capacitaciones','#eventos'],true))return true;
        if(!preg_match('~^#(curso|eventos)/([1-9][0-9]*)$~D',$url,$match))return false;
        return (bool)$this->db->run($match[1]==='curso'?"SELECT id FROM courses WHERE id=? AND status='published'":'SELECT id FROM events WHERE id=? AND active=1',[$match[2]])->fetchColumn();
    }
    public function validate(string $url): void {
        if($url!==''&&!$this->available($url))Http::fail(422,'Selecciona una publicación disponible o un enlace HTTP/HTTPS válido, sin credenciales.',['link_url'=>'Revisa el destino del enlace.']);
    }
}
