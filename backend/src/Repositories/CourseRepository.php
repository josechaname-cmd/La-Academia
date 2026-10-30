<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class CourseRepository {
    public function __construct(private Database $db,private CategoryRepository $categories) {}
    public function list(bool $admin=false,?int $siteId=null): array {
        $rows=$this->db->run("SELECT c.*,s.name site_name, COALESCE((SELECT MAX(l.created_at) FROM activity_log l WHERE l.entity_type='course' AND l.entity_id=c.id AND l.event_type='course.published'),c.created_at) published_at, cover.id cover_file_id, pv.status cover_status,pv.source_hash cover_version, (SELECT COUNT(*) FROM files f WHERE f.course_id=c.id) material_count, latest.version exam_version,latest.enabled exam_enabled,latest.opens_at exam_opens_at,latest.closes_at exam_closes_at,latest.duration_minutes exam_duration_minutes,latest.max_attempts exam_max_attempts,latest.passing_score exam_passing_score FROM courses c LEFT JOIN sites s ON s.id=c.site_id LEFT JOIN exams latest ON latest.id=(SELECT e.id FROM exams e WHERE e.course_id=c.id ORDER BY e.version DESC LIMIT 1) LEFT JOIN files cover ON cover.id=COALESCE(c.cover_file_id,(SELECT MIN(f0.id) FROM files f0 WHERE f0.course_id=c.id AND f0.extension IN ('pdf','ppt','pptx'))) LEFT JOIN file_previews pv ON pv.file_id=cover.id WHERE ".($admin?"c.status<>'archived'":"c.status='published'").($admin&&$siteId!==null?' AND c.site_id=?':'').' ORDER BY '.($admin?'c.created_at':'published_at').' DESC,c.id DESC',$admin&&$siteId!==null?[$siteId]:[])->fetchAll();
        return $rows;
    }
    public function get(int $id,bool $admin=false): array {
        $course=$this->db->run("SELECT c.*,s.name site_name,cover.id cover_file_id,pv.status cover_status,pv.source_hash cover_version FROM courses c LEFT JOIN sites s ON s.id=c.site_id LEFT JOIN files cover ON cover.id=COALESCE(c.cover_file_id,(SELECT MIN(f0.id) FROM files f0 WHERE f0.course_id=c.id AND f0.extension IN ('pdf','ppt','pptx'))) LEFT JOIN file_previews pv ON pv.file_id=cover.id WHERE c.id=? AND ".($admin?"c.status<>'archived'":"c.status='published'"),[$id])->fetch();
        if(!$course)Http::fail(404,'Capacitación no disponible.');
        $course['materials']=$this->db->run('SELECT f.id,f.original_name,f.extension,f.size,f.mime,f.duration_seconds,f.video_width,f.video_height,f.video_codec,f.audio_codec,p.status preview_status,p.source_hash preview_version,p.error_message preview_error FROM files f LEFT JOIN file_previews p ON p.file_id=f.id WHERE f.course_id=? ORDER BY f.id',[$id])->fetchAll();
        foreach($course['materials'] as &$material){
            $material['media_type']=in_array($material['extension'],['mp4','webm'],true)?'video':'document';
            $material['duration_seconds']=$material['duration_seconds']===null?null:(float)$material['duration_seconds'];
            $material['preview_error']=\Academia\Exceptions\PreviewException::publicMessage($material['preview_error']);
        }
        unset($material);
        $course['exam']=$this->db->run('SELECT id,version,opens_at,closes_at,duration_minutes,max_attempts,passing_score,enabled,JSON_LENGTH(questions_json) question_count,creator_name,created_at FROM exams WHERE course_id=? ORDER BY version DESC LIMIT 1',[$id])->fetch()?:null;
        if($course['exam'])$course['exam']['state']=\Academia\Services\ExamSchedule::state($course['exam']+['exam_required'=>$course['exam_required']]);
        if(!$admin&&!(int)$course['exam_required'])$course['exam']=null;
        return $course;
    }
    public function save(array $data,?int $id,?array $actor=null): array {
        $title=Validation::text($data,'title',5,160);$category=$this->categories->resolve(Validation::text($data,'category',2,40),'course');$description=Validation::text($data,'description',10,1500);
        $requested=array_key_exists('exam_required',$data)?Validation::number($data,'exam_required',0,1):null;
        return $this->db->transaction(function()use($data,$id,$title,$category,$description,$requested,$actor){
        $actorSite=!empty($actor['site_id'])?(int)$actor['site_id']:null;
        if($id){
            $current=$this->db->run("SELECT * FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$id])->fetch();
            if(!$current)Http::fail(404,'Capacitación no disponible.');
            $site=$actor&&$actor['role']==='superadmin'&&array_key_exists('site_id',$data)?Validation::number($data,'site_id',1,PHP_INT_MAX):(int)($current['site_id']?:$actorSite);
            $required=$requested??(int)$current['exam_required'];
            if(!$site||!$this->db->run('SELECT id FROM sites WHERE id=? AND active=1',[$site])->fetchColumn())Http::fail(422,'Selecciona una sede activa para la capacitación.',['site_id'=>'Selecciona una sede activa.']);
            if($actor)\Academia\Services\CoursePolicy::requireCourse($actor,['site_id'=>$site]);
            if($current['title']===$title&&$current['category']===$category&&$current['description']===$description&&(int)$current['exam_required']===$required&&(int)$current['site_id']===$site)return $this->get($id,true);
            $status=$current['status'];
            if($required&&$status==='published'&&!$this->db->run('SELECT id FROM exams WHERE course_id=? LIMIT 1',[$id])->fetchColumn())$status='draft';
            $this->db->run('UPDATE courses SET title=?,category=?,description=?,exam_required=?,status=?,site_id=? WHERE id=?',[$title,$category,$description,$required,$status,$site,$id]);
        }
        else{
            $site=$actor?($actor['role']==='superadmin'?Validation::number($data,'site_id',1,PHP_INT_MAX):$actorSite):(!empty($data['site_id'])?Validation::number($data,'site_id',1,PHP_INT_MAX):(int)$this->db->run('SELECT id FROM sites WHERE active=1 ORDER BY id LIMIT 1')->fetchColumn());
            if(!$site||!$this->db->run('SELECT id FROM sites WHERE id=? AND active=1',[$site])->fetchColumn())Http::fail(422,'Selecciona una sede activa para la capacitación.',['site_id'=>'Selecciona una sede activa.']);
            $this->db->run('INSERT INTO courses(site_id,created_by,creator_name,title,category,description,exam_required) VALUES(?,?,?,?,?,?,?)',[$site,$actor['id']??null,$actor['name']??'',$title,$category,$description,$requested??1]);$id=(int)$this->db->pdo->lastInsertId();
        }
        (new ActivityRepository($this->db))->course($id,'course.saved','Capacitación actualizada');
        return $this->get($id,true);
        });
    }
    public function publish(int $id): array {
        return $this->db->transaction(function()use($id){$row=$this->db->run("SELECT id,status,exam_required FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$id])->fetch();if(!$row)Http::fail(404,'Capacitación no encontrada.');
            if(!$this->db->run('SELECT id FROM files WHERE course_id=? LIMIT 1',[$id])->fetchColumn())Http::fail(422,'Agrega al menos un documento o video.');
            if((int)$row['exam_required']&&!$this->db->run('SELECT id FROM exams WHERE course_id=? LIMIT 1',[$id])->fetchColumn())Http::fail(422,'Guarda un examen con al menos una pregunta o selecciona capacitación sin examen.');
            if($row['status']==='published')return $this->get($id,true);
            $this->db->run("UPDATE courses SET status='published' WHERE id=?",[$id]);(new ActivityRepository($this->db))->course($id,'course.published','Capacitación publicada');return $this->get($id,true);
        });
    }
    public function cover(int $id,int $fileId): array {
        return $this->db->transaction(function()use($id,$fileId){
            if(!$this->db->run("SELECT id FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$id])->fetchColumn())Http::fail(404,'Capacitación no disponible.');
            if(!$this->db->run("SELECT id FROM files WHERE id=? AND course_id=? AND extension IN ('pdf','ppt','pptx') FOR UPDATE",[$fileId,$id])->fetchColumn())Http::fail(422,'Selecciona un documento de esta capacitación o carga una imagen de portada.');
            $this->db->run('UPDATE courses SET cover_file_id=?,custom_cover_id=NULL WHERE id=?',[$fileId,$id]);
            return $this->get($id,true);
        });
    }
    public function customCover(int $id,int $image): array {
        return $this->db->transaction(function()use($id,$image){
            if(!$this->db->run("SELECT id FROM courses WHERE id=? AND status<>'archived' FOR UPDATE",[$id])->fetchColumn())Http::fail(404,'Capacitación no disponible.');
            if(!$this->db->run("SELECT id FROM files WHERE id=? AND course_id IS NULL AND mime IN ('image/jpeg','image/png','image/webp')",[$image])->fetchColumn())Http::fail(422,'Selecciona una imagen válida.');
            $this->db->run('UPDATE courses SET custom_cover_id=? WHERE id=?',[$image,$id]);
            (new ActivityRepository($this->db))->course($id,'course.saved','Portada de capacitación actualizada');
            return $this->get($id,true);
        });
    }
    public function archive(int $id): array { return $this->db->transaction(function()use($id){$this->get($id,true);$this->db->run("UPDATE courses SET status='archived' WHERE id=?",[$id]);(new ActivityRepository($this->db))->course($id,'course.archived','Capacitación archivada');return ['deleted'=>true];}); }
}
