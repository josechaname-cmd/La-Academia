<?php
declare(strict_types=1);
require dirname(__DIR__).'/backend/bootstrap.php';
use Academia\Support\XlsxWriter;
$rows=[['ACEAPERU · Prueba técnica'],['Curso','Seguridad & prevención'],['Apertura',XlsxWriter::date('2026-10-02 09:30:00')],['Estado','En curso'],['Participantes',1200],[],['Nombre completo','DNI','Cargo','Participación','Nota / 20','Envíos','Fecha del examen','Inicio pendiente','Nota mínima / 20','Máximo de intentos','Resultado']];
for($i=0;$i<1200;$i++)$rows[]=['=HYPERLINK("https://example.invalid")','00123456','Operador <A>','Enviado',$i===0?0:20,2,XlsxWriter::date('2026-10-02 10:45:00'),null,14,3,$i===0?'No aprobado':'Aprobado'];
file_put_contents($argv[1],XlsxWriter::build($rows));
