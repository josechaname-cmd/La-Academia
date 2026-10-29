"""Check PHP/JS syntax, module paths, Markdown links and unexpected legacy names."""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parents[1]
counts = {"PHP": 0, "JavaScript": 0, "imports": 0, "Markdown links": 0}
for file in [p for directory in ("backend", "public", "tests") for p in (root / directory).rglob("*.php")]:
    subprocess.run([r"C:\xampp\php\php.exe", "-l", str(file)], check=True, capture_output=True)
    counts["PHP"] += 1
for file in (root / "public").rglob("*.js"):
    subprocess.run(["node", "--input-type=module", "--check"], input=file.read_bytes(), check=True, capture_output=True)
    counts["JavaScript"] += 1
    for imported in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", file.read_text(encoding="utf-8")):
        if imported.startswith("."):
            target = (file.parent / imported.split("?")[0]).resolve()
            assert target.is_file(), f"Missing {target} imported by {file}"
            counts["imports"] += 1
for file in [root / "README.md", *(root / "docs").rglob("*.md")]:
    for target in re.findall(r"\]\(([^)]+)\)", file.read_text(encoding="utf-8")):
        if not re.match(r"[a-z]+:", target):
            assert (file.parent / target.split("#")[0]).is_file(), f"Broken link {target} in {file}"
            counts["Markdown links"] += 1
assert not list(root.glob("*.php")), "No debe haber PHP suelto en la raíz del proyecto"
assert [p.relative_to(root / "public").as_posix() for p in (root / "public").rglob("*.php")] == ["index.php"]
for directory in ["public/frontend", "backend/src"]:
    for file in (root / directory).rglob("*"):
        if file.is_file():
            assert not re.search(r"acea_capa|_mockup|ui/services|api/index", file.read_text(encoding="utf-8")), file
for file in (root / "backend/src").rglob("*.php"):
    namespace = re.search(r"namespace (Academia\\[^;]+);", file.read_text(encoding="utf-8")).group(1)
    expected = namespace.replace("Academia\\", "").replace("\\", "/") + "/" + file.name
    assert file.relative_to(root / "backend/src").as_posix() == expected, file
print("OK " + ", ".join(f"{n} {label}" for label, n in counts.items()))
