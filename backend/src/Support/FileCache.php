<?php
declare(strict_types=1);
namespace Academia\Support;

/** Private, bounded per-key cache. Errors fall back to the database, never stale data. */
final class FileCache {
    public function __construct(private string $directory) {}

    private function ready(): bool {
        return is_dir($this->directory) || @mkdir($this->directory, 0700, true);
    }

    private function generation(): string {
        $handle=@fopen($this->directory.'/generation','c+');
        if(!$handle)return '';
        try{flock($handle,LOCK_SH);return trim(stream_get_contents($handle));}
        finally{flock($handle,LOCK_UN);fclose($handle);}
    }

    public function invalidate(): void {
        if ($this->ready()) @file_put_contents($this->directory.'/generation', bin2hex(random_bytes(16)), LOCK_EX);
    }

    public function remember(string $key, int $seconds, callable $load, ?bool &$hit = null): mixed {
        $hit = false;
        if ($seconds < 1 || !$this->ready()) return $load();
        $path = $this->directory.'/'.hash('sha256', $key).'.json';
        $handle = @fopen($path, 'c+');
        if (!$handle) return $load();
        try {
            // One producer per key; simultaneous requests reuse the completed result.
            if (!flock($handle, LOCK_EX)) return $load();
            $generation = $this->generation();
            $entry = json_decode(stream_get_contents($handle), true);
            if (is_array($entry) && ($entry['generation'] ?? null) === $generation && ($entry['expires'] ?? 0) > microtime(true) && array_key_exists('data', $entry)) {
                $hit = true;
                return $entry['data'];
            }
            $data = $load();
            // A mutation during loading must not repopulate the cache with old data.
            if ($this->generation() === $generation) {
                $json = json_encode(['generation'=>$generation, 'expires'=>microtime(true)+$seconds, 'data'=>$data], JSON_THROW_ON_ERROR);
                rewind($handle);
                ftruncate($handle, 0);
                fwrite($handle, $json);
                fflush($handle);
            }
            return $data;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
