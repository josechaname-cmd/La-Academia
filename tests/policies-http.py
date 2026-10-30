"""Policy CRUD through real HTTP, isolated files/SQL and minimum runtime privileges."""
import http.cookiejar, json, os, re, sys, urllib.request, urllib.error
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
    def upload(self,path,fields,pdf,name='politica.pdf',expected=201,token=True):
        boundary='AcademiaPolicySynthetic'
        body=b''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode() for key,value in fields.items())
        body+=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: application/pdf\r\n\r\n'.encode()+pdf+f'\r\n--{boundary}--\r\n'.encode()
        return self.call(path,'POST',expected=expected,raw=body,content=f'multipart/form-data; boundary={boundary}',token=token)[0]

owner,other,superadmin,guest=Client(0),Client(1),Client(2),Client()
pdf=b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'
fields={'title':'Política sintética','description':'Documento institucional de prueba aislada.','active':0}
guest.upload('admin/policies',fields,pdf,expected=401)
owner.upload('admin/policies',fields,pdf,token=False,expected=403)
owner.upload('admin/policies',fields,b'not a PDF',expected=422)
owner.upload('admin/policies',fields,pdf,'politica.mp4',expected=422)
owner.call('admin/policies','POST',fields,expected=422)
created=owner.upload('admin/policies',fields,pdf);pid=created['id'];fid=created['file_id']
assert created['title']==fields['title'] and created['extension']=='pdf'
assert not any(key in created for key in ['storage_key','db_password'])
policies,_=owner.call('admin/policies');assert any(p['id']==pid for p in policies)
foreign,_=other.call('admin/policies');assert not any(p['id']==pid for p in foreign)
for path in [f'admin/policies/{pid}',f'files/{fid}']:other.call(path,expected=403)
guest.call(f'policies/{pid}',expected=404);guest.call(f'files/{fid}',expected=404)
public,_=guest.call('policies');assert not any(p['id']==pid for p in public)
other.call(f'admin/policies/{pid}','POST',fields,expected=403)
other.call(f'admin/policies/{pid}','DELETE',{},expected=403)
owner.call(f'admin/files/{fid}','DELETE',{},expected=409)
owner.call(f'admin/policies/{pid}','POST',fields,token=False,expected=403)
published,_=owner.call(f'admin/policies/{pid}','POST',{**fields,'active':1});assert published['file_id']==fid
detail,_=guest.call(f'policies/{pid}');assert detail['file_id']==fid
content,headers=guest.call(f'files/{fid}',binary=True);assert content==pdf and headers['Content-Type']=='application/pdf'
content,headers=guest.call(f'files/{fid}?download=1',binary=True);assert content==pdf and headers['Content-Disposition'].startswith('attachment')
owner.upload(f'admin/policies/{pid}',{**fields,'active':1},b'invalid',expected=422)
unchanged,_=owner.call(f'admin/policies/{pid}');assert unchanged['file_id']==fid
replacement=owner.upload(f'admin/policies/{pid}',{**fields,'active':1},pdf+b'\n% replacement','reemplazo.pdf',expected=200)
assert replacement['file_id']!=fid and replacement['original_name']=='reemplazo.pdf'
owner.call(f'files/{fid}',expected=404)
content,_=guest.call(f'files/{replacement["file_id"]}',binary=True);assert content.endswith(b'% replacement')
owner.call(f'admin/policies/{pid}','POST',{**fields,'title':'Título editado'})
guest.call(f'files/{replacement["file_id"]}',expected=404)
before,_=owner.call('admin/courses')
owner.call(f'admin/policies/{pid}','DELETE',{},token=False,expected=403)
owner.call(f'admin/policies/{pid}','DELETE',{})
owner.call(f'admin/policies/{pid}',expected=404);owner.call(f'files/{replacement["file_id"]}',expected=404)
after,_=owner.call('admin/courses');assert [(c['id'],c['view_count']) for c in after]==[(c['id'],c['view_count']) for c in before]
sites,_=superadmin.call('admin/sites')
superadmin.upload('admin/policies',fields,pdf,expected=422)
managed=superadmin.upload('admin/policies',{**fields,'site_id':sites[0]['id']},pdf)
superadmin.call(f'admin/policies/{managed["id"]}','DELETE',{})
print(f'OK {checks} policies HTTP checks: PDF-only CRUD, draft visibility, sites, CSRF, replacement, deletion, streaming/download and unchanged training views.')
