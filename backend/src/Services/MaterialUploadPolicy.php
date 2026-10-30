<?php
declare(strict_types=1);
namespace Academia\Services;

final class MaterialUploadPolicy {
    public function __construct(private array $config) {}
    public static function bytes(string $value): int {
        if(!preg_match('/^\s*(\d+)\s*([KMG]?)\s*$/i',$value,$m))return 0;
        return (int)$m[1]*([''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824][strtoupper($m[2])]);
    }
    public function options(): array {
        $upload=self::bytes(ini_get('upload_max_filesize'))?:PHP_INT_MAX;
        $post=self::bytes(ini_get('post_max_size'));
        $server=min($upload,$post?max(0,$post-1024*1024):PHP_INT_MAX);
        return ['document_max_bytes'=>min((int)$this->config['max_file_size'],$server),'video_max_bytes'=>min((int)($this->config['max_video_size']??500*1024*1024),$server),'video_enabled'=>(new VideoInspector($this->config))->available(),'document_extensions'=>['pdf','ppt','pptx'],'video_extensions'=>['mp4','webm']];
    }
}
