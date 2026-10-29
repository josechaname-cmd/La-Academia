"""Local HTTP contract checks. Optional --login-stdin reads email/password JSON from stdin."""
import http.cookiejar
from pathlib import Path
import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost/la-academia/"
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
checks = 0
csrf = ""


def request(path, expected=200, method="GET", data=None, raw=None, content_type=None, token=True, binary=False):
    global checks
    headers = {"Accept": "application/json"}
    if data is not None:
        raw = json.dumps(data).encode()
        content_type = "application/json"
    if content_type:
        headers["Content-Type"] = content_type
    if token and csrf:
        headers["X-CSRF-Token"] = csrf
    req = urllib.request.Request(BASE + path, data=raw, headers=headers, method=method)
    try:
        response = client.open(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read()
        assert response.status == expected, (path, expected, response.status, body[:400])
        checks += 1
        if path.startswith("api/v1/") and not binary:
            payload = json.loads(body)
            assert payload["meta"]["api_version"] == "v1"
            assert payload["meta"]["request_id"] == response.headers["X-Request-Id"]
            if expected >= 400:
                assert isinstance(payload["error"]["fields"], dict)
            return payload, response.headers
        return body, response.headers


html, _ = request("")
assert "La Academia" in html.decode()
assert 'class="academy-ui"' in html.decode()
assert 'class="support-email" href="mailto:' in html.decode() and 'tel:' not in html.decode().split('<footer', 1)[1].split('</footer>', 1)[0]
assert 'ACEAPERU. Todos los derechos reservados.' in html.decode()
assert '<img' not in html.decode().split('<footer', 1)[1].split('</footer>', 1)[0]
for path in ["assets/styles.css", "assets/learning.css", "assets/design-system.css", "frontend/app.js", "frontend/api.js", "assets/image/logo/Logotipo%20la%20academia.png"]:
    _, headers = request(path)
    if path.endswith((".js", ".css")):
        assert "max-age=0" in headers["Cache-Control"]
for path in ["config.php", "bootstrap.php", "api.php", "database/schema.sql", "scripts/migrate.php", "tests/run.php", "README.md", "http/routes.php", "backend/bootstrap.php", "backend/config/application.php", "backend/src/Services/AuthTool.php", "frontend/shell.php"]:
    request(path, 403)
request("missing-file.php", 403)
for path in ["storage/config.php", "storage/", "storage/backups/", "public/index.php", "public/frontend/app.js", ".git/config", "backend/", "tools/"]:
    request(path, 403)
for path in ["%73torage/config.php", "%70ublic/index.php", "storage/backups/probe/public/index.php", "archive/probe/public/index.php"]:
    request(path, 403)
project = Path(__file__).resolve().parents[1]
for private_file in list((project / "storage/backups").rglob("index.php"))[:2]:
    request(private_file.relative_to(project).as_posix(), 403)
request("missing-resource", 404)
request("api/v1/health?route=/admin/users")  # Query parameters cannot override the URL route.
request("api/v1/health")
session, headers = request("api/v1/session")
csrf = session["data"]["csrf"]
request("api/v1/admin/home-popup",401,"POST",{"title":"Unauthorized","active":0,"link_url":"","link_label":""})
assert session["data"]["user"] is None
cookie = next(item for item in jar if item.name == "LAACADEMIA")
assert cookie.path == "/la-academia/"
assert "HttpOnly" in headers["Set-Cookie"] and "SameSite=Strict" in headers["Set-Cookie"]
assert len(csrf) == 64 and "no-store" in headers["Cache-Control"]
assert headers["X-App-Cache"] == "BYPASS"
with urllib.request.urlopen(BASE + "api/v1/session", timeout=20) as independent:
    assert json.load(independent)["data"]["csrf"] != csrf
    checks += 1
request("api/v1/home-popup")
request("api/v1/admin/home-popup",401)
for path, method in [("admin/slider", "GET"), ("admin/slider/1", "GET"), ("admin/slider", "POST"), ("admin/slider/1/status", "POST"), ("admin/slider/1", "DELETE"), ("admin/home-popup/1", "DELETE")]:
    request("api/v1/"+path,401,method)
resources = {}
for path in ["courses", "categories", "events", "announcements"]:
    resources[path], _ = request("api/v1/" + path)
    _, headers = request("api/v1/" + path)
    assert headers["X-App-Cache"] == "HIT"
    assert "no-store" in headers["Cache-Control"]
slider, _ = request("api/v1/slider")
for slide in slider["data"]:
    body, headers = request(slide["image"], binary=True)
    assert len(body) and headers["Content-Type"].startswith("image/")
request("api/v1/courses/1/view", 403, "POST", {}, token=False)
request("api/v1/events/1/view", 403, "POST", {}, token=False)
request("api/v1/courses/999999999/view", 404, "POST", {})
request("api/v1/events/999999999/view", 404, "POST", {})
assert all("view_count" in row and int(row["view_count"]) >= 0 for row in resources["courses"]["data"])
assert all("view_count" not in row for row in resources["events"]["data"])
request("api/v1/notifications", 401)
request("api/v1/admin/courses/1/exam/status", 401, "POST", {"enabled": 0})
request("api/v1/admin/reports/exams", 401)
request("api/v1/admin/reports/exams/1/export", 401)
for course in resources["courses"]["data"]:
    detail, _ = request(f'api/v1/courses/{course["id"]}')
    assert "view_count" in detail["data"] and int(detail["data"]["view_count"]) >= 0
    for material in detail["data"]["materials"]:
        body, headers = request(f'api/v1/files/{material["id"]}', binary=True)
        assert len(body) == int(material["size"])
        assert "filename" in headers["Content-Disposition"]
        if material["extension"] == "pdf":
            assert body.startswith(b'%PDF-')
for event in resources["events"]["data"]:
    for photo in event["images"]:
        body, headers = request(f'api/v1/files/{photo["id"]}', binary=True)
        assert headers["Content-Type"].startswith("image/") and len(body)
for path in ["courses", "users", "sites", "personnel", "reports/results"]:
    request("api/v1/admin/" + path, 401)
request("api/v1/admin/personnel/import", 401, "POST", raw=b"", content_type="multipart/form-data; boundary=none")
request("api/v1/missing", 404)
request("api/v1/courses/0", 404)
_, headers = request("api/v1/courses", 405, "PATCH", {})
assert headers["Allow"] == "GET"
request("api/v1/session", 403, "POST", {}, token=False)
request("api/v1/session", 400, "POST", raw=b'{', content_type="application/json")
request("api/v1/session", 400, "POST", raw=b'[]', content_type="application/json")
request("api/v1/session", 415, "POST", raw=b'hello', content_type="text/plain")
request("api/v1/session", 413, "POST", raw=b' ' * (1024 * 1024 + 1), content_type="application/json")
payload, _ = request("api/v1/session", 422, "POST", {"email": ""})
assert "password" in payload["error"]["fields"]
if "--login-stdin" in sys.argv:
    credentials = json.load(sys.stdin)
    session, _ = request("api/v1/session", 200, "POST", credentials)
    csrf = session["data"]["csrf"]
    request("api/v1/admin/home-popup",403,"POST",{"title":"Unauthorized","active":0,"link_url":"","link_label":""})
    assert session["data"]["user"]["role"] == "capacitador"
    before, _ = request("api/v1/admin/courses")
    for path in ["events", "reports/summary", "reports/results", "reports/exams"]:
        request("api/v1/admin/" + path)
    request("api/v1/admin/announcements", 410)
    feed, _ = request("api/v1/notifications")
    assert isinstance(feed["data"]["items"], list) and "revision" in feed["data"]
    request("api/v1/admin/users", 403)
    request("api/v1/admin/sites", 403)
    request("api/v1/admin/personnel", 403)
    request("api/v1/admin/categories", 422, "POST", {"id": 1, "scope": "course", "name": "No crear"})
    categories, _ = request("api/v1/categories")
    boundary = "AcademiaInvalidFileBoundary"
    fields = {"title": "Prueba HTTP sin material válido", "category": categories["data"][0], "description": "Esta prueba debe revertirse sin dejar un curso."}
    body = ""
    for key, value in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="invalid.pdf"\r\nContent-Type: application/pdf\r\n\r\nThis is not a PDF\r\n--{boundary}--\r\n'
    request("api/v1/admin/courses", 422, "POST", raw=body.encode(), content_type="multipart/form-data; boundary=" + boundary)
    after, _ = request("api/v1/admin/courses")
    assert len(before["data"]) == len(after["data"])
    request("api/v1/session", 200, "DELETE", {})
    request("api/v1/admin/courses", 401)
print(f"OK {checks} verificaciones HTTP. Sin contenido de prueba persistente.")
