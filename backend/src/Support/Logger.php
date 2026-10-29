<?php
declare(strict_types=1);
namespace Academia\Support;

/** Structured technical records. Never accepts request bodies, SQL or error messages. */
final class Logger
{
    public static function write(string $level, string $module, string $event, ?string $requestId = null, array $context = []): void
    {
        $record = ['time'=>date(DATE_ATOM), 'level'=>$level, 'module'=>$module, 'event'=>$event];
        if ($requestId !== null && preg_match('/^[a-f0-9]{16}$/D', $requestId)) $record['request_id'] = $requestId;
        foreach (['status','actor_id','line','driver_code'] as $key) {
            if (isset($context[$key]) && is_int($context[$key])) $record[$key] = $context[$key];
        }
        // These values are supplied by code/route definitions, never by a request URL.
        foreach (['route','method','exception','source','code'] as $key) {
            if (isset($context[$key]) && is_string($context[$key])) $record[$key] = substr($context[$key], 0, 200);
        }
        @error_log(json_encode($record, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE));
    }

    public static function failure(\Throwable $error, string $module, ?string $requestId = null, array $context = []): void
    {
        $status = $context['status'] ?? 500;
        self::write($status >= 500 ? 'error' : 'warning', $module, 'operation.failed', $requestId, $context + [
            'exception'=>get_class($error), 'code'=>(string)$error->getCode(),
            'source'=>basename($error->getFile()), 'line'=>$error->getLine(),
            'driver_code'=>$error instanceof \PDOException ? (int)($error->errorInfo[1] ?? 0) : 0,
        ]);
    }
}
