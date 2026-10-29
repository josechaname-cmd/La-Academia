<?php
declare(strict_types=1);
namespace Academia\Services;

use Academia\Support\Database;

/** Shared image upload + database save with best-effort filesystem compensation. */
final class MediaUpload
{
    public function __construct(private Database $db, private FileTool $files) {}

    public function save(?array $upload, callable $save): array
    {
        $stored = null;
        try {
            return $this->db->transaction(function () use ($upload, $save, &$stored): array {
                if ($upload !== null && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                    $image = $this->files->add($upload, null, true);
                    $stored = $this->files->get((int)$image['id']);
                }
                return $save($stored ? (int)$stored['id'] : null);
            });
        } catch (\Throwable $error) {
            if ($stored) $this->files->discardStored($stored);
            throw $error;
        }
    }
}
