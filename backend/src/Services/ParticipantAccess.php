<?php
declare(strict_types=1);
namespace Academia\Services;

use Academia\Support\Database;
use Academia\Support\Http;

/** Prior identification is tied to this browser, course and DNI; no participant account. */
final class ParticipantAccess
{
    public function __construct(private Database $db, private AttemptTool $attempts) {}

    public function identify(int $courseId, array $input): array
    {
        unset($_SESSION['participant_access'][$courseId]);
        // A separate namespace keeps participant lookups independent of administrator login.
        $key = hash('sha256', 'participant:'.($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $lock = 'identify:'.substr($key, 0, 48);
        if (!$this->db->run('SELECT GET_LOCK(?,1)', [$lock])->fetchColumn()) Http::fail(429, 'Consulta en curso. Espera un momento y reintenta.');
        try {
            $this->db->run('DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL 1 DAY');
            if ((int)$this->db->run('SELECT COUNT(*) FROM auth_attempts WHERE ip_hash=? AND created_at>NOW()-INTERVAL 1 MINUTE', [$key])->fetchColumn() >= 30) {
                Http::fail(429, 'Se realizaron demasiadas consultas. Espera un minuto y vuelve a consultar.');
            }
            $this->db->run('INSERT INTO auth_attempts(ip_hash) VALUES (?)', [$key]);
        } finally {
            $this->db->run('SELECT RELEASE_LOCK(?)', [$lock]);
        }
        $person = $this->attempts->participant($courseId, $input);
        $identified = array_filter($_SESSION['participant_access'] ?? [], static fn($entry) => ($entry['expires_at'] ?? 0) > time());
        if (count($identified) >= 10) unset($identified[array_key_first($identified)]);
        $identified[$courseId] = ['dni_hash'=>hash('sha256', trim($input['dni'])), 'expires_at'=>time()+900];
        $_SESSION['participant_access'] = $identified;
        return $person;
    }

    public function start(int $courseId, array $input): array
    {
        $identified = $_SESSION['participant_access'][$courseId] ?? null;
        $dni = $input['dni'] ?? null;
        if (!is_string($dni) || !$identified || $identified['expires_at'] <= time() || !hash_equals($identified['dni_hash'], hash('sha256', trim($dni)))) {
            Http::fail(403, 'Consulta y confirma tu DNI antes de iniciar la evaluación.', ['dni'=>'Vuelve a consultar tus datos.'], 'identification_required');
        }
        // Rechecks active employee, assigned site, publication, schedule and attempt limit.
        return $this->attempts->start($courseId, $input);
    }
}
