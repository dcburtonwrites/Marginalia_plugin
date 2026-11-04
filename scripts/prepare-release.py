"""Prepare local release assets. Never tags, pushes, publishes, installs, or sends mail."""
from pathlib import Path
from hashlib import sha256
import json
import re
import shutil
import subprocess
import sys
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
package = json.loads((root / 'package.json').read_text())
lock = json.loads((root / 'package-lock.json').read_text())
version = manifest['version']
assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'Release tag must be x.y.z, without v'
assert version == package['version'] == lock['version'] == lock['packages']['']['version']
assert json.loads((root / 'versions.json').read_text())[version] == manifest['minAppVersion']
assert (root / 'LICENSE').is_file() and package['license'] == 'MIT'
assert len(manifest['description']) <= 250 and manifest['description'].endswith('.')
files = ('main.js', 'manifest.json', 'styles.css')
release = root / 'dist' / ('release-' + version)
release.mkdir(parents=True, exist_ok=True)
for name in files:
    source = root / 'dist/marginalia' / name
    assert source.read_bytes() == (root / name).read_bytes(), 'Rebuild before packaging: ' + name
    shutil.copyfile(source, release / name)
archive = release / ('marginalia-' + version + '.zip')
with ZipFile(archive, 'w', ZIP_DEFLATED) as zipped:
    for name in files:
        zipped.write(release / name, 'marginalia/' + name)
with ZipFile(archive) as zipped:
    assert set(zipped.namelist()) == {'marginalia/' + name for name in files}
    for name in files:
        assert zipped.read('marginalia/' + name) == (root / name).read_bytes()
shutil.copyfile(root / 'RELEASE-NOTES.md', release / 'RELEASE-NOTES.md')
checksums = ''.join(sha256((release / name).read_bytes()).hexdigest() + '  ' + name + '\n'
                    for name in (*files, archive.name, 'RELEASE-NOTES.md'))
(release / 'SHA256SUMS.txt').write_text(checksums)
site = root / 'website/dist'
(site / 'downloads').mkdir(exist_ok=True)
shutil.copyfile(archive, site / 'downloads' / archive.name)
subprocess.run([sys.executable, str(root / 'scripts/build-greek-demo.py')], cwd=root, check=True)
subprocess.run(['node', '--experimental-strip-types', 'scripts/verify-greek-demo.ts'], cwd=root, check=True)
site_archive = root / 'dist' / ('marginalia-website-' + version + '.zip')
with ZipFile(site_archive, 'w', ZIP_DEFLATED) as zipped:
    for path in sorted(site.rglob('*')):
        if path.is_file() and not path.name.startswith('.'):
            zipped.write(path, path.relative_to(site))
print('Prepared ' + str(release.relative_to(root)))
print('Prepared ' + str(site_archive.relative_to(root)))
print('Verified version agreement, ZIP contents and SHA-256 hashes. Nothing published.')
