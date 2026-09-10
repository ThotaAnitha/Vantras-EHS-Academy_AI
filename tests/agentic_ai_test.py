import os, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
os.environ.pop('ZAI_API_KEY',None)
os.environ['OLLAMA_URL']='http://127.0.0.1:1/api/chat'
os.environ['AI_PROVIDER_TIMEOUT']='0.1'
from backend.main import build_agentic_context, run_ai_concurrently
ctx=build_agentic_context({'role':'trainer'},{'page':'assessments','page_label':'Assessments','action':'summary','visible_context':'3 assessments pending review; average score 84%'})
assert 'Signed-in role: trainer' in ctx
assert 'Current feature: assessments' in ctx
assert 'reference data only' in ctx
r=run_ai_concurrently('25 * 18',[],ctx)
assert r['ok'] and '450' in r['answer']
app=(ROOT/'frontend/app.js').read_text(encoding='utf-8')
assert '/api/ai/agent' in app
assert 'Vantras AI Copilot' in app
assert "state.portalPage!=='dashboard'" in app
assert 'dashboard-agentic-shell' in app
assert 'ensureAgenticAiDock' in app
css=(ROOT/'frontend/styles.css').read_text(encoding='utf-8')
assert '.agentic-dock' in css and '.agentic-workspace-shell' in css
print('Vantras dashboard-only agentic AI test: PASS')
