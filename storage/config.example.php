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
    // Configure paths to LibreOffice/Poppler on your server when using previews.
    // 'soffice' => '/usr/bin/libreoffice',
    // 'pdftoppm' => '/usr/bin/pdftoppm',
];
