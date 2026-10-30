<?php
declare(strict_types=1);
namespace Academia\Support;

final class ByteRange {
    /** null: ignore malformed/unsupported Range; false: valid but unsatisfiable. */
    public static function parse(string $header,int $size): array|false|null {
        if(!preg_match('/^bytes=(\d*)-(\d*)$/D',trim($header),$m)||($m[1]===''&&$m[2]===''))return null;
        if($size<=0)return false;
        if($m[1]===''){$suffix=(float)$m[2];if($suffix<=0)return false;return [max(0,$size-(int)min($size,$suffix)),$size-1];}
        $start=(float)$m[1];$end=$m[2]===''?$size-1:(float)$m[2];
        if($start>=$size||$end<$start)return false;
        return [(int)$start,(int)min($size-1,$end)];
    }
}
