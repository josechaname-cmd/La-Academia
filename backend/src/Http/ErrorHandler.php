<?php
declare(strict_types=1);
namespace Academia\Http;

use Academia\Support\Http;
use Academia\Support\Logger;

final class ErrorHandler
{
    public static function payload(\Throwable $error, string $requestId): array
    {
        $public = $error instanceof ApiException && $error->getCode() < 500;
        return ['error'=>[
            'code'=>$public ? $error->errorCode : 'internal_error',
            'message'=>$public ? $error->getMessage() : 'No se pudo completar la operación. Indica al soporte el identificador de solicitud.',
            'fields'=>$public ? (object)$error->fields : (object)[],
        ], 'meta'=>['request_id'=>$requestId, 'api_version'=>'v1']];
    }

    public static function respond(\Throwable $error, string $requestId, array $route = [], string $method = ''): never
    {
        $status = $error instanceof ApiException ? $error->getCode() : 500;
        $context = ['status'=>$status, 'route'=>$route['template'] ?? 'unresolved'];
        if (in_array($method, ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'], true)) $context['method'] = $method;
        if (isset($_SESSION['admin']['id'])) $context['actor_id'] = (int)$_SESSION['admin']['id'];
        Logger::failure($error, $route['agent'] ?? 'http', $requestId, $context);
        Http::json(self::payload($error, $requestId), $status);
    }

    public static function uncaught(\Throwable $error): never
    {
        $requestId = bin2hex(random_bytes(8));
        if (PHP_SAPI === 'cli') {
            Logger::failure($error, 'cli', $requestId);
            fwrite(STDERR, 'La operación falló. Referencia: '.$requestId.PHP_EOL);
            exit(1);
        }
        header('X-Request-Id: '.$requestId);
        self::respond($error, $requestId);
    }
}
