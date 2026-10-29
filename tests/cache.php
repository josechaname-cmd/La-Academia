<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
use Academia\Support\FileCache;
$path=sys_get_temp_dir().'/academia-cache-test-'.bin2hex(random_bytes(8));
$cache=new FileCache($path);$checks=0;$loads=0;
function verify(bool $ok,string $message): void {global $checks;if(!$ok)throw new RuntimeException($message);$checks++;}
$loader=function()use(&$loads){return ['load'=>++$loads];};
try{
    $first=$cache->remember('courses',60,$loader,$hit);verify(!$hit&&$loads===1,'First load');
    $second=$cache->remember('courses',60,$loader,$hit);verify($hit&&$loads===1&&$first===$second,'Hit avoids loader');
    $cache->invalidate();$cache->remember('courses',60,$loader,$hit);verify(!$hit&&$loads===2,'Writes invalidate previous data');
    $cache->remember('courses',0,$loader,$hit);verify(!$hit&&$loads===3,'Disabled cache');
    $file=$path.'/'.hash('sha256','courses').'.json';
    file_put_contents($file,'broken json');$cache->remember('courses',60,$loader,$hit);verify(!$hit&&$loads===4,'Corruption recovers');
    $entry=json_decode(file_get_contents($file),true);$entry['expires']=0;file_put_contents($file,json_encode($entry));
    $cache->remember('courses',60,$loader,$hit);verify(!$hit&&$loads===5,'Expiration reloads');
    $cache->remember('race',60,function()use($cache){$cache->invalidate();return 'old';},$hit);
    verify($cache->remember('race',60,fn()=>'new',$hit)==='new'&&!$hit,'Concurrent invalidation prevents stale refill');
    try{$cache->remember('failure',60,fn()=>throw new RuntimeException('Expected'));}catch(RuntimeException){}
    verify($cache->remember('failure',60,fn()=>'recovered',$hit)==='recovered'&&!$hit,'Errors are not cached');
    $cache->remember('anonymous',60,fn()=>['banner'],$hit);
    verify($cache->remember('authenticated',60,fn()=>['notice'],$hit)===['notice']&&!$hit,'Audience isolation');
}finally{
    foreach(glob($path.'/*')?:[] as $file)unlink($file);
    if(is_dir($path))rmdir($path);
}
echo "OK $checks verificaciones de caché.\n";
