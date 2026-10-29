<?php
$assetVersion = static function (string $relativePath): string {
    $absolutePath = __DIR__ . '/../../public/' . ltrim($relativePath, '/');
    $modifiedAt = is_file($absolutePath) ? filemtime($absolutePath) : false;

    return $modifiedAt === false ? '0' : (string) $modifiedAt;
};
?>
<!doctype html>
<html lang="es-PE" class="academy-ui">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#005f91"><title>La Academia · Capacitación interna</title>
  <link rel="icon" type="image/png" href="assets/image/favicon/favicon.png?v=<?= $assetVersion('assets/image/favicon/favicon.png') ?>">
  <link rel="stylesheet" href="assets/styles.css?v=<?= $assetVersion('assets/styles.css') ?>"><link rel="stylesheet" href="assets/learning.css?v=<?= $assetVersion('assets/learning.css') ?>"><link rel="stylesheet" href="assets/design-system.css?v=<?= $assetVersion('assets/design-system.css') ?>"><script type="module" src="frontend/app.js?v=<?= $assetVersion('frontend/app.js') ?>"></script>
</head>
<body>
  <a class="skip" href="#app">Saltar al contenido</a>
  <header class="header"><a class="brand" href="#inicio" aria-label="La Academia, inicio"><span class="brand-logo"><img src="assets/image/logo/Logotipo%20la%20academia.png" alt="La Academia" width="1448" height="1086"></span></a><div id="public-search" class="public-search"></div><button id="admin-menu-toggle" class="button white admin-menu-toggle" type="button" hidden aria-expanded="false" aria-controls="admin-sidebar"><span aria-hidden="true">☰</span> Menú</button><nav id="navigation" aria-label="Principal"></nav></header>
  <main id="app" tabindex="-1"><div class="loading" role="status">Cargando plataforma…</div></main>
  <?php require __DIR__.'/footer.php'; ?>
  <div id="toast" role="status" aria-live="polite" hidden></div>
  <dialog id="dialog"><button type="button" class="close" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div id="dialog-body"></div></dialog>
  <noscript>Activa JavaScript para utilizar la plataforma.</noscript>
</body></html>
