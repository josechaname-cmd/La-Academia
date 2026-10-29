<?php
declare(strict_types=1);
namespace Academia\Support;

use Academia\Http\ApiException;
final class Http {
    public static function entryScript(string $script): string {
        return preg_replace('~/public/index\.php$~','/index.php',str_replace('\\','/',$script));
    }
    public static function fail(int $status,string $message,array $fields=[],string $code='request_error'): never {throw new ApiException($status,$message,$fields,$code);}
    public static function json(mixed $data,int $status=200): never {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
        echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE|JSON_THROW_ON_ERROR);exit;
    }
}
