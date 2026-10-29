<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Services\ExamSchedule;
final class ReportRepository {
    public function __construct(private Database $db) {}
    public function results(?int $examId=null,?int $siteId=null): array {
        if($examId!==null)return $this->participants($examId,1000,$siteId);
        return $this->db->run("SELECT a.id,a.score,a.submitted_at,e.name,e.dni,COALESCE(NULLIF(e.job_title,''),'Sin registro') job_title,c.title,c.id course_id,x.version,x.max_attempts,x.passing_score,(a.score>=x.passing_score) passed,(SELECT COUNT(*) FROM attempts n WHERE n.enrollment_id=e.id AND n.status='completed') attempts FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id JOIN courses c ON c.id=x.course_id WHERE a.status='completed' AND a.id=(SELECT MAX(last_a.id) FROM attempts last_a WHERE last_a.enrollment_id=e.id AND last_a.status='completed') ".($siteId===null?'':' AND c.site_id=?')." ORDER BY a.submitted_at DESC LIMIT 1000",$siteId===null?[]:[$siteId])->fetchAll();
    }
    public function exams(?int $siteId=null): array {
        $rows=$this->db->run('SELECT x.id,x.course_id,x.version,x.opens_at,x.closes_at,x.duration_minutes,x.max_attempts,x.passing_score,x.enabled,c.exam_required,c.title,c.status course_status FROM exams x JOIN courses c ON c.id=x.course_id '.($siteId===null?'':' WHERE c.site_id=?').' ORDER BY x.id DESC',$siteId===null?[]:[$siteId])->fetchAll();
        return array_map(fn($row)=>$row+['state'=>ExamSchedule::state($row)],$rows);
    }
    public function exam(int $id,?int $siteId=null): array {
        return $this->db->run('SELECT x.id,x.version,x.opens_at,x.closes_at,x.duration_minutes,x.max_attempts,x.passing_score,x.enabled,c.exam_required,c.title FROM exams x JOIN courses c ON c.id=x.course_id WHERE x.id=?'.($siteId===null?'':' AND c.site_id=?'),$siteId===null?[$id]:[$id,$siteId])->fetch()?:Http::fail(404,'Examen no encontrado.');
    }
    public function participants(int $examId,?int $limit=null,?int $siteId=null): array {
        $exam=$this->exam($examId,$siteId);
        $rows=$this->db->run("SELECT e.id,e.name,e.dni,COALESCE(NULLIF(e.job_title,''),'Sin registro') job_title,a.score,a.submitted_at,(SELECT COUNT(*) FROM attempts n WHERE n.enrollment_id=e.id AND n.status='completed') attempts,(SELECT MAX(p.created_at) FROM attempts p WHERE p.enrollment_id=e.id AND p.status='pending') pending_at FROM enrollments e LEFT JOIN attempts a ON a.id=(SELECT MAX(last_a.id) FROM attempts last_a WHERE last_a.enrollment_id=e.id AND last_a.status='completed') WHERE e.exam_id=? ORDER BY e.name,e.id".($limit===null?'':' LIMIT '.$limit),[$examId])->fetchAll();
        return array_map(function($row)use($exam){
            $deadline=$row['pending_at']?ExamSchedule::deadline($exam,strtotime($row['pending_at'])):null;
            $row['participation']=$row['pending_at']&&!(int)$exam['exam_required']?'Examen no requerido':($row['pending_at']?(!(int)$exam['enabled']?'Examen desactivado':($deadline!==null&&time()>=$deadline?'Plazo vencido':'En desarrollo')):($row['score']!==null?'Enviado':'Sin envío'));
            return $row+['title'=>$exam['title'],'version'=>$exam['version'],'max_attempts'=>(int)$exam['max_attempts'],'passing_score'=>$exam['passing_score'],'passed'=>\Academia\Services\ExamPolicy::passed($row['score'],$exam['passing_score'])];
        },$rows);
    }
    public function summary(?int $siteId=null): array {
        $scope=$siteId===null?'':' AND c.site_id=?';
        $params=$siteId===null?[]:[$siteId];
        // The latest completed submission per enrollment is shared by all statistics.
        $latest="FROM courses c JOIN exams x ON x.course_id=c.id JOIN enrollments e ON e.exam_id=x.id
            JOIN (SELECT enrollment_id,MAX(id) id FROM attempts WHERE status='completed' GROUP BY enrollment_id) latest_attempt ON latest_attempt.enrollment_id=e.id JOIN attempts a ON a.id=latest_attempt.id
            WHERE c.status<>'archived'".$scope;
        $averages=$this->db->run("SELECT c.id course_id,c.title,ROUND(AVG(a.score),2) average_score,MIN(a.score) minimum_score,MAX(a.score) maximum_score,COUNT(*) participant_count ".$latest.' GROUP BY c.id,c.title ORDER BY average_score DESC,c.title',$params)->fetchAll();
        $top=[];
        if($averages){
            $scores=$this->db->run('SELECT course_id,score FROM (SELECT c.id course_id,a.score,ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY a.score DESC,a.id DESC) rank_position '.$latest.') ranked WHERE rank_position<=10 ORDER BY course_id,rank_position',$params)->fetchAll();
            foreach($scores as $score)$top[(int)$score['course_id']][]=(float)$score['score'];
        }
        foreach($averages as &$row){
            $row['course_id']=(int)$row['course_id'];$row['average_score']=(float)$row['average_score'];$row['minimum_score']=(float)$row['minimum_score'];$row['maximum_score']=(float)$row['maximum_score'];$row['participant_count']=(int)$row['participant_count'];
            $row['top_scores']=$top[$row['course_id']]??[];
        }unset($row);
        $counts=$this->db->run("SELECT
            (SELECT COUNT(*) FROM courses c WHERE c.status<>'archived'".$scope.") courses,
            (SELECT COUNT(*) FROM courses c WHERE c.status='published'".$scope.") published,
            (SELECT COUNT(*) FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id JOIN courses c ON c.id=x.course_id WHERE a.status='completed'".$scope.') evaluations',array_merge($params,$params,$params))->fetch();
        return ['courses'=>(int)$counts['courses'],'published'=>(int)$counts['published'],'evaluations'=>(int)$counts['evaluations'],'score_averages'=>$averages];
    }
}
