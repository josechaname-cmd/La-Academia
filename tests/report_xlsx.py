"""Inspect a generated workbook using an independent Excel reader; no real participant data."""
from pathlib import Path
import datetime
import subprocess
import tempfile
import zipfile
import openpyxl

with tempfile.TemporaryDirectory(prefix="academia-xlsx-") as directory:
    target = Path(directory) / "results.xlsx"
    subprocess.run([r"C:\xampp\php\php.exe", str(Path(__file__).with_name("xlsx_fixture.php")), str(target)], check=True)
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    sheet = openpyxl.load_workbook(target).active
    assert sheet.title == "Resultados" and sheet.max_row == 1207
    assert sheet["A8"].data_type == "s" and sheet["A8"].value.startswith("=HYPERLINK")
    assert sheet["B8"].value == "00123456" and sheet["B8"].data_type == "s"
    assert sheet["E8"].value == 0 and sheet["E8"].data_type == "n"
    assert sheet["E1207"].value == 20 and sheet["H8"].value is None
    assert sheet["B3"].value == datetime.datetime(2026, 10, 2, 9, 30)
    assert sheet["G8"].value == datetime.datetime(2026, 10, 2, 10, 45)
    assert sheet.freeze_panes == "A8" and sheet.auto_filter.ref == "A7:K1207"
    assert sheet["I8"].value == 14 and sheet["J8"].value == 3
    assert sheet["K8"].value == "No aprobado" and sheet["K1207"].value == "Aprobado"
    assert sheet["A7"].font.bold and sheet["A7"].fill.fgColor.rgb == "FF123B5D"
print("OK XLSX: 1200 filas, ceros, identificadores, fechas, filtro y texto sin fórmulas ejecutables.")
