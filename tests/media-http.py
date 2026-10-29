"""Local integration: temporary superadmin and inactive media; removes all fixtures."""
import base64, http.cookiejar, json, secrets, subprocess, urllib.request, urllib.error, os, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
php=r"C:\xampp\php\php.exe"
base=os.environ["ACADEMIA_TEST_BASE"]
assert re.fullmatch(r"http://127\.0\.0\.1:\d+/la-academia/",base)
suffix=secrets.token_hex(8)
email=f"media-test-{suffix}@example.invalid"
password=secrets.token_urlsafe(32)
name=f"media-test-{suffix}.png"
checks=0

def sql_script(code,values):
    encoded=base64.b64encode(json.dumps(values).encode()).decode()
    script="<?php require 'backend/bootstrap.php'; $config=require 'backend/config/application.php'; if(!preg_match('/^academia_test_[a-f0-9]{16}$/D',$config['db_name']))throw new RuntimeException('Test database required'); $db=new Academia\\Support\\Database($config); $v=json_decode(base64_decode('"+encoded+"'),true); "+code
    return subprocess.run([php],input=script,text=True,cwd=root,capture_output=True,check=True).stdout

def client():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
admin,guest=client(),client()
csrf=""
def req(path,method="GET",data=None,raw=None,content=None,expected=200,anonymous=False,binary=False):
    global checks
    headers={"Accept":"application/json"}
    if csrf and not anonymous:headers["X-CSRF-Token"]=csrf
    if data is not None:raw=json.dumps(data).encode();content="application/json"
    if content:headers["Content-Type"]=content
    try:r=(guest if anonymous else admin).open(urllib.request.Request(base+path,data=raw,method=method,headers=headers),timeout=20)
    except urllib.error.HTTPError as e:r=e
    with r:
        body=r.read();assert r.status==expected,(path,r.status,body[:300]);checks+=1
        return body if binary else json.loads(body).get("data")

def upload(path,fields,expected):
    boundary="academy"+suffix
    png=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=")
    parts=[]
    for key,value in fields.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: image/png\r\n\r\n'.encode()+png+b"\r\n")
    parts.append(f'--{boundary}--\r\n'.encode())
    return req(path,"POST",raw=b"".join(parts),content=f"multipart/form-data; boundary={boundary}",expected=expected)

actor=None
course_id=None
try:
    actor=int(sql_script("$db->run(\"INSERT INTO admins(name,email,password_hash,role,active) VALUES(?,?,?,'superadmin',1)\",['Media integration test',$v['email'],password_hash($v['password'],PASSWORD_DEFAULT)]);echo $db->pdo->lastInsertId();",{"email":email,"password":password}))
    csrf=req("api/v1/session")["csrf"]
    csrf=req("api/v1/session","POST",{"email":email,"password":password})["csrf"]
    slide=upload("api/v1/admin/slider",{"alt":"Prueba temporal oculta","active":0,"position":9999,"fit":"cover","focal":"center"},201)
    sid=slide["id"];image=slide["image_id"]
    req(slide["image"],binary=True)
    req(slide["image"],expected=404,anonymous=True)
    edited=req(f"api/v1/admin/slider/{sid}","POST",{"alt":"Encuadre editado","active":0,"position":9998,"fit":"contain","focal":"top","title":"Título HTTP","subtitle":"Texto de apoyo","link_url":"https://example.org/aprender","font_family":"trebuchet","title_color":"#FFD43B","text_color":"#112233","title_size":48,"text_size":22,"text_align":"center"})
    assert edited["fit"]=="contain" and edited["image_id"]==image
    assert edited["title"]=="Título HTTP" and edited["link_url"]=="https://example.org/aprender"
    assert edited["font_family"]=="trebuchet" and edited["title_color"]=="#ffd43b" and int(edited["title_size"])==48 and edited["text_align"]=="center"
    assert any(row["id"]==sid for row in req("api/v1/admin/slider"))
    assert not any(row["id"]==sid for row in req("api/v1/slider",anonymous=True))
    req(f"api/v1/admin/slider/{sid}/status","POST",{"active":0})
    popup=upload("api/v1/admin/home-popup",{"title":"","active":0,"link_url":"","link_label":"","display_size":"compact","image_format":"square","image_focus":"top"},201)
    pid=popup["id"]
    assert popup["display_size"]=="compact" and popup["image_format"]=="square"
    assert any(row["id"]==pid for row in req("api/v1/admin/home-popup"))
    req(f"api/v1/admin/home-popup/{pid}","POST",{"title":"","active":0,"link_url":"","link_label":"","display_size":"standard","image_format":"original","image_focus":"center"})
    req(f"api/v1/admin/home-popup/{pid}","DELETE",{})
    req(f"api/v1/admin/home-popup/{pid}",expected=404)
    req(f"api/v1/admin/slider/{sid}","DELETE",{})
    req(f"api/v1/admin/slider/{sid}",expected=404)
    course_id=int(sql_script("$db->run(\"INSERT INTO courses(title,category,description,exam_required) VALUES(?,'SSOMA','Curso temporal para verificar portada',0)\",[$v['title']]);echo $db->pdo->lastInsertId();",{"title":"Cover integration "+suffix}))
    covered=upload(f"api/v1/admin/courses/{course_id}/cover-image",{},200)
    assert covered["custom_cover_id"] and covered["materials"]==[]
    req(f"api/v1/files/{covered['custom_cover_id']}",binary=True)
    req(f"api/v1/files/{covered['custom_cover_id']}",expected=404,anonymous=True)
    req(f"api/v1/admin/courses/{course_id}/publish","POST",{},expected=422)
    req("api/v1/session","DELETE",{})
    print(f"OK {checks} comprobaciones HTTP de medios: carga real, edición, privacidad, listas y eliminación. Sin publicar contenido de prueba.")
finally:
    if course_id is not None:
        sql_script("$db->run('DELETE FROM activity_log WHERE course_id=?',[$v['id']]);$db->run('DELETE FROM courses WHERE id=? AND title=?',[$v['id'],$v['title']]);",{"id":course_id,"title":"Cover integration "+suffix})
    if actor is not None:
        sql_script("$files=$db->run('SELECT * FROM files WHERE original_name=?',[$v['name']])->fetchAll();foreach($files as $file){$db->run('DELETE FROM home_popup WHERE image_id=?',[$file['id']]);$db->run('DELETE FROM home_slides WHERE image_id=?',[$file['id']]);$db->run('DELETE FROM files WHERE id=?',[$file['id']]);(new Academia\\Services\\FileTool($db,$config,new Academia\\Support\\PresentationTool()))->discardStored($file);} $db->run('DELETE FROM admins WHERE id=? AND email=?',[$v['actor'],$v['email']]);(new Academia\\Support\\FileCache($config['cache_directory']))->invalidate();",{"actor":actor,"email":email,"name":name})
