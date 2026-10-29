<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Validation;

final class ExamPolicy {
    public static function validate(array $input): array {
        return [
            'max_attempts'=>Validation::number($input,'max_attempts',1,10),
            'passing_score'=>Validation::number($input,'passing_score',1,20),
        ];
    }
    public static function settings(array $exam,int $fallback=2): array {
        return ['max_attempts'=>(int)($exam['max_attempts']??$fallback),'passing_score'=>isset($exam['passing_score'])?(int)$exam['passing_score']:null];
    }
    public static function reachedTarget(array $grade): bool {
        // Compare counts, not a rounded grade/percentage: exactly 90% also ends retries.
        return $grade['correct']*10>=count($grade['review'])*9;
    }
    public static function passed(mixed $score,mixed $minimum): ?bool {
        return $score===null||$minimum===null?null:(float)$score>=(float)$minimum;
    }
}
