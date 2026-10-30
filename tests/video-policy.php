<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
use Academia\Support\ByteRange;
use Academia\Services\MaterialUploadPolicy;
$checks=0;
function verify(bool $value):void {global $checks;if(!$value)throw new RuntimeException('Video policy assertion failed at '.($checks+1));$checks++;}
foreach([
 ['bytes=0-0',[0,0]],['bytes=10-19',[10,19]],['bytes=99-',[99,99]],['bytes=-10',[90,99]],['bytes=-1000',[0,99]],['bytes=10-9999',[10,99]],
 ['bytes=100-',false],['bytes=10-0',false],['bytes=-0',false],['bytes=999999999999999999999-',false],['bytes=0-999999999999999999999',[0,99]],
 ['bytes=0-1,3-4',null],['items=0-1',null],['bytes=-',null],['bytes=abc',null],['',null]
] as [$input,$expected])verify(ByteRange::parse($input,100)===$expected);
verify(ByteRange::parse('bytes=0-',0)===false);
verify(MaterialUploadPolicy::bytes('500M')===524288000);
verify(MaterialUploadPolicy::bytes('512M')===536870912);
verify(MaterialUploadPolicy::bytes('1G')===1073741824);
verify(MaterialUploadPolicy::bytes('4096')===4096);
verify(MaterialUploadPolicy::bytes('invalid')===0);
$config=require dirname(__DIR__).'/backend/config/application.php';
$options=(new MaterialUploadPolicy($config))->options();
verify($options['video_max_bytes']<=500*1024*1024);
verify($options['document_max_bytes']<=50*1024*1024);
$disabled=(new MaterialUploadPolicy(array_replace($config,['ffprobe'=>__DIR__.'/not-installed'])))->options();
verify(!$disabled['video_enabled']);
// A sparse file checks the actual backend size rejection without allocating 500 MB in RAM.
$path=tempnam(sys_get_temp_dir(),'academy-size-');
try{
 $stream=fopen($path,'wb');ftruncate($stream,500*1024*1024+1);fclose($stream);
 // FileTool validates size before accessing its database; use an uninitialized database only for this rejection.
 $db=(new ReflectionClass(Academia\Support\Database::class))->newInstanceWithoutConstructor();
 $files=new Academia\Services\FileTool($db,$config,new Academia\Support\PresentationTool());
 try{$files->add(['error'=>UPLOAD_ERR_OK,'name'=>'too-large.mp4','tmp_name'=>$path],1);throw new RuntimeException('Oversized video accepted');}
 catch(Academia\Http\ApiException $error){verify($error->getCode()===422&&str_contains($error->getMessage(),'500 MB'));}
}finally{unlink($path);}
echo "OK $checks video policy checks: byte ranges, overflow, empty resources, configured caps, disabled inspector and real file size rejection.\n";
