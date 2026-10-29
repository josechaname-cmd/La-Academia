<?php
declare(strict_types=1);

namespace Academia\Services;

/** Discover only valid, directly contained raster images; never accept a request path. */
final class SliderImages
{
    public function __construct(private string $directory) {}

    public function list(): array
    {
        if (!is_dir($this->directory)) {
            return [];
        }

        $names = scandir($this->directory);
        if ($names === false) {
            return [];
        }
        usort($names, static fn(string $a, string $b): int => strnatcasecmp($a, $b) ?: strcmp($a, $b));
        $images = [];

        foreach ($names as $name) {
            if (str_starts_with($name, '.') || !mb_check_encoding($name, 'UTF-8')) {
                continue;
            }
            $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $mime = match ($extension) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'webp' => 'image/webp',
                default => null,
            };
            $path = $this->directory . DIRECTORY_SEPARATOR . $name;
            if (!$mime || is_link($path) || !is_file($path)) {
                continue;
            }
            $size = filesize($path);
            if (!$size || $size > 20 * 1024 * 1024) {
                continue;
            }
            $dimensions = @getimagesize($path);
            if (!$dimensions || $dimensions['mime'] !== $mime || max($dimensions[0], $dimensions[1]) > 12000) {
                continue;
            }

            $label = preg_replace('/^\d+[\s._-]*/u', '', pathinfo($name, PATHINFO_FILENAME));
            $label = trim(str_replace(['_', '-'], ' ', $label));
            $images[] = [
                'image' => 'assets/slider/' . rawurlencode($name) . '?v=' . filemtime($path) . '-' . $size,
                'alt' => $label ?: 'Destacado de La Academia',
                'width' => $dimensions[0],
                'height' => $dimensions[1],
            ];
        }

        return $images;
    }
}
