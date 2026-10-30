<?php
declare(strict_types=1);
$project=dirname(__DIR__,2);
$private=getenv('ACADEMIA_CONFIG')?:$project.'/storage/config.php';
$local=is_file($private)?require $private:[];
return array_replace([
    'app_name'=>'La Academia',
    'environment'=>'local',
    'support_email'=>getenv('ACADEMIA_SUPPORT_EMAIL')?:'soporte@example.com',
    'db_host'=>getenv('ACADEMIA_DB_HOST')?:'127.0.0.1',
    'db_name'=>getenv('ACADEMIA_DB_NAME')?:'la_academia',
    'db_user'=>getenv('ACADEMIA_DB_USER')?:'la_academia_app',
    'db_password'=>getenv('ACADEMIA_DB_PASSWORD')?:'',
    'storage'=>getenv('ACADEMIA_STORAGE')?:$project.'/storage/files',
    'preview_directory'=>$project.'/storage/previews',
    'pdftoppm'=>$project.'/tools/runtime/poppler/bin/pdftoppm.exe',
    'soffice'=>$project.'/tools/runtime/libreoffice/program/soffice.com',
    'max_file_size'=>50*1024*1024,
    'max_video_size'=>500*1024*1024,
    'ffprobe'=>getenv('ACADEMIA_FFPROBE')?:$project.'/tools/runtime/ffmpeg/bin/ffprobe.exe',
    'max_attempts'=>2, // Compatibility fallback; each exam version stores its own limit.
    'local_unlimited_login'=>true,
    'cache_directory'=>getenv('ACADEMIA_CACHE')?:$project.'/storage/cache',
    'cache_ttl'=>60,
    'session_idle_seconds'=>3600,
],$local);
