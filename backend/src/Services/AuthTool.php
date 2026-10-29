<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;
final class AuthTool {
    private ?array $resolvedUser=null;
    private ?string $resolvedIdentity=null;
    public function __construct(private Database $db, private array $config, bool $touch=true) {
        if (session_status()!==PHP_SESSION_ACTIVE) {
            session_name('LAACADEMIA');
            session_set_cookie_params(['httponly'=>true,'secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','samesite'=>'Strict','path'=>rtrim(dirname(Http::entryScript($_SERVER['SCRIPT_NAME']??'/la-academia/index.php')),'/').'/']);
            ini_set('session.use_strict_mode','1'); session_start();
        }
        $_SESSION['csrf']??=bin2hex(random_bytes(32));
        if (isset($_SESSION['admin']) && time()-(int)($_SESSION['last_seen']??0)>($config['session_idle_seconds']??3600)) {
            unset($_SESSION['admin'],$_SESSION['last_seen']);
            session_regenerate_id(true);
            $_SESSION['csrf']=bin2hex(random_bytes(32));
        }
        // Polling for notifications is not user activity and must not prolong a login.
        if ($touch && isset($_SESSION['admin'])) $_SESSION['last_seen']=time();
    }
    public function user(bool $refresh=false): ?array {
        $session=$_SESSION['admin']??null;if(!$session)return null;
        $identity=$session['id'].':'.($session['auth_version']??0);
        if(!$refresh&&$this->resolvedIdentity===$identity)return $this->resolvedUser;
        $user=$this->db->run('SELECT a.id,a.name,a.dni,a.job_title,a.email,a.role,a.site_id,s.name site_name,a.active,a.auth_version FROM admins a LEFT JOIN sites s ON s.id=a.site_id WHERE a.id=?',[$session['id']])->fetch();
        if(!$user||!(int)$user['active']||(int)$user['auth_version']!==(int)($session['auth_version']??0)){unset($_SESSION['admin']);$this->resolvedIdentity=null;$this->resolvedUser=null;return null;}
        $_SESSION['admin']=$user;
        unset($user['auth_version'],$user['active']);$this->resolvedIdentity=$identity;return $this->resolvedUser=$user;
    }
    public function requireAdmin(): array { return $this->user()??Http::fail(401,'Inicia sesión como capacitador.'); }
    public function requireSuperAdmin(): array { $user=$this->requireAdmin();if($user['role']!=='superadmin')Http::fail(403,'Solo superadministración puede gestionar usuarios, colaboradores y sedes.');return $user; }
    public function csrf(): void {
        if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) Http::fail(403,'La sesión cambió. Vuelve a iniciar sesión.',[],'csrf_expired');
    }
    public function session(): array {
        $user=$this->user();$empty=$user?false:!(bool)$this->db->run('SELECT id FROM admins LIMIT 1')->fetchColumn();
        return ['user'=>$user,'csrf'=>$_SESSION['csrf'],'setup_required'=>$empty,'setup_allowed'=>$empty&&$this->local()];
    }
    private function local(): bool { return in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true); }
    private function rateLimit(): void {
        // Local development: loopback logins do not consume or enforce the attempt limit.
        if ($this->local() && $this->config['local_unlimited_login']) return;
        $ip=hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown');
        $this->db->run('DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL 1 DAY');
        if ((int)$this->db->run('SELECT COUNT(*) FROM auth_attempts WHERE ip_hash=? AND created_at>NOW()-INTERVAL 15 MINUTE',[$ip])->fetchColumn()>=5) Http::fail(429,'Demasiados intentos. Espera 15 minutos.');
        $this->db->run('INSERT INTO auth_attempts(ip_hash) VALUES (?)',[$ip]);
    }
    public function setup(array $input): array {
        if (!$this->local()) Http::fail(403,'La configuración inicial debe realizarse desde este equipo.');
        $this->rateLimit();
        $name=Validation::text($input,'name',3,120);$email=strtolower(Validation::text($input,'email',5,190));$password=\Academia\Validators\Password::forCreation($input['password']??null);
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)) Http::fail(422,'Correo no válido.');
        if (!$this->db->run("SELECT GET_LOCK('la_academia_setup',5)")->fetchColumn()) Http::fail(409,'Configuración en curso.');
        try {
            if ($this->db->run('SELECT COUNT(*) FROM admins')->fetchColumn()) Http::fail(409,'Ya existe un administrador.');
            $this->db->run("INSERT INTO admins(name,email,password_hash,role) VALUES (?,?,?,'superadmin')",[$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
        } finally { $this->db->run("SELECT RELEASE_LOCK('la_academia_setup')"); }
        return $this->authenticate($email,$password,false);
    }
    public function login(array $input): array {
        $password=$input['password']??null;
        if(!is_string($password)||$password===''||strlen($password)>200)Http::fail(422,'Completa la contraseña.',['password'=>'Completa este campo.']);
        return $this->authenticate(strtolower(Validation::text($input,'email',5,190)),$password);
    }
    private function authenticate(string $email,string $password,bool $limit=true): array {
        if ($limit) $this->rateLimit();
        $user=$this->db->run('SELECT * FROM admins WHERE email=?',[$email])->fetch();
        if (!$user||!(int)$user['active']||!password_verify($password,$user['password_hash'])) Http::fail(401,'Correo o contraseña incorrectos.');
        $this->resolvedIdentity=null;
        session_regenerate_id(true);
        $_SESSION['admin']=['id'=>(int)$user['id'],'auth_version'=>(int)$user['auth_version']];
        $_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        $this->db->run('DELETE FROM auth_attempts WHERE ip_hash=?',[hash('sha256',$_SERVER['REMOTE_ADDR']??'unknown')]);
        return $this->session();
    }
    public function logout(): array { $this->resolvedIdentity=null;$this->resolvedUser=null;unset($_SESSION['admin'],$_SESSION['last_seen']);session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));return $this->session(); }
}
