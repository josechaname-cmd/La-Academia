<?php
declare(strict_types=1);
namespace Academia\Support;

final class ZipTool {
    public function slides(string $path): array {
        $bytes=file_get_contents($path);$tail=substr($bytes,-65557);$end=strrpos($tail,"PK\x05\x06");
        if ($end===false) Http::fail(422,'PowerPoint no válido.');
        $eocd=substr($tail,$end);$count=unpack('v',substr($eocd,10,2))[1];$offset=unpack('V',substr($eocd,16,4))[1];
        if ($count>10000) Http::fail(422,'El PowerPoint contiene demasiados elementos.');
        $result=[];$total=0;
        for ($i=0;$i<$count;$i++) {
            $header=substr($bytes,$offset,46);
            if (strlen($header)!==46||substr($header,0,4)!=="PK\x01\x02") Http::fail(422,'Estructura PPTX no válida.');
            $h=unpack('vmethod',substr($header,10,2));$size=unpack('Vcompressed/Voriginal',substr($header,20,8));
            $lens=unpack('vname/vextra/vcomment',substr($header,28,6));$local=unpack('V',substr($header,42,4))[1];
            $name=substr($bytes,$offset+46,$lens['name']);$offset+=46+$lens['name']+$lens['extra']+$lens['comment'];
            if (!preg_match('~^ppt/slides/slide(\d+)\.xml$~',$name,$m)) continue;
            if ($size['original']>2*1024*1024||($total+=$size['original'])>20*1024*1024||count($result)>=500) Http::fail(422,'La presentación supera los límites de lectura.');
            $lh=substr($bytes,$local,30);
            if (strlen($lh)!==30||substr($lh,0,4)!=="PK\x03\x04") Http::fail(422,'Archivo PPTX incompleto.');
            $ll=unpack('vname/vextra',substr($lh,26,4));$data=substr($bytes,$local+30+$ll['name']+$ll['extra'],$size['compressed']);
            $xml=$h['method']===0?$data:($h['method']===8?@gzinflate($data,$size['original']+1):false);
            if ($xml===false||strlen($xml)!==$size['original']) Http::fail(422,'No se pudo leer una diapositiva.');
            $result[(int)$m[1]]=$xml;
        }
        ksort($result,SORT_NUMERIC);return array_values($result);
    }
}
