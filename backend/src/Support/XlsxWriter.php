<?php
declare(strict_types=1);
namespace Academia\Support;
/** A single-sheet OOXML report, with explicit text cells to prevent formula injection. */
final class XlsxWriter {
    private static function xml(string $text): string {
        $text=preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u','',$text)??'';
        return htmlspecialchars(mb_substr($text,0,32767),ENT_XML1|ENT_QUOTES,'UTF-8');
    }
    public static function date(?string $value): ?array {
        if(!$value)return null;
        // Excel stores local wall-clock dates, independent of the machine's time zone.
        $date=new \DateTimeImmutable($value,new \DateTimeZone('UTC'));
        return ['value'=>$date->getTimestamp()/86400+25569,'style'=>2];
    }
    public static function build(array $rows,int $headerRow=7): string {
        $columns=max([9,...array_map('count',$rows)]);$last='';for($n=$columns;$n>0;$n=intdiv($n-1,26))$last=chr(65+($n-1)%26).$last;
        $sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="'.$headerRow.'" topLeftCell="A'.($headerRow+1).'" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="3" width="17" customWidth="1"/><col min="4" max="5" width="26" customWidth="1"/><col min="6" max="7" width="14" customWidth="1"/><col min="8" max="'.$columns.'" width="23" customWidth="1"/></cols><sheetData>';
        foreach($rows as $index=>$values){
            $number=$index+1;$sheet.='<row r="'.$number.'"'.($number===$headerRow||$number===2?' ht="32" customHeight="1"':'').'>';
            foreach($values as $column=>$value){
                $letters='';for($n=$column+1;$n>0;$n=intdiv($n-1,26))$letters=chr(65+($n-1)%26).$letters;
                $style=$number===$headerRow||$number===1?1:0;
                if(is_array($value)){$style=$value['style'];$value=$value['value'];}
                $cell='<c r="'.$letters.$number.'" s="'.$style.'"';
                $sheet.=$value===null?$cell.'/>':(is_int($value)||is_float($value)?$cell.'><v>'.$value.'</v></c>':$cell.' t="inlineStr"><is><t xml:space="preserve">'.self::xml((string)$value).'</t></is></c>');
            }$sheet.='</row>';
        }
        $sheet.='</sheetData><autoFilter ref="A'.$headerRow.':'.$last.max($headerRow,count($rows)).'"/><mergeCells count="2"><mergeCell ref="A1:'.$last.'1"/><mergeCell ref="B2:'.$last.'2"/></mergeCells></worksheet>';
        return self::zip([
            '[Content_Types].xml'=>'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
            '_rels/.rels'=>'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml'=>'<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resultados" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels'=>'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
            'xl/styles.xml'=>'<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123B5D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
            'xl/worksheets/sheet1.xml'=>$sheet,
        ]);
    }
    /** ZIP/deflate using zlib, so export also works on XAMPP without ext-zip. */
    private static function zip(array $files): string {
        $body='';$central='';
        foreach($files as $name=>$data){
            $compressed=gzdeflate($data);if($compressed===false)throw new \RuntimeException('No se pudo comprimir el reporte.');
            $crc=crc32($data);$size=strlen($data);$packed=strlen($compressed);$length=strlen($name);$offset=strlen($body);
            $body.=pack('VvvvvvVVVvv',0x04034b50,20,0,8,0,33,$crc,$packed,$size,$length,0).$name.$compressed;
            $central.=pack('VvvvvvvVVVvvvvvVV',0x02014b50,20,20,0,8,0,33,$crc,$packed,$size,$length,0,0,0,0,0,$offset).$name;
        }
        return $body.$central.pack('VvvvvVVv',0x06054b50,0,0,count($files),count($files),strlen($central),strlen($body),0);
    }
}
