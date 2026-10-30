"""Check both Apache entry layouts on loopback, without MySQL or live server changes."""
import argparse
import json
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

project = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--xampp', type=Path, default=Path('C:/xampp'))
args = parser.parse_args()
apache = args.xampp.resolve() / 'apache'
php = args.xampp.resolve() / 'php'
httpd = apache / 'bin/httpd.exe'
flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def request(url, method='GET'):
    try:
        response = opener.open(urllib.request.Request(url, method=method), timeout=3)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


with tempfile.TemporaryDirectory(prefix='academia-entrypoint-') as temporary:
    scratch = Path(temporary).resolve()
    # Verify the only recursive cleanup target before TemporaryDirectory removes it.
    assert scratch.parent == Path(tempfile.gettempdir()).resolve()
    assert scratch.name.startswith('academia-entrypoint-')
    config_override = scratch / 'application.php'
    limits_report=scratch/'limits.json'
    config_override.write_text("<?php file_put_contents("+repr(limits_report.as_posix())+",json_encode([ini_get('upload_max_filesize'),ini_get('post_max_size'),ini_get('max_input_time')])); return ['environment'=>'test','db_name'=>'academia_entrypoint_unused','db_user'=>'unused','db_password'=>'unused'];", encoding='utf-8')
    modules = ['authz_core', 'authz_host', 'dir', 'mime', 'rewrite', 'headers', 'env']
    for profile in ['local-root', 'public-root']:
        port = free_port()
        config = scratch / (profile + '.conf')
        module_lines = '\n'.join(f'LoadModule {name}_module modules/mod_{name}.so' for name in modules)
        if profile == 'local-root':
            boundary = f'''
DocumentRoot "{project.parent.as_posix()}"
<Directory "{project.parent.as_posix()}">
    AllowOverride All
    Options +FollowSymLinks -Indexes
    Require local
</Directory>
'''
            prefix = '/' + project.name + '/'
        else:
            boundary = f'''
Define ACADEMIA_PROJECT "{project.as_posix()}"
Include "{(project / 'tools/apache/public-directory.conf.example').as_posix()}"
'''
            prefix = '/'
        config.write_text(f'''
ServerRoot "{apache.as_posix()}"
Listen 127.0.0.1:{port}
ServerName 127.0.0.1
PidFile "{(scratch / (profile + '.pid')).as_posix()}"
ErrorLog "{(scratch / (profile + '.error.log')).as_posix()}"
{module_lines}
LoadFile "{(php / 'php8ts.dll').as_posix()}"
LoadFile "{(php / 'libpq.dll').as_posix()}"
LoadFile "{(php / 'libsqlite3.dll').as_posix()}"
LoadModule php_module "{(php / 'php8apache2_4.dll').as_posix()}"
PHPINIDir "{php.as_posix()}"
SetEnv ACADEMIA_CONFIG "{config_override.as_posix()}"
<FilesMatch "\\.php$">
    SetHandler application/x-httpd-php
</FilesMatch>
php_admin_value error_log "{(scratch / (profile + '.php.log')).as_posix()}"
<Directory />
    AllowOverride None
    Require all denied
</Directory>
{boundary}
''', encoding='utf-8')
        syntax = subprocess.run([str(httpd), '-t', '-f', str(config)], capture_output=True, text=True, creationflags=flags)
        assert syntax.returncode == 0, syntax.stderr
        with (scratch / (profile + '.process.log')).open('wb') as log:
            process = subprocess.Popen([str(httpd), '-X', '-f', str(config)], stdout=log, stderr=log, creationflags=flags)
            base = f'http://127.0.0.1:{port}' + prefix
            try:
                for attempt in range(60):
                    if process.poll() is not None:
                        raise RuntimeError((scratch / (profile + '.process.log')).read_text(errors='replace'))
                    try:
                        status, headers, body = request(base)
                        break
                    except (urllib.error.URLError, TimeoutError):
                        time.sleep(.1)
                else:
                    raise RuntimeError('Apache temporal no inició.')
                assert status == 200 and b'frontend/app.js' in body and b'<?php' not in body, (profile, 'portal', status)
                assert headers['X-Content-Type-Options'] == 'nosniff'
                assert "media-src 'self' blob:" in headers['Content-Security-Policy']
                assert json.loads(limits_report.read_text())==['500M','512M','900'],profile
                assert request(base + 'index.php')[0] == 200
                assert request(base, 'HEAD')[0] == 200
                assert request(base, 'POST')[0] == 405
                for asset in ['frontend/app.js', 'assets/styles.css', 'assets/image/logo/Logotipo%20la%20academia.png']:
                    assert request(base + asset)[0] == 200, (profile, asset)
                status, headers, body = request(base + 'api/v1/entrypoint-nonexistent?route=/health')
                assert status == 404 and 'application/json' in headers['Content-Type'], (profile, status)
                assert 'error' in json.loads(body)
                for path in ['backend/bootstrap.php', 'storage/config.php', 'storage/backups/', 'public/index.php', 'tests/run.php', 'docs/API.md', 'tools/', 'archive/', '.git/config', '%73torage/config.php', '%70ublic/index.php', 'storage/backups/probe/public/index.php', 'archive/probe/public/index.php', 'assets/test.php']:
                    assert request(base + path)[0] == 403, (profile, path)
                for path in ['not-a-route', 'assets/not-a-file.css', 'api/v10/health']:
                    assert request(base + path)[0] == 404, (profile, path)
                print(f'OK {profile}: PHP, límites 500M/512M, medios CSP, portal, API y rutas privadas; sin MySQL.', flush=True)
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
print('OK: ambos servidores temporales cerrados; configuración activa intacta.')
