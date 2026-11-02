<?php
declare(strict_types=1);
// Copy to storage/config.php, which is ignored by Git. Never commit real values.
return [
    'environment' => 'production',
    'support_email' => 'soporte@example.com', // Replace with the authorized support contact.
    'db_host' => '127.0.0.1',
    'db_name' => 'la_academia',
    'db_user' => 'REEMPLAZAR_USUARIO',
    'db_password' => 'REEMPLAZAR_EN_SERVIDOR',
    'local_unlimited_login' => false,
    'session_idle_seconds' => 3600,
    'session_absolute_seconds' => 43200,
    // Production always uses Secure cookies and disables web setup, even on loopback.
    // Initialize the first account on a private local instance before enabling production.
    'max_video_size' => 500 * 1024 * 1024,
    // Required for videos; use an absolute path to the FFprobe executable.
    // 'ffprobe' => '/usr/bin/ffprobe',
    // Configure paths to LibreOffice/Poppler on your server when using previews.
    // 'soffice' => '/usr/bin/libreoffice',
    // 'pdftoppm' => '/usr/bin/pdftoppm',
];
