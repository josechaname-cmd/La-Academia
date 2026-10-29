<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Repositories\ExamRepository;
use Academia\Repositories\PersonnelRepository;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class AttemptTool {
    public function __construct(private Database $db,private ExamRepository $exams,private PersonnelRepository $personnel,private ExamRules $rules,private int $maximum) {}
    private function dni(array $input): string {
        $dni=Validation::text($input,'dni',8,8);
        if(!preg_match('/^\d{8}$/',$dni))Http::fail(422,'Revisa el DNI.',['dni'=>'Escribe exactamente 8 dígitos.']);
        return $dni;
    }
    private function availableExam(int $courseId,bool $lock=false): array {
        $suffix=$lock?' FOR UPDATE':'';
        $course=$this->db->run("SELECT id,exam_required,site_id FROM courses WHERE id=? AND status='published'".$suffix,[$courseId])->fetch();
        if(!$course)Http::fail(404,'Capacitación no disponible.');
        if(!(int)$course['exam_required'])Http::fail(409,'Esta capacitación no requiere examen.');
        $exam=$this->exams->latest($courseId);if(!$exam)Http::fail(404,'Examen no disponible.');
        ExamSchedule::requireOpen($exam);
        $exam['site_id']=$course['site_id'];return $exam;
    }
    private function requireCourseSite(array $person,array $exam): void {
        if(empty($person['site_id'])||empty($exam['site_id'])||(int)$person['site_id']!==(int)$exam['site_id'])Http::fail(403,'Tu sede debe coincidir con la capacitación. Consulta con tu capacitador.');
    }
    private function policy(array $exam,?int $enrollmentId): array {
        $settings=ExamPolicy::settings($exam,$this->maximum);$used=0;$target=false;
        if($enrollmentId!==null){
            $completed=$this->db->run("SELECT score,answers_json FROM attempts WHERE enrollment_id=? AND status='completed' ORDER BY id",[$enrollmentId])->fetchAll();
            $used=count($completed);
            foreach($completed as $row){
                // Imported/historical grades may have no answer payload. Their recorded
                // score is the only available evidence; new submissions always have answers.
                if($row['answers_json']===null){if($row['score']!==null&&(float)$row['score']>=18){$target=true;break;}continue;}
                $grade=$this->rules->score($exam['questions'],json_decode($row['answers_json'],true,512,JSON_THROW_ON_ERROR));
                if(ExamPolicy::reachedTarget($grade)){$target=true;break;}
            }
        }
        $remaining=$target?0:max(0,$settings['max_attempts']-$used);
        return $settings+['attempts_used'=>$used,'remaining'=>$remaining,'retry_allowed'=>$remaining>0,'retry_block_reason'=>$target?'target_reached':($remaining===0?'limit_reached':null)];
    }
    private function requireAttempt(array $policy): void {
        if($policy['retry_block_reason']==='target_reached')Http::fail(409,'Ya alcanzaste el 90 % de aciertos o más. Esta evaluación está completada. No corresponde otro intento.',[],'target_reached');
        if(!$policy['remaining'])Http::fail(409,'Ya utilizaste los '.$policy['max_attempts'].' intentos permitidos para este examen.',[],'attempt_limit');
    }
    private function result(array $grade,array $exam,int $enrollmentId): array {
        $policy=$this->policy($exam,$enrollmentId);
        $current=$this->exams->latest((int)$exam['course_id']);
        $available=ExamSchedule::state($exam)==='open'&&($exam['course_status']??'published')==='published'&&(int)($current['id']??0)===(int)$exam['exam_id'];
        if(!$available&&$policy['retry_allowed']){$policy['retry_allowed']=false;$policy['retry_block_reason']='unavailable';}
        return $grade+$policy+['passed'=>ExamPolicy::passed($grade['score'],$policy['passing_score']),'total'=>count($grade['review']),'accuracy'=>round($grade['correct']*100/count($grade['review']),2)];
    }
    public function participant(int $courseId,array $input): array {
        $dni=$this->dni($input);
        $exam=$this->availableExam($courseId);
        $person=$this->personnel->findActive($dni);$this->requireCourseSite($person,$exam);
        $enrollment=$this->db->run('SELECT id FROM enrollments WHERE exam_id=? AND dni=?',[$exam['id'],$dni])->fetchColumn();
        return $person+['exam_policy'=>$this->policy($exam,$enrollment===false?null:(int)$enrollment)];
    }
    public function start(int $courseId,array $input): array {
        $dni=$this->dni($input);
        return $this->db->transaction(function()use($courseId,$dni){
            $exam=$this->availableExam($courseId,true);
            $person=$this->personnel->findActive($dni);
            $this->requireCourseSite($person,$exam);
            $this->db->run("INSERT INTO enrollments(exam_id,dni,name,job_title,phone,area) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)",[$exam['id'],$dni,$person['name'],$person['job_title'],'','']);
            $enrollment=$this->db->run('SELECT * FROM enrollments WHERE exam_id=? AND dni=? FOR UPDATE',[$exam['id'],$dni])->fetch();
            $policy=$this->policy($exam,(int)$enrollment['id']);$this->requireAttempt($policy);$used=$policy['attempts_used'];
            $this->db->run('UPDATE enrollments SET name=?,job_title=? WHERE id=?',[$person['name'],$person['job_title'],$enrollment['id']]);
            $this->db->run("DELETE FROM attempts WHERE enrollment_id=? AND status='pending'",[$enrollment['id']]);
            $token=bin2hex(random_bytes(32));$this->db->run('INSERT INTO attempts(enrollment_id,token_hash) VALUES(?,?)',[$enrollment['id'],hash('sha256',$token)]);
            return ['token'=>$token,'attempt'=>$used+1,'version'=>$exam['version'],'participant'=>$person,'expires_at'=>ExamSchedule::deadline($exam,time()),'server_time'=>time(),'questions'=>$this->rules->publicQuestions($exam['questions'])]+ExamPolicy::settings($exam,$this->maximum);
        });
    }
    public function submit(array $input): array {
        $token=Validation::text($input,'token',64,64);if(!ctype_xdigit($token))Http::fail(422,'Referencia de evaluación no válida.');
        $hash=hash('sha256',$token);
        return $this->db->transaction(function()use($input,$hash){
            $ref=$this->db->run('SELECT a.enrollment_id,x.course_id FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id WHERE a.token_hash=?',[$hash])->fetch();if(!$ref)Http::fail(404,'El intento no está disponible. Vuelve a comenzar.');
            // Same lock order as start/save/status: course, enrollment, attempt.
            $this->db->run('SELECT id FROM courses WHERE id=? FOR UPDATE',[$ref['course_id']]);
            $reference=$ref['enrollment_id'];
            $this->db->run('SELECT id FROM enrollments WHERE id=? FOR UPDATE',[$reference]);
            $attempt=$this->db->run('SELECT a.*,e.exam_id,e.dni,x.course_id,x.questions_json,x.max_attempts,x.passing_score,x.opens_at,x.closes_at,x.duration_minutes,x.enabled,c.exam_required,c.site_id AS course_site_id,c.status AS course_status FROM attempts a JOIN enrollments e ON e.id=a.enrollment_id JOIN exams x ON x.id=e.exam_id JOIN courses c ON c.id=x.course_id WHERE a.token_hash=? FOR UPDATE',[$hash])->fetch();
            if(!$attempt)Http::fail(409,'El intento fue reemplazado. Vuelve a comenzar.');
            $questions=json_decode($attempt['questions_json'],true,64,JSON_THROW_ON_ERROR);
            $attempt['questions']=$questions;
            if($attempt['status']==='completed')return $this->result($this->rules->score($questions,json_decode($attempt['answers_json'],true)),$attempt,(int)$reference);
            // Personnel changes apply to pending evaluations as well as new attempts.
            $person=$this->personnel->findActive($attempt['dni']);
            $this->requireCourseSite($person,['site_id'=>$attempt['course_site_id']]);
            if($attempt['course_status']!=='published')Http::fail(409,'Esta capacitación ya no está disponible.');
            if(!(int)$attempt['exam_required'])Http::fail(409,'Esta capacitación ya no requiere examen.');
            ExamSchedule::requireOpen($attempt);
            $deadline=ExamSchedule::deadline($attempt,strtotime($attempt['created_at']));
            if($deadline!==null&&time()>=$deadline)Http::fail(409,'El tiempo para responder este intento ha terminado.');
            $this->requireAttempt($this->policy($attempt,(int)$reference));
            $result=$this->rules->score($questions,$input['answers']??null);
            $this->db->run("UPDATE attempts SET status='completed',score=?,answers_json=?,submitted_at=NOW() WHERE id=?",[$result['score'],json_encode($input['answers'],JSON_THROW_ON_ERROR),$attempt['id']]);
            (new \Academia\Repositories\ActivityRepository($this->db))->submitted((int)$attempt['id']);
            return $this->result($result,$attempt,(int)$reference);
        });
    }
}
