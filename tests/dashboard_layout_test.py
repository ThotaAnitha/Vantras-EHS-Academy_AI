from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'frontend'/'index.html').read_text(encoding='utf-8')
JS=(ROOT/'frontend'/'dashboard.js').read_text(encoding='utf-8')
CSS=(ROOT/'frontend'/'dashboard.css').read_text(encoding='utf-8')
APP=(ROOT/'frontend'/'app.js').read_text(encoding='utf-8')

assert 'dashboard.css' in HTML
assert 'dashboard.js' in HTML
for role in ['student','trainer','corporate','admin']:
    assert f"{role}:" in JS
for renderer in ['renderStudentDashboardV49','renderTrainerDashboardV49','renderCorporateDashboardV49','renderAdminDashboardV49']:
    assert renderer in JS
assert 'grid-template-columns:repeat(2,minmax(0,1fr))' in CSS
assert 'dashboard-agentic-shell' in CSS
assert "state.user.role==='student'" in APP or "state.user?.role==='student'" in APP
assert 'VANTRAS V48 STUDENT DASHBOARD CLEAN 2-CARD ROWS' not in APP
print('Vantras unified dashboard layout test: PASS')
