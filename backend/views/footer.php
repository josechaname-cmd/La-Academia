<?php
$email = (string) $config['support_email'];
$safe = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
?>
<footer class="support-footer">
  <div class="container support-inner">
    <div class="support-main">
      <div class="support-intro">
        <span class="support-kicker">SOPORTE DE LA PLATAFORMA</span>
        <h2>Área de TI</h2>
      </div>
      <address class="support-contact">
        <span>Consultas e incidencias de La Academia</span>
        <a class="support-email" href="mailto:<?= $safe($email) ?>"><?= $safe($email) ?></a>
      </address>
    </div>
    <div class="support-bottom"><small>© <?= date('Y') ?> ACEAPERU. Todos los derechos reservados.</small><span>La Academia</span></div>
  </div>
</footer>
