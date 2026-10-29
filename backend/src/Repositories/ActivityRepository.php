<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
final class ActivityRepository {
    public function __construct(private Database $db) {}
    public function record(string $type,string $entity,int $id,string $title,string $body,?int $course=null,?int $exam=null,?string $key=null): void {
        $this->db->run('INSERT INTO activity_log(event_key,event_type,entity_type,entity_id,course_id,exam_id,title,body) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=activity_log.id',[$key??bin2hex(random_bytes(24)),$type,$entity,$id,$course,$exam,$title,mb_substr($body,0,500)]);
    }
    public function course(int $id,string $type,string $title): void {
        $name=$this->db->run('SELECT title FROM courses WHERE id=?',[$id])->fetchColumn();
        $this->record($type,'course',$id,$title,(string)$name,$id);
    }
    public function submitted(int $attempt): void {
        $row=$this->db->run('SELECT e.exam_id,x.course_id,x.version,c.title FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id JOIN courses c ON c.id=x.course_id WHERE a.id=?',[$attempt])->fetch();
        $this->record('attempt.submitted','attempt',$attempt,'Nuevo resultado recibido',$row['title'].' · Examen v'.$row['version'].'. Se recibió una evaluación.',(int)$row['course_id'],(int)$row['exam_id'],'attempt.submitted:'.$attempt);
    }
    public function synchronizeClosed(): void {
        // Unique event keys make this safe under concurrent polls and repeated requests.
        // This uses the configured Peru database time and preserves the actual closing time.
        $this->db->run("INSERT INTO activity_log(event_key,event_type,entity_type,entity_id,course_id,exam_id,title,body,created_at)
            SELECT CONCAT('exam.closed:',x.id,':',x.closes_at),'exam.closed','exam',x.id,x.course_id,x.id,'Examen finalizado',CONCAT(c.title,' · Examen v',x.version,'. El periodo de evaluación terminó.'),x.closes_at
            FROM exams x JOIN courses c ON c.id=x.course_id
            WHERE x.closes_at IS NOT NULL AND x.closes_at<=NOW()
            AND NOT EXISTS(SELECT 1 FROM activity_log l WHERE l.event_key=CONCAT('exam.closed:',x.id,':',x.closes_at))
            ON DUPLICATE KEY UPDATE id=activity_log.id");
    }
    public function feed(?int $siteId=null): array {
        $this->synchronizeClosed();
        $rows=$this->db->run("SELECT l.id,l.event_type,l.entity_type,l.entity_id,l.title,l.body,l.created_at,l.course_id,l.exam_id,c.status AS course_status,e.id AS existing_event
            FROM activity_log l LEFT JOIN courses c ON c.id=l.course_id LEFT JOIN events e ON l.entity_type='event' AND e.id=l.entity_id
            WHERE l.event_type IN ('attempt.submitted','exam.closed','content.views')".($siteId===null?'':' AND (l.course_id IS NULL OR c.site_id=?)').' ORDER BY l.id DESC LIMIT 60',$siteId===null?[]:[$siteId])->fetchAll();
        foreach($rows as &$row){
            $row['kind']='activity';
            $row['href']=in_array($row['event_type'],['exam.created','exam.updated'],true)&&$row['course_status']!=='archived'?'#admin/examen/'.$row['course_id']:
                ($row['exam_id']?'#admin/capacitaciones/resultados/'.$row['exam_id']:
                ($row['entity_type']==='event'?($row['existing_event']?'#admin/eventos/'.$row['entity_id']:'#admin/eventos'):
                ($row['course_status']&&$row['course_status']!=='archived'?'#admin/capacitaciones/'.$row['course_id']:'#admin/capacitaciones')));
            unset($row['course_status'],$row['existing_event']);
        }
        unset($row);
        return ['items'=>$rows,'revision'=>hash('sha256',json_encode($rows,JSON_THROW_ON_ERROR))];
    }
}
