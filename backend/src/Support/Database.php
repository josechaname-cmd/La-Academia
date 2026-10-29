<?php
declare(strict_types=1);
namespace Academia\Support;

final class Database {
    public readonly \PDO $pdo;
    private array $effects=[];
    public function __construct(array $config) {
        $this->pdo = new \PDO('mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4', $config['db_user'], $config['db_password'], [\PDO::ATTR_ERRMODE=>\PDO::ERRMODE_EXCEPTION,\PDO::ATTR_DEFAULT_FETCH_MODE=>\PDO::FETCH_ASSOC,\PDO::ATTR_EMULATE_PREPARES=>false]);
        $this->pdo->exec("SET time_zone = '-05:00'");
    }
    public function run(string $sql, array $params = []): \PDOStatement { $stmt=$this->pdo->prepare($sql); $stmt->execute($params); return $stmt; }
    public function transaction(callable $fn): mixed {
        $nested=$this->pdo->inTransaction();$savepoint='sp_'.bin2hex(random_bytes(6));
        if($nested)$this->pdo->exec("SAVEPOINT $savepoint");else $this->pdo->beginTransaction();
        $this->effects[]=['commit'=>[],'rollback'=>[]];
        try {$result=$fn();if($nested)$this->pdo->exec("RELEASE SAVEPOINT $savepoint");else $this->pdo->commit();}
        catch(\Throwable $e){
            $effects=array_pop($this->effects);
            try{if($this->pdo->inTransaction()){if($nested)$this->pdo->exec("ROLLBACK TO SAVEPOINT $savepoint");else $this->pdo->rollBack();}}
            catch(\Throwable $rollback){Logger::failure($rollback,'database');}
            $this->complete($effects['rollback']);throw $e;
        }
        $effects=array_pop($this->effects);
        if($this->effects){
            $parent=array_key_last($this->effects);
            foreach(['commit','rollback'] as $kind)$this->effects[$parent][$kind]=array_merge($this->effects[$parent][$kind],$effects[$kind]);
        }elseif(!$nested)$this->complete($effects['commit']);
        // An external PDO transaction (test rollback) never commits filesystem effects.
        return $result;
    }
    public function afterCommit(callable $effect): void {
        if($this->effects)$this->effects[array_key_last($this->effects)]['commit'][]=$effect;
        elseif(!$this->pdo->inTransaction())$this->complete([$effect]);
    }
    public function afterRollback(callable $effect): void {
        if($this->effects)$this->effects[array_key_last($this->effects)]['rollback'][]=$effect;
    }
    private function complete(array $effects): void {
        foreach($effects as $effect){try{$effect();}catch(\Throwable $error){Logger::failure($error,'storage');}}
    }
}
