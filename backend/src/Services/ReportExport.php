<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Repositories\ReportRepository;
use Academia\Support\XlsxWriter;
final class ReportExport {
    public function __construct(private ReportRepository $reports) {}
    public function workbook(int $id,?int $siteId=null): string {
        $exam=$this->reports->exam($id,$siteId);$participants=$this->reports->participants($id,null,$siteId);
        $states=['scheduled'=>'Programado','open'=>'En curso','closed'=>'Finalizado','disabled'=>'Desactivado','not_required'=>'No requerido'];
        $rows=[['ACEAPERU · Resultados de evaluación'],['Capacitación',$exam['title'].' · Versión '.$exam['version']],['Apertura',XlsxWriter::date($exam['opens_at']),'Cierre',($exam['closes_at']?XlsxWriter::date($exam['closes_at']):'Sin fecha de cierre')],['Estado',$states[ExamSchedule::state($exam)],'Exportado (Perú)',XlsxWriter::date(date('Y-m-d H:i:s'))],['Participantes',count($participants),'Nota: último envío por participante. Los puntajes no se acumulan.'],[],['Nombre completo','DNI','Cargo','Participación','Nota / 20','Envíos','Fecha del examen (Perú)','Inicio pendiente (Perú)','Nota mínima / 20','Máximo de intentos','Resultado']];
        foreach($participants as $row)$rows[]=[$row['name'],$row['dni'],$row['job_title'],$row['participation'],$row['score']===null?null:(float)$row['score'],(int)$row['attempts'],XlsxWriter::date($row['submitted_at']),XlsxWriter::date($row['pending_at']),$exam['passing_score']===null?null:(int)$exam['passing_score'],(int)$exam['max_attempts'],$row['passed']===null?($row['score']===null?'Sin envío':'Sin mínimo definido'):($row['passed']?'Aprobado':'No aprobado')];
        return XlsxWriter::build($rows);
    }
    public function export(int $id,?int $siteId=null): never {
        $data=$this->workbook($id,$siteId);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="resultados-examen-'.$id.'-'.date('Ymd-His').'.xlsx"');
        header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('Content-Length: '.strlen($data));
        echo $data;exit;
    }
}
