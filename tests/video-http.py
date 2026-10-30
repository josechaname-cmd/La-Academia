"""Actual video uploads, site permissions, seeking and views in an isolated DB."""
import hashlib, http.cookiejar, json, os, re, shutil, struct, subprocess, sys, tempfile
from pathlib import Path
import urllib.error, urllib.request

base=os.environ['ACADEMIA_TEST_BASE']
assert re.fullmatch(r'http://127\.0\.0\.1:\d+/la-academia/',base)
fixture=json.load(sys.stdin)
root=Path(__file__).resolve().parents[1]
ffmpeg=Path(os.environ.get('ACADEMIA_TEST_FFMPEG',root/'tools/runtime/ffmpeg/bin/ffmpeg.exe'))
assert ffmpeg.is_file(),'Install the video test generator with tools/install-video-runtime.py'
checks=0
class Client:
    def __init__(self,index=None):
        self.http=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.csrf='';self.csrf=self.call('session')[0]['csrf']
        if index is not None:self.csrf=self.call('session','POST',{'email':f'http{index}@example.invalid','password':fixture['password']})[0]['csrf']
    def call(self,path,method='GET',data=None,expected=200,raw=None,headers=None,binary=False,token=True):
        global checks
        headers=dict(headers or {})
        if token:headers['X-CSRF-Token']=self.csrf
        if data is not None:raw=json.dumps(data).encode();headers['Content-Type']='application/json'
        request=urllib.request.Request(base+'api/v1/'+path,data=raw,method=method,headers=headers)
        try:response=self.http.open(request,timeout=60)
        except urllib.error.HTTPError as error:response=error
        with response:
            body=response.read();assert response.status==expected,(path,expected,response.status,body[:200]);checks+=1
            return (body if binary or method=='HEAD' else json.loads(body).get('data')),response.headers
    def upload(self,path,content,name='clip.mp4',fields=None,expected=201,token=True):
        boundary='AcademiaVideoFixture';body=b''
        for key,value in (fields or {}).items():body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
        body+=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: video/mp4\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode()
        return self.call(path,'POST',expected=expected,raw=body,headers={'Content-Type':f'multipart/form-data; boundary={boundary}'},token=token)[0]
def generate(destination,*options,audio_codec=None):
    args=[str(ffmpeg),'-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=12']
    if audio_codec:args+=['-f','lavfi','-i','anullsrc=r=44100:cl=stereo']
    args+=['-t','1',*options]
    if audio_codec:args+=['-c:a',audio_codec,'-shortest']
    subprocess.run([*args,'-y',str(destination)],check=True,timeout=45,capture_output=True)

