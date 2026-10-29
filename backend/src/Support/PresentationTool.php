<?php
declare(strict_types=1);
namespace Academia\Support;

final class PresentationTool {
    public function read(string $path,string $extension): array {
        $pages=[];
        if($extension==='pptx'){
            foreach((new ZipTool())->slides($path) as $xml){
                if(stripos($xml,'<!DOCTYPE')!==false)Http::fail(422,'Documento XML no permitido.');
                $dom=new \DOMDocument();$previous=libxml_use_internal_errors(true);$ok=$dom->loadXML($xml,LIBXML_NONET|LIBXML_NOBLANKS);libxml_clear_errors();libxml_use_internal_errors($previous);
                if(!$ok)Http::fail(422,'Diapositiva no válida.');
                $xpath=new \DOMXPath($dom);$xpath->registerNamespace('a','http://schemas.openxmlformats.org/drawingml/2006/main');$lines=[];
                foreach($xpath->query('//a:p') as $paragraph){$line='';foreach($xpath->query('.//a:t',$paragraph) as $text)$line.=$text->textContent;if(trim($line)!=='')$lines[]=trim($line);}
                $pages[]=$this->page($lines,count($pages)+1);
            }
        }else{
            $data=(new CompoundDocumentTool())->powerPointStream($path);$slides=[];$fallback=[];
            $this->records($data,0,$slides,$fallback);
            if($fallback)$slides[]=$fallback;
            foreach($slides as $lines)if($lines)$pages[]=$this->page($lines,count($pages)+1);
        }
        if(!$pages)$pages[]=['title'=>'Presentación visual','paragraphs'=>[]];
        return $pages;
    }
    private function page(array $lines,int $number): array { return ['title'=>array_shift($lines)?:"Diapositiva $number",'paragraphs'=>$lines]; }
    private function records(string $data,int $depth,array &$slides,array &$text): void {
        if($depth>24||count($slides)>500)Http::fail(422,'Presentación demasiado compleja.');
        for($offset=0;$offset+8<=strlen($data);){
            $h=unpack('vinfo/vtype/Vsize',substr($data,$offset,8));$offset+=8;
            if($h['size']>strlen($data)-$offset)break;$payload=substr($data,$offset,$h['size']);$offset+=$h['size'];
            if(in_array($h['type'],[4000,4008],true)){$line=trim(mb_convert_encoding($payload,'UTF-8',$h['type']===4000?'UTF-16LE':'Windows-1252'));if($line!=='')foreach(preg_split('/[\r\n\x0B]+/u',$line) as $value)if(trim($value)!=='')$text[]=trim($value);}
            elseif(($h['info']&15)===15){
                if($h['type']===4080&&($h['info']>>4)!==0)continue;
                $nested=[];$this->records($payload,$depth+1,$slides,$nested);
                if($h['type']===1006&&$nested)$slides[]=$nested;else $text=array_merge($text,$nested);
            }elseif($h['type']===1011&&$text){$slides[]=$text;$text=[];}
        }
    }
}
