<?php
$email = (string) $config['support_email'];
$safe = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
?>
<footer class="support-footer">
  <div class="container support-inner">
    <div class="support-main">
      <div class="support-intro">
        <h2>Área de TI</h2>
        <address class="support-contact">
          <span>Comunícate al correo</span>
          <a class="support-email" href="mailto:<?= $safe($email) ?>"><?= $safe($email) ?></a>
        </address>
      </div>
      <nav class="support-social" aria-label="Redes sociales de ACEAPERU">
        <a href="https://web.facebook.com/aceaperu?locale=es_LA" target="_blank" rel="noopener noreferrer" aria-label="Facebook de ACEAPERU (abre en otra pestaña)" title="Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.021 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.931-1.956 1.887v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/acea-peru/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de ACEAPERU (abre en otra pestaña)" title="LinkedIn">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.477-.91 1.637-1.872 3.37-1.872 3.601 0 4.267 2.37 4.267 5.455v6.308zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.222 24 24 23.227 24 22.271V1.729C24 .774 23.222 0 22.225 0z"/></svg>
        </a>
      </nav>
    </div>
    <div class="support-bottom">
      <small>© <?= date('Y') ?> ACEAPERU. Todos los derechos reservados.</small>
    </div>
  </div>
</footer>
