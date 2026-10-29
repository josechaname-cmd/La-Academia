"""Read-only checks of the actual Apache boundary; no login or application writes."""
import urllib.request
import urllib.error

base = 'http://localhost/la-academia/'
paths = ['backend/bootstrap.php', 'storage/config.php', 'storage/backups/', 'public/index.php', 'public/frontend/app.js', 'tests/run.php', 'docs/API.md', 'tools/', 'archive/', '.git/config', '%73torage/config.php', '%70ublic/index.php', 'storage/backups/probe/public/index.php', 'archive/probe/public/index.php']
for path in paths:
    try:
        response = urllib.request.urlopen(base + path, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        assert response.status == 403, (path, response.status)
for path in ['', 'api/v1/health']:
    with urllib.request.urlopen(base + path, timeout=10) as response:
        assert response.status == 200
        assert response.headers['X-Content-Type-Options'] == 'nosniff'
print(f'OK Apache: {len(paths)} rutas privadas bloqueadas y 2 entradas públicas operativas; solo lectura.')
