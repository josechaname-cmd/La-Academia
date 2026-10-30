<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Services\ExamRules;
use Academia\Services\ExamSchedule;
use Academia\Services\ExamPolicy;
use Academia\Support\Database;
use Academia\Support\Http;
final class ExamRepository {
    public function __construct(private Database $db,private ExamRules $rules) {}
    public function latest(int $courseId): ?array {
        $exam=$this->db->run('SELECT * FROM exams WHERE course_id=? ORDER BY version DESC LIMIT 1',[$courseId])->fetch();
        if(!$exam)return null;$exam['questions']=json_decode($exam['questions_json'],true,64,JSON_THROW_ON_ERROR);unset($exam['questions_json']);return $exam;
    }
    private function activity(int $course,int $exam,int $version,string $type,string $title): void {
        $name=$this->db->run('SELECT title FROM courses WHERE id=?',[$course])->fetchColumn();
        (new ActivityRepository($this->db))->record($type,'exam',$exam,$title,$name.' · Examen v'.$version,$course,$exam);
    }
    public function save(int $courseId,array $input,?array $actor=null): array {
        $questions=$this->rules->validate($input['questions']??null);
        $schedule=ExamSchedule::validate($input);
        $policy=ExamPolicy::validate($input);
        return $this->db->transaction(function()use($courseId,$questions,$schedule,$policy,$actor){
            $course=$this->db->run("SELECT id,exam_required FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$courseId])->fetch();
            if(!$course)Http::fail(404,'Capacitación no encontrada.');
            if(!(int)$course['exam_required'])Http::fail(409,'Esta capacitación está configurada sin examen. Revisa su modalidad antes de agregar preguntas.');
            $current=$this->latest($courseId);
            if($current&&$current['questions']===$questions&&ExamPolicy::settings($current)===$policy){
                if($current['opens_at']===$schedule['opens_at']&&$current['closes_at']===$schedule['closes_at']&&($current['duration_minutes']===null?null:(int)$current['duration_minutes'])===$schedule['duration_minutes'])return $current;
                $this->db->run('UPDATE exams SET opens_at=?,closes_at=?,duration_minutes=? WHERE id=?',[$schedule['opens_at'],$schedule['closes_at'],$schedule['duration_minutes'],$current['id']]);
                $this->activity($courseId,(int)$current['id'],(int)$current['version'],'exam.updated','Periodo del examen actualizado');
                return $this->latest($courseId);
            }
            $version=($current['version']??0)+1;
            $this->db->run('INSERT INTO exams(course_id,version,questions_json,opens_at,closes_at,duration_minutes,max_attempts,passing_score,enabled,created_by,creator_name) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[$courseId,$version,json_encode($questions,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$schedule['opens_at'],$schedule['closes_at'],$schedule['duration_minutes'],$policy['max_attempts'],$policy['passing_score'],$current['enabled']??1,$actor['id']??null,$actor['name']??null]);
            $saved=$this->latest($courseId);
            $this->activity($courseId,(int)$saved['id'],(int)$saved['version'],'exam.created','Nueva versión de examen');
            return $saved;
        });
    }
    public function setEnabled(int $courseId,array $input): array {
        $enabled=\Academia\Support\Validation::number($input,'enabled',0,1);
        return $this->db->transaction(function()use($courseId,$enabled){
            if(!$this->db->run("SELECT id FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$courseId])->fetchColumn())Http::fail(404,'Capacitación no encontrada.');
            $exam=$this->latest($courseId);
            if(!$exam)Http::fail(404,'Primero guarda el examen.');
            // Apply the switch to all versions: older pending attempts must also stop.
            $changed=$this->db->run('UPDATE exams SET enabled=? WHERE course_id=? AND enabled<>?',[$enabled,$courseId,$enabled])->rowCount();
            if($changed)$this->activity($courseId,(int)$exam['id'],(int)$exam['version'],'exam.updated',$enabled?'Examen activado':'Examen desactivado');
            return $this->latest($courseId);
        });
    }
}