admin,other,guest=Client(0),Client(1),Client()
with tempfile.TemporaryDirectory(prefix='academia-video-fixtures-') as temporary:
    directory=Path(temporary)
    generate(directory/'clip.mp4','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',audio_codec='aac')
    generate(directory/'clip.webm','-c:v','libvpx-vp9','-pix_fmt','yuv420p',audio_codec='libopus')
    generate(directory/'unsupported.mp4','-c:v','mpeg4')
    video=(directory/'clip.mp4').read_bytes()
    options,_=admin.call('admin/materials/options')
    assert options['video_enabled'] and options['video_max_bytes']==500*1024*1024
    before,_=admin.call('admin/courses')
    creation={'title':'Capacitación de video sintético','description':'Video generado para pruebas aisladas.','category':'Pruebas','exam_required':0}
    admin.upload('admin/courses',b'not a video',fields=creation,expected=422)
    after,_=admin.call('admin/courses');assert len(before)==len(after),'Invalid upload rolls back course creation'
    course=admin.upload('admin/courses',video,fields=creation);cid=course['id'];material=course['materials'][0];fid=material['id']
    assert material['media_type']=='video' and material['video_codec']=='h264' and material['audio_codec']=='aac'
    assert 0<float(material['duration_seconds'])<=2 and material['video_width']==160
    assert material['preview_status'] is None and course['cover_file_id'] is None
    assert not any(key in material for key in ['storage_key','slides_json'])
    for client,code in [(guest,404),(other,403)]:
        client.call(f'files/{fid}',expected=code);client.call(f'files/{fid}','HEAD',expected=code)
    other.upload(f'admin/courses/{cid}/files',video,expected=403)
    other.call(f'admin/files/{fid}','DELETE',{},expected=403)
    admin.call(f'admin/courses/{cid}/cover','POST',{'file_id':fid},expected=422)
    admin.call(f'admin/files/{fid}/preview','POST',{},expected=422)
    admin.upload(f'admin/courses/{cid}/files',video,token=False,expected=403)
    for content,name in [(video,'clip.exe'),(b'%PDF-1.4 not video','clip.mp4'),(video[:40],'clip.mp4'),((directory/'unsupported.mp4').read_bytes(),'clip.mp4')]:admin.upload(f'admin/courses/{cid}/files',content,name,expected=422)
    second=admin.upload(f'admin/courses/{cid}/files',(directory/'clip.webm').read_bytes(),'clip.webm');assert second['video_codec']=='vp9' and second['audio_codec']=='opus'
    if os.environ.get('ACADEMIA_TEST_LARGE_VIDEO')=='1':
        assert shutil.disk_usage(directory).free>2*1024**3,'Large-file test requires 2 GB free'
        for size,expected in [(500*1024*1024,201),(500*1024*1024+1,422)]:
            boundary='AcademiaLargeVideo'
            prefix=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="large.mp4"\r\nContent-Type: video/mp4\r\n\r\n'.encode()
            suffix=f'\r\n--{boundary}--\r\n'.encode()
            # ISO BMFF free-space box: valid padding, generated locally, never held in RAM.
            path=directory/'large-request.bin'
            with path.open('wb') as stream:
                stream.write(prefix+video+struct.pack('>I4s',size-len(video),b'free'))
                stream.seek(len(prefix)+size);stream.write(suffix)
            with path.open('rb') as stream:
                large,_=admin.call(f'admin/courses/{cid}/files','POST',raw=stream,expected=expected,headers={'Content-Type':f'multipart/form-data; boundary={boundary}','Content-Length':str(path.stat().st_size)})
            if expected==201:
                assert large['size']==size
                admin.call(f'admin/files/{large["id"]}','DELETE',{})
            path.unlink()
        print('OK actual 500 MB upload accepted; 500 MB + 1 byte rejected; no full-file RAM allocation.')
    admin.call(f'admin/courses/{cid}/publish','POST',{})
    body,headers=guest.call(f'files/{fid}',binary=True)
    assert hashlib.sha256(body).digest()==hashlib.sha256(video).digest()
    assert headers['Content-Type']=='video/mp4' and headers['Accept-Ranges']=='bytes' and headers['Content-Disposition'].startswith('inline')
    etag=headers['ETag']
    for value,start,end in [('bytes=0-15',0,15),('bytes=16-',16,len(video)-1),('bytes=-12',len(video)-12,len(video)-1),('bytes=0-9999999',0,len(video)-1)]:
        body,headers=guest.call(f'files/{fid}',headers={'Range':value},expected=206,binary=True)
        assert body==video[start:end+1] and int(headers['Content-Length'])==len(body) and headers['Content-Range']==f'bytes {start}-{end}/{len(video)}'
    for value in [f'bytes={len(video)}-','bytes=-0','bytes=20-10','bytes=999999999999999999999-']:
        body,headers=guest.call(f'files/{fid}',headers={'Range':value},expected=416,binary=True)
        assert body==b'' and headers['Content-Range']==f'bytes */{len(video)}'
    for value in ['bytes=0-1,4-5','items=0-1','bytes=broken']:
        body,_=guest.call(f'files/{fid}',headers={'Range':value},binary=True);assert body==video
    body,_=guest.call(f'files/{fid}',headers={'Range':'bytes=0-3','If-Range':etag},expected=206,binary=True);assert body==video[:4]
    body,_=guest.call(f'files/{fid}',headers={'Range':'bytes=0-3','If-Range':'"old"'},binary=True);assert body==video
    body,_=guest.call(f'files/{fid}',headers={'Range':'bytes=0-3','If-Range':'tomorrow'},binary=True);assert body==video
    body,headers=guest.call(f'files/{fid}','HEAD',headers={'Range':'bytes=0-3'});assert body==b'' and int(headers['Content-Length'])==len(video)
    body,headers=guest.call(f'files/{fid}?download=1',binary=True);assert body==video and headers['Content-Disposition'].startswith('attachment')
    detail,_=guest.call(f'courses/{cid}');assert int(detail['view_count'])==0,'Preload, seek and download never record video playback'
    guest.call(f'courses/{cid}/view','POST',{'file_id':fixture['files'][0]},expected=404)
    guest.call(f'courses/{cid}/view','POST',{'file_id':fid},expected=403,token=False)
    first,_=guest.call(f'courses/{cid}/view','POST',{'file_id':fid})
    repeat,_=guest.call(f'courses/{cid}/view','POST',{'file_id':second['id']})
    review,_=admin.call(f'courses/{cid}/view','POST',{'file_id':fid})
    assert first['recorded'] and first['view_count']==1 and not repeat['recorded'] and not review['recorded']
    fresh=Client();counted,_=fresh.call(f'courses/{cid}/view','POST',{'file_id':fid});assert counted['view_count']==2
    admin.call(f'admin/files/{second["id"]}','DELETE',{});admin.call(f'admin/files/{fid}','DELETE',{})
    draft,_=admin.call(f'admin/courses/{cid}');assert draft['status']=='draft' and draft['materials']==[] and int(draft['view_count'])==2
    guest.call(f'files/{fid}',expected=404)
print(f'OK {checks} video HTTP checks: codecs, metadata, transactional upload, sites, CSRF, ranges/HEAD, views, deletion and draft fallback.')
