<?php
declare(strict_types=1);

namespace Academia\Services;

use Academia\Repositories\PersonnelRepository;
use Academia\Support\Http;

final class PersonnelImportTool
{
    public function __construct(private PersonnelRepository $personnel, private array $config) {}

    public function import(array $upload, int $defaultSite = 0, bool $preview = false, ?string $expectedToken = null): array
    {
        if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($upload['tmp_name'] ?? ''))) {
            Http::fail(422, 'Selecciona un archivo de colaboradores válido.', ['file' => 'Adjunta un CSV o XLSX.']);
        }
        if ((int) ($upload['size'] ?? 0) < 1 || (int) $upload['size'] > 8 * 1024 * 1024) {
            Http::fail(422, 'El archivo debe pesar como máximo 8 MB.', ['file' => 'Selecciona un archivo de hasta 8 MB.']);
        }
        $extension = strtolower(pathinfo((string) ($upload['name'] ?? ''), PATHINFO_EXTENSION));
        if (!in_array($extension, ['csv', 'xlsx'], true)) {
            Http::fail(422, 'Formato no permitido. Usa CSV o XLSX.', ['file' => 'Formatos permitidos: CSV y XLSX.']);
        }
        $directory = $this->temporaryDirectory();
        $source = $directory.'/personal.'.$extension;
        try {
            if (!move_uploaded_file((string) $upload['tmp_name'], $source)) Http::fail(500, 'No se pudo preparar el archivo para importar.');
            return $this->importFile($source, $defaultSite, $preview, $expectedToken);
        } finally {
            $this->removeDirectory($directory);
        }
    }

    public function importFile(string $path, int $defaultSite = 0, bool $preview = false, ?string $expectedToken = null): array
    {
        if (!is_file($path)) Http::fail(422, 'No se encontró el archivo de colaboradores.');
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $csv = $extension === 'xlsx' ? $this->convertToCsv($path) : $path;
        return $this->personnel->importRows($this->readRows($csv), $defaultSite, $preview, $expectedToken);
    }

    private function temporaryDirectory(): string
    {
        $directory = rtrim(sys_get_temp_dir(), '/\\').DIRECTORY_SEPARATOR.'la-academia-personnel-'.bin2hex(random_bytes(8));
        if (!mkdir($directory, 0700, true)) Http::fail(500, 'No se pudo preparar la importación.');
        return str_replace('\\', '/', $directory);
    }

    private function convertToCsv(string $source): string
    {
        $office = (string) ($this->config['soffice'] ?? '');
        if (!is_file($office)) Http::fail(503, 'No está disponible el lector de Excel. Usa un archivo CSV.');
        $directory = str_replace('\\', '/', dirname($source));
        $profile = $directory.'/office-profile';
        if (!mkdir($profile, 0700, true) && !is_dir($profile)) Http::fail(500, 'No se pudo preparar el lector de Excel.');
        if (!is_dir($profile.'/user')) mkdir($profile.'/user', 0700);
        file_put_contents($profile.'/user/registrymodifications.xcu', '<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>');
        $args = [$office, '-env:UserInstallation=file:///'.str_replace(' ', '%20', $profile), '--headless', '--norestore', '--nodefault', '--convert-to', 'csv', '--outdir', $directory, $source];
        $log = $directory.'/conversion.log';
        $process = proc_open($args, [0 => ['file', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null', 'r'], 1 => ['file', $log, 'w'], 2 => ['file', $log, 'a']], $pipes, null, null, ['bypass_shell' => true, 'create_no_window' => true]);
        if (!is_resource($process)) Http::fail(500, 'No se pudo iniciar el lector de Excel.');
        $started = time();
        do {
            $state = proc_get_status($process);
            if (!$state['running']) { $exit = $state['exitcode']; break; }
            if (time() - $started > 45) { proc_terminate($process); proc_close($process); Http::fail(422, 'El Excel excedió el tiempo de lectura.'); }
            usleep(100000);
        } while (true);
        proc_close($process);
        $csv = $directory.'/'.pathinfo($source, PATHINFO_FILENAME).'.csv';
        if (($exit ?? -1) !== 0 || !is_file($csv) || filesize($csv) < 1) Http::fail(422, 'No se pudo leer el Excel. Comprueba que no esté dañado o protegido.');
        return $csv;
    }

    private function readRows(string $path): array
    {
        $lines = file($path, FILE_IGNORE_NEW_LINES);
        if ($lines === false || $lines === []) Http::fail(422, 'El archivo está vacío.');
        $sample = implode("\n", array_slice($lines, 0, 10));
        $delimiter = ',';
        foreach ([',' , ';', "\t"] as $candidate) if (substr_count($sample, $candidate) > substr_count($sample, $delimiter)) $delimiter = $candidate;
        $rows = [];
        $handle = fopen($path, 'rb');
        if ($handle === false) Http::fail(422, 'No se pudo leer el archivo.');
        try {
            // fgetcsv respects quoted separators and embedded newlines.
            while (($row = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
                if ($row === [null]) continue;
                $rows[] = array_map(static function ($value): string {
                    $value = (string)$value;
                    if (!mb_check_encoding($value, 'UTF-8')) $value = mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
                    return trim($value);
                }, $row);
            }
        } finally { fclose($handle); }
        $headerIndex = null; $columns = [];
        foreach (array_slice($rows, 0, 25, true) as $index => $row) {
            $normalized = array_map([$this, 'normalize'], $row);
            foreach ($normalized as $column => $name) {
                if (in_array($name, ['dni', 'documento', 'numerodedocumento'], true)) $columns['dni'] = $column;
                elseif (in_array($name, ['apellidosynombres', 'nombrecompleto', 'nombresyapellidos'], true)) $columns['name'] = $column;
                elseif (in_array($name, ['cargo', 'puesto', 'puestodetrabajo'], true)) $columns['job_title'] = $column;
                elseif (in_array($name, ['sede', 'local', 'centrodetrabajo'], true)) $columns['site'] = $column;
            }
            if (isset($columns['dni'], $columns['name'], $columns['job_title'])) { $headerIndex = $index; break; }
            $columns = [];
        }
        if ($headerIndex === null) Http::fail(422, 'No se encontraron las columnas DNI, nombre completo y cargo.');
        $result = [];
        foreach (array_slice($rows, $headerIndex + 1) as $offset => $row) {
            $dniRaw = trim((string) ($row[$columns['dni']] ?? ''));
            $dni = preg_match('/^(\d{8})[.,]0+$/', $dniRaw, $match) ? $match[1] : $dniRaw;
            $name = trim((string) ($row[$columns['name']] ?? ''));
            $job = trim((string) ($row[$columns['job_title']] ?? ''));
            $site = isset($columns['site']) ? trim((string) ($row[$columns['site']] ?? '')) : '';
            if ($dni === '' && $name === '' && $job === '') continue;
            $result[] = ['dni' => $dni, 'name' => $name, 'job_title' => $job, 'site' => $site, '_row' => $headerIndex + $offset + 2];
        }
        return $result;
    }

    private function normalize(string $value): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', mb_strtolower(trim($value), 'UTF-8'));
        return preg_replace('/[^a-z0-9]+/', '', $ascii === false ? $value : $ascii);
    }

    private function removeDirectory(string $directory): void
    {
        if (!is_dir($directory) || !str_starts_with(str_replace('\\', '/', $directory), str_replace('\\', '/', rtrim(sys_get_temp_dir(), '/\\')).'/la-academia-personnel-')) return;
        foreach (array_diff(scandir($directory) ?: [], ['.', '..']) as $name) {
            $path = $directory.'/'.$name;
            if (is_dir($path)) $this->removeDirectory($path); else @unlink($path);
        }
        @rmdir($directory);
    }
}
