from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
FRONT=ROOT/'frontend'
ASSETS=FRONT/'assets'
MANAGED=ASSETS/'managed'
APP=(FRONT/'app.js').read_text(encoding='utf-8')
DETAIL=(FRONT/'workspace-details.js').read_text(encoding='utf-8')
CSS=(FRONT/'styles.css').read_text(encoding='utf-8')
DASH_JS=(FRONT/'dashboard.js').read_text(encoding='utf-8')
DASH_CSS=(FRONT/'dashboard.css').read_text(encoding='utf-8')

# Only the managed asset library may remain under frontend/assets.
assert MANAGED.is_dir()
assert [p.name for p in ASSETS.iterdir()] == ['managed']

# Required identity/role assets.
for name in ['logo.png','hero-public.jpg','hero-student.jpg','hero-trainer.jpg','hero-corporate.jpg','hero-admin.jpg']:
    assert (MANAGED/name).exists(), name

# All 20 course visuals and 8 category visuals are retained in one clear path.
for i in range(1,21):
    f=MANAGED/'courses'/f'course-{i:02d}.jpg'
    assert f.exists() and f.stat().st_size > 100_000
for i in range(1,9):
    assert (MANAGED/'categories'/f'category-{i:02d}.jpg').exists()

# No legacy image-system names or directories remain in live frontend source.
source='\n'.join([APP,DETAIL,CSS,DASH_JS,DASH_CSS])
for legacy in ['assets/v5/','assets/v7/','assets/ui-','course-v5-','category-v5-','vantras-logo-crisp.png','ehs-training-demo.mp4']:
    assert legacy not in source, legacy

# Every explicit assets/... reference must start from assets/managed/.
refs=re.findall(r"assets/[A-Za-z0-9_./-]+",source)
assert refs
assert all(r=='assets/managed' or r.startswith('assets/managed/') for r in refs), sorted(set(r for r in refs if not (r=='assets/managed' or r.startswith('assets/managed/'))))

print('Vantras managed assets test: PASS')
