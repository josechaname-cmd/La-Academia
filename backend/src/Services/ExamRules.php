<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Http;
use Academia\Support\Validation;
final class ExamRules {
    public function validate(mixed $questions): array {
        if(!is_array($questions)||!array_is_list($questions)||count($questions)<1)Http::fail(422,'El examen debe tener al menos una pregunta.');
        $valid=[];$prompts=[];
        foreach($questions as $question){
            if(!is_array($question))Http::fail(422,'Pregunta no válida.');
            $prompt=Validation::text($question,'prompt',8,500);$key=mb_strtolower($prompt);if(isset($prompts[$key]))Http::fail(422,'Las preguntas no pueden repetirse.');$prompts[$key]=true;
            $choices=$question['choices']??null;if(!is_array($choices)||!array_is_list($choices)||count($choices)!==3)Http::fail(422,'Cada pregunta necesita tres alternativas.');
            $choices=array_map(fn($choice)=>Validation::text(['choice'=>$choice],'choice',1,300),$choices);
            if(count(array_unique(array_map('mb_strtolower',$choices)))!==3)Http::fail(422,'Las alternativas deben ser diferentes.');
            $correct=Validation::number($question,'correct',0,2);$explanation=isset($question['explanation'])?Validation::text($question,'explanation',0,1000):'';
            $valid[]=['prompt'=>$prompt,'choices'=>$choices,'correct'=>$correct,'explanation'=>$explanation];
        }return $valid;
    }
    public function publicQuestions(array $questions): array { return array_map(fn($q)=>['prompt'=>$q['prompt'],'choices'=>$q['choices']],$questions); }
    public function score(array $questions,mixed $answers): array {
        if(!is_array($answers)||!array_is_list($answers)||!count($questions)||count($answers)!==count($questions))Http::fail(422,'Responde todas las preguntas del examen.');
        $correct=0;$review=[];
        foreach($questions as $i=>$q){if(!is_int($answers[$i])||$answers[$i]<0||$answers[$i]>2)Http::fail(422,'Selecciona una alternativa válida en cada pregunta.');$ok=$answers[$i]===$q['correct'];$correct+=(int)$ok;$review[]=['prompt'=>$q['prompt'],'selected'=>$q['choices'][$answers[$i]],'answer'=>$q['choices'][$q['correct']],'correct'=>$ok,'explanation'=>$q['explanation']];}
        $score=round($correct*20/count($questions),2);
        return ['score'=>floor($score)===$score?(int)$score:$score,'correct'=>$correct,'review'=>$review];
    }
}
