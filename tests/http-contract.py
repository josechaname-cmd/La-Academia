"""HTTP contracts against the temporary PHP server and synthetic MySQL schema only."""
import http.cookiejar
import json
import os
import re
import sys
import urllib.error
import urllib.request

base = os.environ['ACADEMIA_TEST_BASE']
assert re.fullmatch(r'http://127\.0\.0\.1:\d+/la-academia/', base)
fixture = json.load(sys.stdin)
checks = 0

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.http = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = ''

    def call(self, path, method='GET', data=None, expected=200, token=True, raw=None, content=None):
        global checks
        headers = {'Accept': 'application/json'}
        if token and self.csrf:
            headers['X-CSRF-Token'] = self.csrf
        if data is not None:
            raw = json.dumps(data).encode()
            content = 'application/json'
        if content:
            headers['Content-Type'] = content
        request = urllib.request.Request(base + 'api/v1/' + path, data=raw, method=method, headers=headers)
        try:
            response = self.http.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = json.load(response)
            assert response.status == expected, (path, expected, response.status)
            assert body['meta']['api_version'] == 'v1'
            assert body['meta']['request_id'] == response.headers['X-Request-Id']
            assert 'no-store' in response.headers['Cache-Control']
            if expected >= 400:
                assert isinstance(body['error']['fields'], dict)
                assert 'SQLSTATE' not in json.dumps(body)
            checks += 1
            return body.get('data'), response.headers

    def login(self, index):
        state, _ = self.call('session')
        self.csrf = state['csrf']
        before = next(iter(self.jar)).value
        state, headers = self.call('session', 'POST', {'email': f'http{index}@example.invalid', 'password': fixture['password']})
        assert state['csrf'] != self.csrf and next(iter(self.jar)).value != before
        assert 'HttpOnly' in headers['Set-Cookie'] and 'SameSite=Strict' in headers['Set-Cookie']
        self.csrf = state['csrf']

guest = Client()
state, _ = guest.call('session')
guest.csrf = state['csrf']
for method, template, agent, action, access, status in fixture['routes']:
    if access != 'public':
        path = re.sub(r'\{[a-z_]+\}', '1', template).lstrip('/')
        guest.call(path, method, {} if method != 'GET' else None, 401)

a, b = Client(), Client()
a.login(0)
b.login(1)
for method, template, agent, action, access, status in fixture['routes']:
    if access == 'superadmin':
        path = re.sub(r'\{[a-z_]+\}', '1', template).lstrip('/')
        a.call(path, method, {} if method != 'GET' else None, 403)

own, foreign = fixture['courses']
foreign_file = fixture['files'][1]
foreign_exam = fixture['exams'][1]
for path, method in [(f'admin/courses/{foreign}', 'GET'), (f'admin/courses/{foreign}', 'PATCH'), (f'admin/courses/{foreign}/publish', 'POST'), (f'admin/courses/{foreign}', 'DELETE'), (f'admin/courses/{foreign}/exam', 'PUT'), (f'admin/courses/{foreign}/exam/status', 'POST'), (f'admin/files/{foreign_file}', 'DELETE'), (f'admin/reports/exams/{foreign_exam}/export', 'GET'), (f'files/{foreign_file}/preview-status', 'GET')]:
    a.call(path, method, {} if method != 'GET' else None, 403)
for client, expected in [(a, own), (b, foreign), (a, own)]:
    feed, _ = client.call('notifications')
    assert {int(row['course_id']) for row in feed['items']} == {expected}
    rows, _ = client.call('admin/courses')
    assert {int(row['id']) for row in rows} == ({expected, fixture['identification_course']} if client is a else {expected})
