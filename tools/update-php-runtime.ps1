$ErrorActionPreference = 'Stop'
# Reviewed local patch update. The official archive/hash is in the private code backup.
$active = [IO.Path]::GetFullPath('C:\xampp\php')
$candidate = [IO.Path]::GetFullPath('C:\xampp\php-8.2.35-1')
$backup = [IO.Path]::GetFullPath('C:\xampp\php-backup-20261028-8.2.12')
$httpd = 'C:\xampp\apache\bin\httpd.exe'
foreach ($target in @($active, $candidate, $backup)) {
    if ([IO.Path]::GetDirectoryName($target) -ne 'C:\xampp') { throw 'Ruta fuera del directorio autorizado.' }
}
if (!(Test-Path -LiteralPath "$candidate\php8apache2_4.dll") -or (Test-Path -LiteralPath $backup)) { throw 'Precondiciones de actualización incumplidas.' }
function Wait-ApacheStopped {
    for ($attempt = 0; $attempt -lt 100; $attempt++) {
        if (!(Get-Process httpd -ErrorAction SilentlyContinue)) { return }
        Start-Sleep -Milliseconds 100
    }
    throw 'Apache sigue activo; no se moverán archivos cargados.'
}
function Stop-Apache {
    # XAMPP starts Apache as a console process here, not as a Windows service.
    $processes = @(Get-Process httpd -ErrorAction SilentlyContinue)
    foreach ($process in $processes) {
        if (!$process.Path -or ![string]::Equals($process.Path, $httpd, [StringComparison]::OrdinalIgnoreCase)) { throw 'Proceso Apache ajeno; detención rechazada.' }
    }
    if ($processes.Count) { Stop-Process -Id $processes.Id -ErrorAction SilentlyContinue }
    Wait-ApacheStopped
}
function Start-Apache {
    & $httpd -t
    if ($LASTEXITCODE -ne 0) { throw 'Configuración Apache no válida.' }
    Start-Process -FilePath $httpd -WorkingDirectory 'C:\xampp\apache\bin' -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 100; $attempt++) {
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1/la-academia/api/v1/health' -TimeoutSec 2
            if ($health.data.status -eq 'ok') { return }
        } catch { }
        Start-Sleep -Milliseconds 100
    }
    throw 'Health no responde después del inicio.'
}
$oldMoved = $false
$newMoved = $false
try {
    Stop-Apache
    $candidateIni = Join-Path $candidate 'php.ini'
    $ini = [IO.File]::ReadAllText($candidateIni).Replace($candidate, $active).Replace($candidate.Replace('\','/'), $active.Replace('\','/'))
    [IO.File]::WriteAllText($candidateIni, $ini, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $active -Destination $backup
    $oldMoved = $true
    Move-Item -LiteralPath $candidate -Destination $active
    $newMoved = $true
    Start-Apache
    & "$active\php.exe" -v
    Write-Output "OK Apache y PHP actualizados; versión anterior conservada en $backup."
} catch {
    $updateError = $_
    if ($oldMoved) {
        if (Get-Process httpd -ErrorAction SilentlyContinue) { Stop-Apache }
        if ($newMoved) { Move-Item -LiteralPath $active -Destination $candidate }
        Move-Item -LiteralPath $backup -Destination $active
        Start-Apache
    }
    throw $updateError
}
