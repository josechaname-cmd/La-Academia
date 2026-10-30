"""Install the optional Windows video inspection runtime; never publish binaries."""
import hashlib
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
target = root / 'tools/runtime/ffmpeg'
if (target / 'bin/ffprobe.exe').exists():
    raise SystemExit('FFprobe already installed. Review and update the runtime separately.')
# Gyan's build is linked by ffmpeg.org/download.html. Pin release and publisher checksum.
url = 'https://github.com/GyanD/codexffmpeg/releases/download/9.0.2/ffmpeg-9.0.2-essentials_build.7z'
expected = '4705843ccaaf54257c16ad90f3e952ece33c17df964ecf7bfdbb0f49c7171077'
# Keep interrupted downloads in the ignored runtime directory so rerunning can resume.
archive = target.parent / 'ffmpeg-9.0.2.7z'
archive.parent.mkdir(parents=True, exist_ok=True)
print('Downloading the video runtime; interrupted transfers can be resumed.', flush=True)
subprocess.run(['curl.exe', '--fail', '--location', '--silent', '--show-error', '--continue-at', '-', '--max-time', '900', '--output', str(archive), url], check=True)
with archive.open('rb') as stream:
    actual = hashlib.file_digest(stream, 'sha256').hexdigest()
if actual != expected:
    raise RuntimeError('Publisher checksum mismatch')
members = subprocess.check_output(['tar', '-tf', str(archive)], text=True).splitlines()
selected = []
for suffix in ['bin/ffprobe.exe', 'bin/ffmpeg.exe', 'LICENSE', 'README.txt']:
    matches = [name for name in members if name == 'ffmpeg-9.0.2-essentials_build/' + suffix]
    if len(matches) != 1:
        raise RuntimeError('Unexpected runtime archive layout')
    selected.extend(matches)
target.mkdir(parents=True, exist_ok=True)
subprocess.run(['tar', '-xf', str(archive), '--strip-components', '1', '-C', str(target), *selected], check=True)
(target / 'download.sha256').write_text(actual + '\n', encoding='ascii')
print('FFprobe installed in tools/runtime/ffmpeg; publisher SHA-256 verified.')
