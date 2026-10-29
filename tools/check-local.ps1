$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Push-Location -LiteralPath $project
try {
    node tools/build-design.mjs --check
    if ($LASTEXITCODE -ne 0) { throw 'Design build is out of date.' }
    node tests/frontend-ux.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron formularios, acceso y visor.' }
    node tests/list-controls.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron los listados paginados.' }
    node tests/design-system.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Design system checks failed.' }
    python tests/check_source.py
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación de fuentes.' }
    node tests/architecture.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación arquitectónica.' }
    node tests/public-header.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Public header checks failed.' }
    node tests/home-popup.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Home popup checks failed.' }
    node tests/admin-slider.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Slider admin checks failed.' }
    node tests/slider.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación del slider.' }
    & 'C:\xampp\php\php.exe' tests/slider-files.php
    if ($LASTEXITCODE -ne 0) { throw 'Falló la lectura de imágenes del slider.' }
    node tests/evaluation-state.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló el estado del examen.' }
    node tests/evaluation-dialog.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló el flujo del examen.' }
    node tests/content-views.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló el registro de visitas.' }
    node tests/dashboard.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló el resumen del panel.' }
    node tests/session-routing.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la navegación al cambiar de sesión.' }
    node tests/training-enhancements.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Training enhancements failed.' }
    node tests/personnel.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la gestión individual y carga de colaboradores.' }
    node tests/course-editor.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló el flujo de capacitación.' }
    node tests/report-navigation.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la transición de resultados.' }
    node tests/admin-exam.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la configuración del examen.' }
    node tests/catalog.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación del catálogo.' }
    node tests/navigation-cache.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación de navegación.' }
    node tests/activity-ui.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación de actividad.' }
    & 'C:\xampp\php\php.exe' tests/cache.php
    if ($LASTEXITCODE -ne 0) { throw 'Falló la validación de caché.' }
    & 'C:\xampp\php\php.exe' tests/isolated.php run.php backend-regression.php personnel-import.php concurrency.php http-isolated.php exam-policy.php
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas aisladas del backend.' }
    python tests/report_xlsx.py
    if ($LASTEXITCODE -ne 0) { throw 'Falló la exportación XLSX sintética.' }
    python tests/apache-access.py
    if ($LASTEXITCODE -ne 0) { throw 'Falló la protección HTTP de Apache.' }
} finally { Pop-Location }
