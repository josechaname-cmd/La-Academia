<?php
declare(strict_types=1);
namespace Academia\Services;
use Academia\Support\Http;

/** Inspects local uploads only. No conversion, remote URLs or shell command strings. */
final class VideoInspector {
    public function __construct(private array $config) {}
    public function available(): bool {return function_exists('proc_open')&&is_file($this->config['ffprobe']??'')&&is_executable($this->config['ffprobe']);}
    public function inspect(string $path,string $extension,string $mime): array {
        $allowed=['mp4'=>['video/mp4','application/mp4'],'webm'=>['video/webm']];
        if(!isset($allowed[$extension])||!in_array($mime,$allowed[$extension],true))Http::fail(422,'El archivo no corresponde a un video MP4 o WebM válido.',['file'=>'Revisa el formato real del video.']);
        if(!$this->available())Http::fail(503,'La carga de videos aún no está habilitada en este servidor. Contacta al administrador.');
        $output=tempnam(sys_get_temp_dir(),'academy-probe-');
        if($output===false)Http::fail(503,'No se pudo preparar la validación del video.');
        $process=null;
        try{
            $args=[$this->config['ffprobe'],'-v','error','-max_alloc','67108864','-protocol_whitelist','file','-probesize','10485760','-analyzeduration','10000000','-f',$extension==='mp4'?'mov':'matroska'];
            if($extension==='mp4')array_push($args,'-enable_drefs','0','-use_absolute_path','0');
            array_push($args,'-show_entries','format=duration:stream=codec_type,codec_name,pix_fmt,width,height:stream_disposition=attached_pic','-of','json','-i',$path);
            $null=PHP_OS_FAMILY==='Windows'?'NUL':'/dev/null';
            $process=@proc_open($args,[0=>['file',$null,'r'],1=>['file',$output,'w'],2=>['file',$null,'a']],$pipes,null,null,['bypass_shell'=>true,'create_no_window'=>true]);
            if(!is_resource($process))Http::fail(503,'No se pudo iniciar la validación del video.');
            $start=microtime(true);$exit=-1;
            do{
                $state=proc_get_status($process);
                if(!$state['running']){$exit=$state['exitcode'];break;}
                clearstatcache(true,$output);
                if(microtime(true)-$start>20||filesize($output)>1024*1024){proc_terminate($process);Http::fail(422,'No se pudo validar el video a tiempo. Exporta una copia MP4 y vuelve a intentar.',['file'=>'Video demasiado complejo o dañado.']);}
                usleep(50000);
            }while(true);
            proc_close($process);$process=null;
            clearstatcache(true,$output);
            if($exit!==0||filesize($output)>1024*1024)Http::fail(422,'No se pudo leer el video. Comprueba que esté completo y no esté dañado.',['file'=>'Selecciona un video válido.']);
            $metadata=json_decode(file_get_contents($output),true);
            $streams=$metadata['streams']??[];
            $video=array_values(array_filter($streams,fn($s)=>($s['codec_type']??'')==='video'&&empty($s['disposition']['attached_pic'])));
            $audio=array_values(array_filter($streams,fn($s)=>($s['codec_type']??'')==='audio'));
            $duration=(float)($metadata['format']['duration']??0);
            if(count($video)!==1||count($audio)>1||count($streams)!==count($video)+count($audio)||!is_finite($duration)||$duration<=0||$duration>86400)Http::fail(422,'Usa un video de hasta 24 horas, con una pista de imagen y como máximo una de audio.',['file'=>'Exporta una copia sencilla del video.']);
            $v=$video[0];$a=$audio[0]['codec_name']??null;
            $validVideo=in_array($v['codec_name']??'', $extension==='mp4'?['h264']:['vp8','vp9'],true)&&in_array($v['pix_fmt']??'',['yuv420p','yuvj420p'],true);
            $validAudio=$a===null||in_array($a,$extension==='mp4'?['aac']:['opus','vorbis'],true);
            if(!$validVideo||!$validAudio)Http::fail(422,'Usa MP4 con video H.264 y audio AAC, o WebM con VP8/VP9 y Opus/Vorbis (8 bits).',['file'=>'El códec de este video no es compatible con el reproductor.']);
            $width=(int)($v['width']??0);$height=(int)($v['height']??0);
            if($width<1||$height<1||max($width,$height)>4096)Http::fail(422,'El video debe tener una resolución máxima de 4096 píxeles por lado.',['file'=>'Exporta el video en 1080p o menor para una carga más rápida.']);
            return ['duration_seconds'=>round($duration,3),'video_width'=>$width,'video_height'=>$height,'video_codec'=>$v['codec_name'],'audio_codec'=>$a];
        }finally{if(is_resource($process)){proc_terminate($process);proc_close($process);}@unlink($output);}
    }
}
