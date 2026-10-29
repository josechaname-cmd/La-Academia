<?php
declare(strict_types=1);
namespace Academia\Exceptions;

/** Only these operator-facing conversion diagnostics may leave the backend. */
final class PreviewException extends \RuntimeException
{
    public const GENERIC = 'No se pudo generar la portada. Revisa el archivo y reintenta.';
    private const MESSAGES = [
        'No se pudo iniciar el conversor.', 'El archivo excedió el tiempo de procesamiento.',
        'No se pudo convertir el archivo. Comprueba que no esté dañado ni protegido.',
        'Referencia de material no válida.', 'No se encuentra el archivo original.',
        'Falta configurar el conversor de PDF.', 'No se pudo preparar el PDF.',
        'Falta configurar LibreOffice para PowerPoint.', 'No se pudo convertir la presentación.',
        'No se pudo guardar la vista previa.', 'No se pudo generar la primera página.',
        'No se pudo guardar la portada.', 'Procesamiento interrumpido. Puedes reintentar.',
        'Este archivo no tiene vista previa.',
    ];

    public static function publicMessage(?string $message): ?string
    {
        return $message === null ? null : (in_array($message, self::MESSAGES, true) ? $message : self::GENERIC);
    }
}
