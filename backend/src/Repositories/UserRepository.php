<?php
declare(strict_types=1);
namespace Academia\Repositories;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class UserRepository {
    public function __construct(private Database $db) {}
    public function list(): array {return $this->db->run('SELECT a.id,a.name,a.dni,a.job_title,a.email,a.role,a.active,a.site_id,a.created_at,s.name site_name FROM admins a LEFT JOIN sites s ON s.id=a.site_id ORDER BY a.active DESC,a.name')->fetchAll();}
    public function save(array $data,?int $id,int $actor): array {
        $name=Validation::text($data,'name',3,120);$email=strtolower(Validation::text($data,'email',5,190));
        if(!filter_var($email,FILTER_VALIDATE_EMAIL))Http::fail(422,'Correo no válido.');
        $role=Validation::choice($data,'role',['capacitador','superadmin']);$active=Validation::number($data,'active',0,1);
        $site=!empty($data['site_id'])?Validation::number($data,'site_id',1,PHP_INT_MAX):null;
        $dni=trim((string)($data['dni']??''));$jobTitle=trim((string)($data['job_title']??''));
        if($role==='capacitador'){
            if(!$site)Http::fail(422,'Selecciona la sede del capacitador.',['site_id'=>'Selecciona una sede.']);
            if(!preg_match('/^\d{8}$/',$dni))Http::fail(422,'Selecciona un colaborador válido.',['dni'=>'Selecciona un colaborador de la sede.']);
            $employee=$this->db->run('SELECT full_name,job_title FROM employees WHERE dni=? AND site_id=? AND active=1',[$dni,$site])->fetch();
            if(!$employee)Http::fail(422,'El colaborador no pertenece a la sede seleccionada o está inactivo.',['dni'=>'Selecciona un colaborador activo de la misma sede.']);
            $name=$employee['full_name'];$jobTitle=$employee['job_title'];
        }else{
            $dni=$dni!==''?$dni:null;
            if($dni!==null&&!preg_match('/^\d{8}$/',$dni))Http::fail(422,'DNI no válido.',['dni'=>'Escribe 8 dígitos o deja el campo vacío.']);
            if(mb_strlen($jobTitle)>160)Http::fail(422,'Cargo no válido.',['job_title'=>'Utiliza hasta 160 caracteres.']);
        }
        $password=$data['password']??'';
        if(!is_string($password))Http::fail(422,'Contraseña no válida.');
        if(!$id||$password!==''){
            $password=\Academia\Validators\Password::forCreation($password);
            $hash=password_hash($password,PASSWORD_DEFAULT);
        }else $hash=null;
        return $this->db->transaction(function()use($name,$dni,$jobTitle,$email,$role,$active,$site,$hash,$id,$actor){
            // Lock the assigned site before users to coordinate concurrent deactivation.
            if($site&&!$this->db->run('SELECT id FROM sites WHERE id=? AND active=1 FOR UPDATE',[$site])->fetchColumn())Http::fail(422,'Selecciona una sede activa.');
            $users=$this->db->run('SELECT id,role,active FROM admins ORDER BY id FOR UPDATE')->fetchAll();
            $current=null;$superCount=0;$actorValid=false;
            foreach($users as $user){if((int)$user['id']===$id)$current=$user;if($user['role']==='superadmin'&&(int)$user['active']===1){$superCount++;if((int)$user['id']===$actor)$actorValid=true;}}
            if(!$actorValid)Http::fail(403,'Solo superadministración puede gestionar usuarios.');
            if($role==='capacitador'){
                $employee=$this->db->run('SELECT full_name,job_title FROM employees WHERE dni=? AND site_id=? AND active=1 FOR UPDATE',[$dni,$site])->fetch();
                if(!$employee)Http::fail(409,'Los datos del colaborador cambiaron. Vuelve a seleccionarlo.');
                $name=$employee['full_name'];$jobTitle=$employee['job_title'];
            }
            if($id&&!$current)Http::fail(404,'Usuario no encontrado.');
            if($id===$actor&&(!$active||$role!=='superadmin'))Http::fail(409,'No puedes desactivar tu propio acceso ni quitarte el rol de superadministrador.');
            if($current&&$current['role']==='superadmin'&&(int)$current['active']===1&&(!$active||$role!=='superadmin')&&$superCount<=1)Http::fail(409,'Debe quedar al menos un superadministrador activo.');
            try{
                if($id){$this->db->run('UPDATE admins SET name=?,dni=?,job_title=?,email=?,role=?,active=?,site_id=? WHERE id=?',[$name,$dni,$jobTitle,$email,$role,$active,$site,$id]);if(!$active)$this->db->run('UPDATE admins SET auth_version=auth_version+1 WHERE id=?',[$id]);if($hash)$this->db->run('UPDATE admins SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[$hash,$id]);}
                else{$this->db->run('INSERT INTO admins(name,dni,job_title,email,password_hash,role,active,site_id) VALUES(?,?,?,?,?,?,?,?)',[$name,$dni,$jobTitle,$email,$hash,$role,$active,$site]);$id=(int)$this->db->pdo->lastInsertId();}
            }catch(\PDOException $error){if(($error->errorInfo[1]??null)===1062)Http::fail(409,str_contains($error->getMessage(),'uq_admin_dni')?'Ese colaborador ya tiene un acceso asignado.':'Ya existe un usuario con ese correo.');throw $error;}
            return ['id'=>$id];
        });
    }
}
