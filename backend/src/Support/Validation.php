<?php
declare(strict_types=1);
namespace Academia\Support;

final class Validation {
    public static function text(array $data,string $key,int $min=1,int $max=255): string {
        if (!is_string($data[$key]??null)) Http::fail(422,"Completa el campo: $key.",[$key=>'Completa este campo.']);
        if(!mb_check_encoding($data[$key],'UTF-8')||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$data[$key]))Http::fail(422,"Revisa el campo $key.",[$key=>'El texto contiene caracteres no válidos.']);
        $value=preg_replace('/^\s+|\s+$/u','',$data[$key]);
        if (mb_strlen($value)<$min||mb_strlen($value)>$max) Http::fail(422,"Revisa el campo $key.",[$key=>"Debe tener entre $min y $max caracteres."]);
        return $value;
    }
    public static function email(array $data,string $key='email'): string {
        $value=strtolower(self::text($data,$key,5,190));
        if(!filter_var($value,FILTER_VALIDATE_EMAIL))Http::fail(422,'Correo no válido.',[$key=>'Escribe un correo válido.']);
        return $value;
    }
    public static function name(array $data,string $key,int $min,int $max): string {
        $value=self::text($data,$key,0,$max);
        return self::text([$key=>preg_replace('/\s+/u',' ',$value)],$key,$min,$max);
    }
    public static function choice(array $data,string $key,array $choices): string {
        $value=self::text($data,$key);
        if (!in_array($value,$choices,true)) Http::fail(422,"Valor no válido para $key.",[$key=>'Selecciona una opción válida.']);
        return $value;
    }
    public static function number(array $data,string $key,int $min,int $max): int {
        $raw=$data[$key]??null;
        $value=(is_int($raw)||is_string($raw))?filter_var($raw,FILTER_VALIDATE_INT):false;
        if ($value===false||$value<$min||$value>$max) Http::fail(422,"Revisa el campo $key.",[$key=>"Debe estar entre $min y $max."]);
        return $value;
    }
}
