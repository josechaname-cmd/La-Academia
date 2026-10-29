<?php
declare(strict_types=1);

namespace Academia\Repositories;

use Academia\Support\Database;
use Academia\Support\Http;
use Academia\Support\Validation;

final class PersonnelRepository
{
    public function __construct(private Database $db) {}

    public function list(): array
    {
        return array_map(fn(array $person): array => $person + ['revision'=>$this->revision($person)], $this->db->run('SELECT e.dni,e.full_name AS name,e.job_title,e.active,e.site_id,s.name site_name,e.updated_at FROM employees e LEFT JOIN sites s ON s.id=e.site_id ORDER BY e.active DESC,s.name,e.full_name')->fetchAll());
    }

    private function revision(array $person): string
    {
        return hash('sha256', json_encode(array_map(static fn($key): string => (string)($person[$key] ?? ''), ['dni','name','job_title','active','site_id','updated_at']), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    private function dni(array $data): string
    {
        $dni = Validation::text($data, 'dni', 8, 8);
        if (!preg_match('/^[0-9]{8}$/D', $dni)) Http::fail(422, 'DNI no válido.', ['dni'=>'Escribe exactamente 8 dígitos.']);
        return $dni;
    }

    private function current(string $dni): array|false
    {
        return $this->db->run('SELECT dni,full_name AS name,job_title,active,site_id,updated_at FROM employees WHERE dni=? FOR UPDATE', [$dni])->fetch();
    }

    private function checkRevision(array $person, array $data): void
    {
        $revision = Validation::text($data, 'revision', 64, 64);
        if (!hash_equals($this->revision($person), $revision)) Http::fail(409, 'El trabajador cambió desde que abriste sus datos. Actualiza el directorio y vuelve a intentarlo.');
    }

    public function save(array $data, bool $updating = false): array
    {
        $dni = $this->dni($data);
        $name = Validation::text($data, 'name', 3, 120);
        $job = Validation::text($data, 'job_title', 1, 160);
        $siteId = Validation::number($data, 'site_id', 1, PHP_INT_MAX);
        $active = Validation::number($data, 'active', 0, 1);
        return $this->db->transaction(function () use ($data, $dni, $name, $job, $siteId, $active, $updating): array {
            // Keep the same lock order as imports and account edits: site, accounts, employee.
            $site = $this->db->run('SELECT id,active FROM sites WHERE id=? FOR UPDATE', [$siteId])->fetch();
            if (!$site) Http::fail(422, 'La sede seleccionada no existe.', ['site_id'=>'Selecciona una sede activa.']);
            $this->db->run('SELECT id FROM admins WHERE dni=? ORDER BY id FOR UPDATE', [$dni])->fetchAll();
            $person = $this->current($dni);
            if ($updating && !$person) Http::fail(404, 'Trabajador no encontrado.');
            if (!$updating && $person) Http::fail(409, 'Este DNI ya está registrado. Búscalo para editarlo o reactivarlo.', ['dni'=>'Ya existe un trabajador con este DNI.']);
            if ($updating) $this->checkRevision($person, $data);
            if (!(int)$site['active'] && ($active || !$person || (int)$person['site_id'] !== $siteId)) Http::fail(422, 'Selecciona una sede activa.', ['site_id'=>'Esta sede está inactiva.']);
            if ($updating) $this->db->run('UPDATE employees SET full_name=?,job_title=?,site_id=?,active=? WHERE dni=?', [$name,$job,$siteId,$active,$dni]);
            else $this->db->run('INSERT INTO employees(dni,full_name,job_title,site_id,active) VALUES(?,?,?,?,?)', [$dni,$name,$job,$siteId,$active]);
            $this->syncRelated([$dni]);
            return ['dni'=>$dni];
        });
    }

    /** Logical deletion preserves examination history and permits an explicit reactivation. */
    public function remove(array $data): array
    {
        $dni = $this->dni($data);
        return $this->db->transaction(function () use ($dni, $data): array {
            $this->db->run('SELECT id FROM admins WHERE dni=? ORDER BY id FOR UPDATE', [$dni])->fetchAll();
            $person = $this->current($dni);
            if (!$person) Http::fail(404, 'Trabajador no encontrado.');
            $this->checkRevision($person, $data);
            $this->db->run('UPDATE employees SET active=0 WHERE dni=?', [$dni]);
            $this->syncRelated([$dni]);
            return ['dni'=>$dni, 'active'=>0];
        });
    }

    private function siteKey(string $name): string
    {
        $name = strtr(mb_strtolower(trim($name), 'UTF-8'), ['á'=>'a','à'=>'a','ä'=>'a','é'=>'e','è'=>'e','ë'=>'e','í'=>'i','ì'=>'i','ï'=>'i','ó'=>'o','ò'=>'o','ö'=>'o','ú'=>'u','ù'=>'u','ü'=>'u','ñ'=>'n']);
        return trim(preg_replace('/\s+/u', ' ', $name));
    }

    public function importRows(array $rows, int $defaultSite = 0, bool $preview = false, ?string $expectedToken = null): array
    {
        $sites = $this->db->run('SELECT id,name FROM sites WHERE active=1 ORDER BY name')->fetchAll();
        $byName = []; $byId = [];
        foreach ($sites as $site) { $byName[$this->siteKey($site['name'])][] = (int)$site['id']; $byId[(int)$site['id']] = $site['name']; }
        if ($defaultSite && !isset($byId[$defaultSite])) Http::fail(422, 'Selecciona una sede activa para la importación.', ['site_id' => 'Selecciona una sede activa.']);
        $people = \Academia\Validators\PersonnelRows::validate($rows);
        foreach ($people as &$person) {
            $siteName = $this->siteKey($person['site']);
            if ($siteName !== '' && !isset($byName[$siteName])) Http::fail(422, 'La sede «'.$person['site'].'» indicada en la fila '.$person['_row'].' no existe o está inactiva.', ['file'=>'Corrige la sede o regístrala antes de importar.']);
            if ($siteName !== '' && count($byName[$siteName]) !== 1) Http::fail(422, 'La sede de la fila '.$person['_row'].' coincide con varias sedes. Revisa sus nombres.', ['file'=>'La sede debe identificar un único registro.']);
            if ($siteName === '' && !$defaultSite) Http::fail(422, 'La fila '.$person['_row'].' no indica sede.', ['site_id'=>'Selecciona expresamente una sede para las filas sin sede o complétala en el archivo.']);
            $person['site_id'] = $siteName === '' ? $defaultSite : $byName[$siteName][0];
            $person['site_name'] = $byId[$person['site_id']];
            $person['uses_default'] = $siteName === '';
        }
        unset($person);
        ksort($people, SORT_STRING);
        return $this->db->transaction(function () use ($people, $byId, $preview, $expectedToken): array {
            // All importers and account edits acquire site locks before account/person locks.
            $assigned = array_unique(array_column($people, 'site_id'));
            sort($assigned, SORT_NUMERIC);
            foreach ($assigned as $siteId) {
                $siteName = $this->db->run('SELECT name FROM sites WHERE id=? AND active=1 FOR UPDATE', [$siteId])->fetchColumn();
                $expectedName = $byId[$siteId];
                if (!$siteName || $siteName !== $expectedName) Http::fail(409, 'Una sede cambió. Revisa nuevamente la importación.');
            }
            $accounts = $this->db->run("SELECT id,dni,name,job_title,site_id,active,auth_version FROM admins WHERE role='capacitador' ORDER BY id FOR UPDATE")->fetchAll();
            $linkedAccounts = array_values(array_filter($accounts, static fn(array $account): bool => isset($people[$account['dni']])));
            $created = 0; $updated = 0; $siteIds = []; $current = []; $transfers = []; $sample = []; $defaults = 0; $reactivated = 0;
            foreach ($people as $dni => $person) {
                $exists = $this->current((string)$dni);
                $current[$dni] = $exists ? $this->revision($exists) : null;
                $exists ? $updated++ : $created++;
                if ($exists && !(int)$exists['active']) $reactivated++;
                if ($exists && (int)$exists['site_id'] !== $person['site_id']) $transfers[] = ['dni'=>(string)$dni,'name'=>$person['name'],'from_site_id'=>$exists['site_id'],'to_site'=>$person['site_name']];
                if ($person['uses_default']) $defaults++;
                if (!isset($siteIds[$person['site_id']])) $siteIds[$person['site_id']] = ['name'=>$person['site_name'],'total'=>0];
                $siteIds[$person['site_id']]['total']++;
                if (count($sample) < 100) $sample[] = ['dni'=>(string)$dni,'name'=>$person['name'],'site_name'=>$person['site_name'],'uses_default'=>$person['uses_default'],'action'=>$exists?'Actualizar':'Crear'];
            }
            $token = hash('sha256', json_encode([$people,$current,$linkedAccounts], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $summary = ['total'=>count($people),'created'=>$created,'updated'=>$updated,'sites'=>count($siteIds),'site_totals'=>array_values($siteIds),'defaulted'=>$defaults,'reactivated'=>$reactivated,'linked_accounts'=>count($linkedAccounts),'transfer_count'=>count($transfers),'transfers'=>array_slice($transfers,0,100),'sample'=>$sample,'preview_token'=>$token];
            if ($preview) return $summary;
            if ($expectedToken !== null && !hash_equals($token, $expectedToken)) Http::fail(409, 'El archivo, las sedes, los trabajadores o sus accesos cambiaron. Valida el archivo nuevamente antes de confirmar.');
            foreach ($people as $dni => $person) {
                $this->db->run('INSERT INTO employees(dni,full_name,job_title,site_id,active) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),job_title=VALUES(job_title),site_id=VALUES(site_id),active=1', [$dni, $person['name'], $person['job_title'], $person['site_id']]);
            }
            $this->syncRelated(array_keys($people));
            return $summary;
        });
    }

    /** Explicit legacy CLI replacement: absent employees become inactive; sites are preserved. */
    public function replaceRows(array $rows): int
    {
        $people = \Academia\Validators\PersonnelRows::validate($rows);
        ksort($people, SORT_STRING);
        return $this->db->transaction(function () use ($people): int {
            $this->db->run('SELECT id FROM sites ORDER BY id FOR UPDATE')->fetchAll();
            $accounts = $this->db->run('SELECT dni,site_id,role,active FROM admins ORDER BY id FOR UPDATE')->fetchAll();
            $employees = $this->db->run('SELECT dni,site_id FROM employees ORDER BY dni FOR UPDATE')->fetchAll(\PDO::FETCH_KEY_PAIR);
            foreach ($accounts as $account) {
                if ($account['role'] !== 'capacitador' || !(int)$account['active']) continue;
                $dni = $account['dni'];
                if (!isset($people[$dni], $employees[$dni]) || (int)$employees[$dni] !== (int)$account['site_id']) {
                    Http::fail(409, 'El reemplazo dejaría un capacitador activo sin colaborador de su sede. Revisa primero su acceso.');
                }
            }
            $this->db->run('UPDATE employees SET active=0');
            foreach ($people as $dni => $person) {
                $this->db->run('INSERT INTO employees(dni,full_name,job_title,active) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),job_title=VALUES(job_title),active=1', [$dni, $person['name'], $person['job_title']]);
            }
            $this->syncRelated(array_keys($people));
            return count($people);
        });
    }

    /** Both individual edits and imports update the same linked data atomically. */
    private function syncRelated(array $dnis): void
    {
        foreach (array_chunk($dnis, 500) as $batch) {
            $marks = implode(',', array_fill(0, count($batch), '?'));
            // Invalidate sessions before assigning the new site/status. Re-enabling an
            // employee never re-enables a separately disabled administrative account.
            $this->db->run("UPDATE admins a JOIN employees p ON p.dni=a.dni SET a.auth_version=a.auth_version+1 WHERE a.role='capacitador' AND p.dni IN ($marks) AND (NOT(a.site_id <=> p.site_id) OR (p.active=0 AND a.active=1))", $batch);
            $this->db->run("UPDATE admins a JOIN employees p ON p.dni=a.dni SET a.name=p.full_name,a.job_title=p.job_title,a.site_id=p.site_id,a.active=IF(p.active=0,0,a.active) WHERE a.role='capacitador' AND p.dni IN ($marks)", $batch);
            $this->db->run("UPDATE enrollments e JOIN employees p ON p.dni=e.dni SET e.name=p.full_name,e.job_title=p.job_title WHERE p.dni IN ($marks)", $batch);
        }
    }

    public function findActive(string $dni): array
    {
        $person = $this->db->run(
            'SELECT e.full_name AS name,e.job_title,e.site_id,s.name site_name FROM employees e LEFT JOIN sites s ON s.id=e.site_id WHERE e.dni=? AND e.active=1',
            [$dni]
        )->fetch();

        if (!$person) {
            Http::fail(404, 'El DNI no figura en la base de colaboradores.', [
                'dni' => 'Verifica el número o solicita la actualización de tus datos.',
            ]);
        }

        return $person;
    }
}