a.call(f'admin/courses/{own}', 'PATCH', {'id': foreign, 'title': 'Título sintético editado', 'category': 'Pruebas', 'description': 'Descripción editada de prueba', 'exam_required': 0})
unchanged, _ = b.call(f'admin/courses/{foreign}')
assert unchanged['title'] == 'Curso HTTP sintético'
a.call(f'admin/courses/{own}/publish', 'POST', {})
detail, _ = guest.call(f'courses/{own}')
assert detail['exam'] is None and int(detail['view_count']) == 0
guest.call('courses')
before_views, cached = guest.call('courses')
assert cached['X-App-Cache'] == 'HIT'
guest.call(f'courses/{own}/view', 'POST', {}, 403, token=False)
first, _ = guest.call(f'courses/{own}/view', 'POST', {})
after_views, refreshed = guest.call('courses')
assert refreshed['X-App-Cache'] == 'MISS'
assert int(next(row for row in after_views if int(row['id']) == own)['view_count']) == 1
second, _ = guest.call(f'courses/{own}/view', 'POST', {})
assert first['recorded'] and not second['recorded'] and first['view_count'] == second['view_count'] == 1
_, cached_again = guest.call('courses')
assert cached_again['X-App-Cache'] == 'HIT', 'Duplicate views retain the valid cache'
admin_view, _ = a.call(f'courses/{own}/view', 'POST', {})
assert not admin_view['recorded'] and admin_view['view_count'] == 1
current_detail, _ = guest.call(f'courses/{own}')
assert int(current_detail['view_count']) == 1
identified_course = fixture['identification_course']
learner = {'course_id': identified_course, 'dni': '74560001'}
guest.call('attempts', 'POST', learner, 403)
guest.call('attempts/participant', 'POST', {**learner, 'dni': '74569999'}, 404)
guest.call('attempts/participant', 'POST', {**learner, 'dni': '74560004'}, 404)
for dni in ['74560002', '74560003']:
    guest.call('attempts/participant', 'POST', {**learner, 'dni': dni}, 403)
person, _ = guest.call('attempts/participant', 'POST', learner)
assert person['name'] == 'Participante de prueba' and 'questions' not in person
guest.call('attempts', 'POST', {**learner, 'dni': '74560002'}, 403)
b.call('attempts', 'POST', learner, 403)
attempt, _ = guest.call('attempts', 'POST', learner, 201)
assert attempt['questions'] and all('correct' not in question for question in attempt['questions'])
result, _ = guest.call('attempts/submit', 'POST', {'token': attempt['token'], 'answers': [0]})
assert result['score'] == 20
assert result['passed'] and result['passing_score'] == 14 and result['remaining'] == 0 and not result['retry_allowed']
guest.call('attempts', 'POST', learner, 409)
identified, _ = guest.call('attempts/participant', 'POST', learner)
assert identified['exam_policy']['retry_block_reason'] == 'target_reached'
# Trainer writes are checked by the real API and its restricted SQL account.
policy_input = {'questions': [{'prompt': 'Pregunta de política HTTP', 'choices': ['Sí', 'No', 'Otro'], 'correct': 0}], 'opens_at': '2026-01-01T00:00', 'duration_minutes': 20, 'max_attempts': 3, 'passing_score': 15}
a.call(f'admin/courses/{own}/exam', 'PUT', {**policy_input, 'max_attempts': 0}, 422)
a.call(f'admin/courses/{own}/exam', 'PUT', {**policy_input, 'passing_score': None}, 422)
saved_exam, _ = a.call(f'admin/courses/{own}/exam', 'PUT', policy_input)
assert int(saved_exam['max_attempts']) == 3 and int(saved_exam['passing_score']) == 15
read_exam, _ = a.call(f'admin/courses/{own}/exam')
assert read_exam['id'] == saved_exam['id']

guest.call('session', 'POST', {}, 403, token=False)
guest.call('session', 'POST', expected=400, raw=b'{', content='application/json')
guest.call('session', 'POST', expected=400, raw=b'[]', content='application/json')
guest.call('session', 'POST', expected=415, raw=b'abc', content='text/plain')
guest.call('session', 'POST', expected=413, raw=b' ' * (1024 * 1024 + 1), content='application/json')
guest.call('session', 'POST', {}, 422)
guest.call('courses', 'PATCH', {}, 405)
guest.call('missing', expected=404)

