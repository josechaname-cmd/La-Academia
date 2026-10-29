$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$php = Join-Path (Split-Path -Parent (Split-Path -Parent $project)) 'php/php.exe'
$worker = Join-Path $project 'backend/scripts/preview-worker.php'
Start-Process -FilePath $php -ArgumentList ('"' + $worker + '"') -WindowStyle Hidden
