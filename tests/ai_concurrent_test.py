import os, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
os.environ['AI_PROVIDER_TIMEOUT']='0.15'
os.environ.pop('ZAI_API_KEY',None)
os.environ['OLLAMA_URL']='http://127.0.0.1:1/api/chat'  # intentionally unreachable for fast fallback test

from backend.main import run_ai_concurrently

backend=(ROOT/'backend/main.py').read_text(encoding='utf-8')
app=(ROOT/'frontend/app.js').read_text(encoding='utf-8')

assert 'ThreadPoolExecutor(max_workers=2' in backend
assert 'pool.submit(_call_zai,messages)' in backend
assert 'pool.submit(_call_ollama,messages)' in backend
assert '/api/ai/status' in backend and '/api/ai/tutor' in backend
assert 'vantras_ai_threads_v1' in app
assert 'Analyzing your question' in app
assert 'Provider Lab' not in app
assert 'Z.AI' not in app and 'Ollama' not in app
assert 'renderAiThreads' in app and 'startAiVoice' in app

assert 'general-purpose AI assistant' in backend
assert 'Ask any question' in app
math_result=run_ai_concurrently('25 * 18')
assert math_result['answer'].strip().endswith('450.')

start=time.time()
r=run_ai_concurrently('Explain HIRA in simple terms')
assert r['ok'] is True
assert r['providers']['zai']['ok'] is False
assert r['providers']['ollama']['ok'] is False
assert r['used_provider']=='Vantras Local Assistant'
assert 'hazard' in r['answer'].lower() or 'risk' in r['answer'].lower()
assert time.time()-start < 2.0

print('Vantras concurrent AI fallback test: PASS')
