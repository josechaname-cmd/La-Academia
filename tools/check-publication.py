"""Check the staged Git snapshot before sharing it. Never print secret values."""
from pathlib import Path, PurePosixPath
import hashlib
import posixpath
import re
import subprocess
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


files = [name for name in git("ls-files", "-z").decode().split("\0") if name]
allowed_roots = {"backend", "public", "tools", "tests", "docs", "storage"}
allowed_root_files = {".gitignore", ".gitattributes", ".htaccess", "README.md", "SECURITY.md"}
allowed_sql = {"backend/database/schema.sql", "docs/multisede/propuesta-esquema.sql"}
private_extensions = {".csv", ".tsv", ".xls", ".xlsx", ".doc", ".docx", ".ppt", ".pptx",
                      ".pdf", ".pem", ".key", ".p12", ".pfx", ".db", ".sqlite", ".sqlite3",
                      ".log", ".dump", ".bak", ".zip", ".7z", ".tar", ".gz", ".patch",
                      ".mp4", ".webm", ".mov", ".avi", ".mkv"}
secret_patterns = {
    "private key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{25,})\b"),
    "AWS access key": re.compile(r"\bAKIA[A-Z0-9]{16}\b"),
    "API key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}\b"),
    "credential URL": re.compile(r"https?://[^\s/:]+:[^\s/@]+@"),
}
credential_literal = re.compile(
    r'''(?i)['"]?(?:db_password|api_key|client_secret|access_token|refresh_token)['"]?\s*(?:=>|=|:)\s*['"]([^'"\r\n]+)['"]'''
)
safe_literals = {"REEMPLAZAR_EN_SERVIDOR", "unused", "synthetic", "test"}
errors = []
texts = {}
total = 0

for name in files:
    path = PurePosixPath(name)
    private = (
        (len(path.parts) == 1 and name not in allowed_root_files)
        or (len(path.parts) > 1 and path.parts[0] not in allowed_roots)
        or any(part in {"node_modules", "__pycache__", "runtime", "backups", "screenshots", "auditoria-backend"} for part in path.parts)
        or (name.startswith("storage/") and name not in {"storage/.htaccess", "storage/config.example.php"})
        or (name.startswith("public/assets/slider/") and path.name not in {".gitkeep", "LEEME.txt"})
        or path.suffix.lower() in private_extensions
        or (path.suffix.lower() == ".sql" and name not in allowed_sql)
        or path.name.startswith(".env")
        or path.name.endswith((".local.php", ".local.json"))
    )
    if private:
        errors.append(f"Private/local file: {name}")
        continue
    blob = git("show", f":{name}")
    total += len(blob)
    if len(blob) > 5_000_000:
        errors.append(f"Unexpected large file: {name}")
    if b"\0" in blob:
        if path.suffix.lower() != ".png" or not name.startswith("public/assets/image/"):
            errors.append(f"Unreviewed binary: {name}")
        continue
    try:
        text = blob.decode("utf-8-sig")
    except UnicodeError:
        errors.append(f"Non UTF-8 source: {name}")
        continue
    texts[name] = text
    for number, line in enumerate(text.splitlines(), 1):
        for label, pattern in secret_patterns.items():
            for match in pattern.finditer(line):
                # Reviewed, nonfunctional example.org URL used only to test URL rejection.
                synthetic_url = (
                    name == "tests/run.php" and label == "credential URL"
                    and "@example.org" in line and "Popup rechaza credenciales en enlace" in line
                    and hashlib.sha256(match.group(0).encode()).hexdigest()
                    == "ec25b8fa54a9d7a878a86e6f38233af24d5d27d184b396136d6d7f0251d33c19"
                )
                if not synthetic_url:
                    errors.append(f"{label}: {name}:{number}")
        for match in credential_literal.finditer(line):
            if match.group(1) not in safe_literals:
                errors.append(f"Review credential literal: {name}:{number}")

published = set(files)
for name, text in texts.items():
    if not name.endswith(".md"):
        continue
    for target in re.findall(r"\]\(([^)]+)\)", text):
        target = target.strip("<>").split("#")[0]
        if not target or re.match(r"[a-z]+:", target, re.I):
            continue
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(target)))
        if resolved not in published:
            errors.append(f"Link is not in the published snapshot: {name} -> {resolved}")

if not files:
    errors.append("No files staged. Prepare the snapshot with git add first.")
if errors:
    print("PUBLICATION BLOCKED\n" + "\n".join(errors))
    raise SystemExit(1)
print(f"OK publication: {len(files)} staged files, {total:,} bytes; private paths, known secret patterns and documentation links checked.")
