<?php
declare(strict_types=1);
namespace Academia\Validators;

use Academia\Support\Http;

/** Shared by HTTP/CSV/XLSX and the explicit legacy CLI replacement command. */
final class PersonnelRows
{
    public static function validate(array $rows): array
    {
        $people = [];
        foreach ($rows as $index => $row) {
            if (!is_array($row)) Http::fail(422, 'Registro de colaborador no válido.');
            // Legacy JSON accepts integer DNI; never coerce floats, booleans or names.
            if (isset($row['dni']) && is_int($row['dni'])) $row['dni'] = (string)$row['dni'];
            $sourceRow = (int)($row['_row'] ?? ($index + 1));
            foreach (['dni','name','job_title','site'] as $key) {
                if (isset($row[$key]) && !is_string($row[$key])) Http::fail(422, 'Dato no válido en la fila '.$sourceRow.'.');
            }
            $dni = trim($row['dni'] ?? '');
            $name = trim($row['name'] ?? '');
            $job = trim($row['job_title'] ?? '');
            if (!preg_match('/^\d{8}$/D', $dni) || mb_strlen($name) < 3 || mb_strlen($name) > 120 || $job === '' || mb_strlen($job) > 160) {
                Http::fail(422, 'Hay datos no válidos en la fila '.$sourceRow.'.', ['file'=>'Cada fila necesita DNI de 8 dígitos, nombre completo y cargo.']);
            }
            if (isset($people[$dni])) Http::fail(422, 'Hay un DNI repetido en el archivo.', ['file'=>'Elimina los DNI duplicados.']);
            $people[$dni] = ['name'=>$name, 'job_title'=>$job, 'site'=>trim($row['site'] ?? ''), '_row'=>$sourceRow];
        }
        if ($people === []) Http::fail(422, 'La importación no contiene colaboradores.');
        return $people;
    }
}
