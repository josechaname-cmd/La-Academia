<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/bootstrap.php';
use Academia\Services\SliderImages;

$directory = sys_get_temp_dir() . '/academia-slider-' . bin2hex(random_bytes(6));
mkdir($directory);
$fixture = $directory . '/fixture.jpeg';
file_put_contents($fixture, base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkqKKK+oPiz//Z'));
$checks = 0;
function verify(bool $condition, string $label): void {
    global $checks;
    if (!$condition) throw new RuntimeException($label);
    $checks++;
}
try {
    $fixtureBytes = file_get_contents($fixture);
    unlink($fixture);
    $reader = new SliderImages($directory);
    verify($reader->list() === [], 'Empty folder');
    verify((new SliderImages($directory . '/missing'))->list() === [], 'Missing folder');
    foreach (['10-final.JPG', '02-capacitación & equipo.jpg', '01-inicio.jpg'] as $name) file_put_contents($directory . '/' . $name, $fixtureBytes);
    file_put_contents($directory . '/03-falso.jpg', 'not an image');
    file_put_contents($directory . '/04.svg', '<svg/>');
    file_put_contents($directory . '/.hidden.jpg', $fixtureBytes);
    file_put_contents($directory . '/wrong.png', $fixtureBytes);
    mkdir($directory . '/05-subfolder.jpg');
    $images = $reader->list();
    verify(count($images) === 3, 'Only real supported raster images, no subdirectories');
    verify(str_starts_with($images[0]['image'], 'assets/slider/01-inicio.jpg?v='), 'Natural order');
    verify(str_starts_with($images[1]['image'], 'assets/slider/02-capacitaci%C3%B3n%20%26%20equipo.jpg?v='), 'Encoded URL');
    verify($images[1]['alt'] === 'capacitación & equipo', 'Readable accessible label');
    verify($images[0]['width'] > 0 && $images[0]['height'] > 0, 'Actual dimensions');
    $old = $images[0]['image'];
    touch($directory . '/01-inicio.jpg', time()+60);
    clearstatcache();
    verify($reader->list()[0]['image'] !== $old, 'Replacement refreshes URL version');
    unlink($directory . '/01-inicio.jpg');
    verify(count($reader->list()) === 2, 'Removal is discovered');
    file_put_contents($directory . '/06-new.jpg', $fixtureBytes);
    verify(count($reader->list()) === 3, 'New file is discovered without config');
    echo "OK $checks verificaciones de carpeta del slider.\n";
} finally {
    foreach (new DirectoryIterator($directory) as $entry) {
        if ($entry->isDot()) continue;
        if ($entry->isDir()) rmdir($entry->getPathname());
        else unlink($entry->getPathname());
    }
    rmdir($directory);
}
