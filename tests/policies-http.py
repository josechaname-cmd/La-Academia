"""Policy CRUD through real HTTP, isolated files/SQL and minimum runtime privileges."""
import base64, http.cookiejar, json, os, re, sys, urllib.request, urllib.error
base=os.environ['ACADEMIA_TEST_BASE']
assert re.fullmatch(r'http://127\.0\.0\.1:\d+/la-academia/',base)
fixture=json.load(sys.stdin);checks=0
class Client:
    def __init__(self,index=None):
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.csrf=''
        self.csrf=self.call('session')[0]['csrf']
        if index is not None:self.csrf=self.call('session','POST',{'email':f'http{index}@example.invalid','password':fixture['password']})[0]['csrf']
    def call(self,path,method='GET',data=None,expected=200,raw=None,binary=False,token=True,content=None):
        global checks
        headers={}
        if token:headers['X-CSRF-Token']=self.csrf
        if data is not None:raw=json.dumps(data).encode();content='application/json'
        if content:headers['Content-Type']=content
        request=urllib.request.Request(base+'api/v1/'+path,data=raw,method=method,headers=headers)
        try:response=self.http.open(request,timeout=30)
        except urllib.error.HTTPError as error:response=error
        with response:
            body=response.read();assert response.status==expected,(path,expected,response.status,body[:180]);checks+=1
            return (body if binary else json.loads(body).get('data')),response.headers
    def upload(self,path,fields,pdf=None,name='politica.pdf',expected=201,token=True,cover=None,cover_name='portada.png'):
        boundary='AcademiaPolicySynthetic'
        body=b''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode() for key,value in fields.items())
        for key,filename,mime,data in [('file',name,'application/pdf',pdf),('cover_image',cover_name,'image/png',cover)]:
            if data is not None:body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+data+b'\r\n'
        body+=f'--{boundary}--\r\n'.encode()
        return self.call(path,'POST',expected=expected,raw=body,content=f'multipart/form-data; boundary={boundary}',token=token)[0]

owner,other,superadmin,guest=Client(0),Client(1),Client(2),Client()
pdf=b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
fields={'title':'Política sintética','description':'Documento institucional de prueba aislada.','active':0}
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhXcAAAAASUVORK5CYII=')
guest.upload('admin/policies',fields,pdf,cover=png,expected=401)
owner.upload('admin/policies',fields,pdf,cover=png,token=False,expected=403)
owner.upload('admin/policies',fields,b'not a PDF',cover=png,expected=422)
owner.upload('admin/policies',fields,pdf,'politica.mp4',cover=png,expected=422)
owner.call('admin/policies','POST',fields,expected=422)
owner.upload('admin/policies',fields,pdf,expected=422)
owner.upload('admin/policies',fields,cover=png,expected=422)
owner.upload('admin/policies',fields,pdf,cover=b'not an image',expected=422)
owner.upload('admin/policies',fields,pdf,cover=png,cover_name='imagen.svg',expected=422)
owner.upload('admin/policies',fields,pdf,cover=png+b'0'*(8*1024*1024),expected=422)
created=owner.upload('admin/policies',fields,pdf,cover=png);pid=created['id'];fid=created['file_id'];cid=created['cover_image_id']
assert created['title']==fields['title'] and created['extension']=='pdf' and cid!=fid
assert not any(key in created for key in ['storage_key','db_password','site_id','site_name'])
policies,_=owner.call('admin/policies');assert any(p['id']==pid for p in policies)
foreign,_=other.call('admin/policies');assert any(p['id']==pid for p in foreign),'Policies are global'
other.call(f'admin/policies/{pid}');other.call(f'files/{fid}',binary=True);other.call(f'files/{cid}',binary=True)
for path in [f'policies/{pid}',f'files/{fid}',f'files/{cid}']:guest.call(path,expected=404)
public,_=guest.call('policies');assert not any(p['id']==pid for p in public)
for file_id in [fid,cid]:owner.call(f'admin/files/{file_id}','DELETE',{},expected=409)
owner.call(f'admin/policies/{pid}','POST',fields,token=False,expected=403)
published,_=other.call(f'admin/policies/{pid}','POST',{**fields,'active':1});assert published['file_id']==fid and published['cover_image_id']==cid
detail,_=guest.call(f'policies/{pid}');assert detail['file_id']==fid and detail['cover_image_id']==cid
content,headers=guest.call(f'files/{fid}',binary=True);assert content==pdf and headers['Content-Type']=='application/pdf'
content,headers=guest.call(f'files/{fid}?download=1',binary=True);assert content==pdf and headers['Content-Disposition'].startswith('attachment')
content,headers=guest.call(f'files/{cid}',binary=True);assert content==png and headers['Content-Type']=='image/png'
owner.upload(f'admin/policies/{pid}',{**fields,'active':1},b'invalid',expected=422)
# File upload precedes image validation: this must roll back the new PDF and text.
owner.upload(f'admin/policies/{pid}',{**fields,'title':'Should roll back','active':1},pdf+b'% rollback',cover=b'forged',expected=422)
unchanged,_=owner.call(f'admin/policies/{pid}');assert unchanged['file_id']==fid and unchanged['cover_image_id']==cid and unchanged['title']==fields['title']
cover_replacement=other.upload(f'admin/policies/{pid}',{**fields,'active':1},cover=png,cover_name='portada-nueva.png',expected=200)
assert cover_replacement['cover_image_id']!=cid and cover_replacement['file_id']==fid
owner.call(f'files/{cid}',expected=404);cid=cover_replacement['cover_image_id']
content,_=guest.call(f'files/{cid}',binary=True);assert content==png
replacement=owner.upload(f'admin/policies/{pid}',{**fields,'active':1},pdf+b'\n% replacement','reemplazo.pdf',expected=200)
assert replacement['file_id']!=fid and replacement['original_name']=='reemplazo.pdf' and replacement['cover_image_id']==cid
owner.call(f'files/{fid}',expected=404)
content,_=guest.call(f'files/{replacement["file_id"]}',binary=True);assert content.endswith(b'% replacement')
owner.call(f'admin/policies/{pid}','POST',{**fields,'title':'Título editado'})
for file_id in [replacement['file_id'],cid]:guest.call(f'files/{file_id}',expected=404)
before,_=owner.call('admin/courses')
owner.call(f'admin/policies/{pid}','DELETE',{},token=False,expected=403)
other.call(f'admin/policies/{pid}','DELETE',{})
for path in [f'admin/policies/{pid}',f'files/{replacement["file_id"]}',f'files/{cid}']:owner.call(path,expected=404)
after,_=owner.call('admin/courses');assert [(c['id'],c['view_count']) for c in after]==[(c['id'],c['view_count']) for c in before]
# A superadmin without a site can create a policy and another admin can manage it.
managed=superadmin.upload('admin/policies',fields,pdf,cover=png)
assert not any(key in managed for key in ['site_id','site_name'])
other.call(f'admin/policies/{managed["id"]}','DELETE',{})
print(f'OK {checks} policies HTTP checks: global access, PDF and cover CRUD, rollback, draft privacy, CSRF, independent replacements, download and unchanged training views.')
