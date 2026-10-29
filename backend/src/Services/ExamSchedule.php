<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Http;
use Academia\Support\Validation;
final class ExamSchedule {
    public static function validate(array $input): array {
        $dates=[];
        foreach(['opens_at','closes_at'] as $key){
            $value=$input[$key]??'';
            if($key==='closes_at'&&($value===''||$value===null)){$dates[$key]=null;continue;}
            if(!is_string($value))Http::fail(422,'Fecha no válida.',[$key=>'Indica fecha y hora.']);
            $value=str_replace('T',' ',$value);
            if(strlen($value)===16)$value.=':00';
            $date=\DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$value,new \DateTimeZone('America/Lima'));
            if(!$date||$date->format('Y-m-d H:i:s')!==$value)Http::fail(422,'Indica las fechas de apertura y cierre.',[$key=>'Fecha y hora válidas obligatorias.']);
            $dates[$key]=$value;
        }
        if($dates['closes_at']!==null&&$dates['closes_at']<=$dates['opens_at'])Http::fail(422,'El cierre debe ser posterior a la apertura.',['closes_at'=>'Debe ser posterior a la apertura.']);
        $dates['duration_minutes']=Validation::number($input,'duration_minutes',1,1440);
        return $dates;
    }
    public static function state(array $exam,?int $now=null): string {
        $now??=time();
        if(isset($exam['exam_required'])&&!(int)$exam['exam_required'])return 'not_required';
        if(isset($exam['enabled'])&&!(int)$exam['enabled'])return 'disabled';
        if(!empty($exam['opens_at'])&&$now<strtotime($exam['opens_at']))return 'scheduled';
        if(!empty($exam['closes_at'])&&$now>=strtotime($exam['closes_at']))return 'closed';
        return 'open';
    }
    public static function requireOpen(array $exam): void {
        $state=self::state($exam);
        if($state==='not_required')Http::fail(409,'Esta capacitación no requiere examen.');
        if($state==='disabled')Http::fail(409,'El examen ha sido desactivado. Contacta al responsable de la capacitación.');
        if($state==='scheduled')Http::fail(409,'El examen todavía no está activo. Vuelve a consultar más adelante.');
        if($state==='closed')Http::fail(409,'El periodo de este examen ha terminado.');
    }
    public static function deadline(array $exam,int $started): ?int {
        $close=empty($exam['closes_at'])?null:strtotime($exam['closes_at']);
        $duration=empty($exam['duration_minutes'])?null:$started+(int)$exam['duration_minutes']*60;
        return $close===null?$duration:($duration===null?$close:min($close,$duration));
    }
}
