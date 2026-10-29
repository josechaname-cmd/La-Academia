<?php
declare(strict_types=1);
namespace Academia\Http;

final class WebKernel {
    public static function entryScript(string $script): string {
        return \Academia\Support\Http::entryScript($script);
    }
    public static function apiPath(string $uri, string $script): ?string {
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path)) return null;
        $base = rtrim(str_replace('\\', '/', dirname(self::entryScript($script))), '/.');
        $prefix = $base.'/api/v1';
        if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
            return substr($path, strlen($prefix)) ?: '/';
        }
        return null;
    }

    public static function handle(array $config): never {
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        header('Referrer-Policy: same-origin');
        header('X-Frame-Options: SAMEORIGIN');
        header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self'; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
        $api = self::apiPath($_SERVER['REQUEST_URI'] ?? '/', $_SERVER['SCRIPT_NAME'] ?? '/index.php');
        if ($api !== null) ApiKernel::handle($api, $config);
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
            http_response_code(405);
            header('Allow: GET, HEAD');
            exit;
        }
        require dirname(__DIR__, 2).'/views/shell.php';
        exit;
    }
}
