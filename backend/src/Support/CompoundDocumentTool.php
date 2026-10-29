<?php
declare(strict_types=1);
namespace Academia\Support;

final class CompoundDocumentTool {
    private string $bytes;private int $sectorSize;private array $fat=[];
    private function number(string $data,int $offset): int { if(strlen($data)<$offset+4)Http::fail(422,'Archivo PPT truncado.');return unpack('V',substr($data,$offset,4))[1]; }
    private function sector(int $id): string {
        $offset=($id+1)*$this->sectorSize;
        if ($id>=0xFFFFFFFA||$offset<0||$offset+$this->sectorSize>strlen($this->bytes)) Http::fail(422,'Sector PPT no válido.');
        return substr($this->bytes,$offset,$this->sectorSize);
    }
    private function chain(int $first,array $allocation,?string $mini=null,int $limit=52428800): string {
        $seen=[];$data='';$id=$first;
        while($id<0xFFFFFFFA){
            if(isset($seen[$id])||count($seen)>100000)Http::fail(422,'Cadena PPT no válida.');$seen[$id]=true;
            $part=$mini===null?$this->sector($id):substr($mini,$id*64,64);
            if($part==='')Http::fail(422,'PPT incompleto.');$data.=$part;
            if(strlen($data)>$limit)Http::fail(422,'El documento supera el límite de lectura.');
            $id=$allocation[$id]??0xFFFFFFFE;
        }return $data;
    }
    public function powerPointStream(string $path): string {
        $this->bytes=file_get_contents($path);
        if(strlen($this->bytes)<512||substr($this->bytes,0,8)!==hex2bin('d0cf11e0a1b11ae1'))Http::fail(422,'Archivo PPT no válido.');
        $shift=unpack('v',substr($this->bytes,30,2))[1];if(!in_array($shift,[9,12],true))Http::fail(422,'Versión PPT no compatible.');$this->sectorSize=1<<$shift;
        $count=$this->number($this->bytes,44);if($count>8192)Http::fail(422,'PPT demasiado complejo.');
        $difat=array_values(unpack('V*',substr($this->bytes,76,436)));$next=$this->number($this->bytes,68);$ext=$this->number($this->bytes,72);
        if($ext>1024)Http::fail(422,'PPT no válido.');
        for($i=0;$i<$ext&&$next<0xFFFFFFFA;$i++){$s=$this->sector($next);$difat=array_merge($difat,array_values(unpack('V*',substr($s,0,-4))));$next=$this->number($s,$this->sectorSize-4);}
        $ids=array_slice(array_values(array_filter($difat,fn($n)=>$n<0xFFFFFFFA)),0,$count);
        foreach($ids as $id)$this->fat=array_merge($this->fat,array_values(unpack('V*',$this->sector($id))));
        $directory=$this->chain($this->number($this->bytes,48),$this->fat,null,8388608);$root=null;$stream=null;
        for($i=0;$i+128<=strlen($directory);$i+=128){$entry=substr($directory,$i,128);$length=unpack('v',substr($entry,64,2))[1];if($length<2||$length>64)continue;
            $name=mb_convert_encoding(substr($entry,0,$length-2),'UTF-8','UTF-16LE');$type=ord($entry[66]);
            if($type===5)$root=$entry;if($type===2&&$name==='PowerPoint Document')$stream=$entry;
        }
        if(!$stream||!$root)Http::fail(422,'No se encontró el contenido de PowerPoint.');
        $size=$this->number($stream,120);if($this->number($stream,124)!==0||$size>52428800)Http::fail(422,'PPT demasiado grande.');
        if($size<4096){$miniFatBytes=$this->chain($this->number($this->bytes,60),$this->fat,null,8388608);$miniFat=$miniFatBytes?array_values(unpack('V*',$miniFatBytes)):[];$mini=$this->chain($this->number($root,116),$this->fat);$content=$this->chain($this->number($stream,116),$miniFat,$mini);}
        else $content=$this->chain($this->number($stream,116),$this->fat);
        return substr($content,0,$size);
    }
}
