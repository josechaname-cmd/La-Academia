<?php
declare(strict_types=1);
namespace Academia\Validators;
use Academia\Support\Http;

final class Password
{
    public static function forCreation(mixed $value): string
    {
        // Preserve intentional whitespace; bcrypt cannot accept NUL or >72 bytes.
        if (!is_string($value) || mb_strlen($value)<12 || strlen($value)>72 || str_contains($value,"\0")) {
            Http::fail(422,'Utiliza una contraseña de al menos 12 caracteres y como máximo 72 bytes.',['password'=>'Revisa la longitud y evita caracteres nulos.']);
        }
        return $value;
    }
}