# Personnel writes exercise the real router, CSRF and restricted SQL account.
superadmin = Client()
superadmin.login(2)
sites, _ = superadmin.call('admin/sites')
site_id = sites[0]['id']
worker = {'dni': '00112233', 'name': 'Alta Individual HTTP', 'job_title': 'Prueba', 'site_id': site_id, 'active': 1}
for path in ['admin/personnel', 'admin/personnel/update', 'admin/personnel/delete', 'admin/personnel/preview', 'admin/personnel/import']:
    superadmin.call(path, 'POST', worker, 403, token=False)
superadmin.call('admin/personnel', 'POST', worker, 201)
superadmin.call('admin/personnel', 'POST', worker, 409)
superadmin.call('admin/users', 'POST', {**worker, 'email': 'http3@example.invalid', 'password': fixture['password'], 'role': 'capacitador'}, 201)
linked = Client()
linked.login(3)
workers, _ = superadmin.call('admin/personnel')
original = next(person for person in workers if person['dni'] == worker['dni'])
new_site_id = next(site['id'] for site in sites if site['id'] != site_id)
superadmin.call('admin/personnel/update', 'POST', {**original, 'name': 'Cambio Individual HTTP', 'site_id': new_site_id})
linked.call('admin/courses', expected=401)
linked.login(3)
linked_state, _ = linked.call('session')
assert linked_state['user']['name'] == 'Cambio Individual HTTP' and int(linked_state['user']['site_id']) == int(new_site_id)
superadmin.call('admin/personnel/delete', 'POST', original, 409)
workers, _ = superadmin.call('admin/personnel')
edited = next(person for person in workers if person['dni'] == worker['dni'])
superadmin.call('admin/personnel/delete', 'POST', {'dni': edited['dni'], 'revision': edited['revision']})
linked.call('admin/courses', expected=401)
workers, _ = superadmin.call('admin/personnel')
inactive = next(person for person in workers if person['dni'] == worker['dni'])
assert int(inactive['active']) == 0
superadmin.call('admin/personnel/update', 'POST', {**inactive, 'active': 1})
users, _ = superadmin.call('admin/users')
assert int(next(user for user in users if user['dni'] == worker['dni'])['active']) == 0

def personnel_upload(path, csv, preview_token=None, expected=200):
    boundary = 'AcademiaPersonnelSyntheticBoundary'
    fields = {'site_id': str(site_id)}
    if preview_token is not None:
        fields['preview_token'] = preview_token
    parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n' for key, value in fields.items()]
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="personal.csv"\r\nContent-Type: text/csv\r\n\r\n{csv}\r\n--{boundary}--\r\n')
    return superadmin.call(path, 'POST', expected=expected, raw=''.join(parts).encode(), content=f'multipart/form-data; boundary={boundary}')[0]

csv = 'DNI,NOMBRE COMPLETO,CARGO\n00112234,Alta Masiva HTTP,Prueba\n'
preview = personnel_upload('admin/personnel/preview', csv)
workers, _ = superadmin.call('admin/personnel')
assert not any(person['dni'] == '00112234' for person in workers)
personnel_upload('admin/personnel/import', csv, expected=422)
personnel_upload('admin/personnel/import', csv.replace('Alta Masiva', 'Archivo Cambiado'), preview['preview_token'], expected=409)
saved = personnel_upload('admin/personnel/import', csv, preview['preview_token'])
assert saved['created'] == 1 and saved['defaulted'] == 1
workers, _ = superadmin.call('admin/personnel')
assert next(person for person in workers if person['dni'] == '00112233')['name'] == 'Cambio Individual HTTP'
assert int(next(person for person in workers if person['dni'] == '00112234')['site_id']) == int(site_id)

a.call('session', 'DELETE', {})
a.call('admin/courses', expected=401)
print(f'OK {checks} contratos HTTP: rutas protegidas, roles, sedes, caché, CSRF, sesiones, identidad de ruta y errores.')
