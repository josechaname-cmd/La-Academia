<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Repositories\CourseRepository;
use Academia\Support\Database;
final class CourseCreationTool {
    public function __construct(private Database $db,private CourseRepository $courses,private FileTool $files) {}
    public function uploadCover(int $id,array $upload): array {
        $stored=null;
        try{return $this->db->transaction(function()use($id,$upload,&$stored){
            $this->courses->get($id,true);
            $image=$this->files->add($upload,null,true);$stored=$this->files->get((int)$image['id']);
            return $this->courses->customCover($id,(int)$image['id']);
        });}catch(\Throwable $error){if($stored)$this->files->discardStored($stored);throw $error;}
    }
    public function create(array $data,array $upload,array $actor=[]): array {
        $stored=null;
        try {
            return $this->db->transaction(function()use($data,$upload,$actor,&$stored){
                $course=$this->courses->save($data,null,$actor);
                $file=$this->files->add($upload,(int)$course['id']);
                $stored=$this->files->get($file['id']);
                return $this->courses->get((int)$course['id'],true);
            });
        } catch(\Throwable $error) {
            if($stored)$this->files->discardStored($stored);
            throw $error;
        }
    }
}
