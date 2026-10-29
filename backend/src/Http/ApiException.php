<?php
declare(strict_types=1);
namespace Academia\Http;
final class ApiException extends \RuntimeException {
    public function __construct(int $status,string $message,public readonly array $fields=[],public readonly string $errorCode='request_error') { parent::__construct($message,$status); }
}
