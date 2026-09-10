import json, os, subprocess, sys, time, urllib.request, http.cookiejar
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=(ROOT/'frontend/app.js').read_text(encoding='utf-8')
DASH=(ROOT/'frontend/dashboard.js').read_text(encoding='utf-8')
UI=APP+'\n'+DASH
CSS=(ROOT/'frontend/styles.css').read_text(encoding='utf-8')
assert 'Exams Ending Soon' in UI
assert 'Results → Test History' in UI
assert '/api/student/results' in APP
assert 'Course Status' in UI and 'Live and visible' in UI
assert 'Your Progress' in APP and 'Green — Completed' in APP and 'Blue — Current' in APP
assert '/api/trainer/live-sessions' in APP
assert 'trainerCourseMenu' in APP and 'openCourseEditor' in APP and 'archiveAiThread' in APP
assert 'Provider Lab' not in APP and 'Dual AI engine' not in APP
assert '18+</strong><span>EHS courses' not in APP
assert 'inset 7px 0 0 var(--v8-blue)' in CSS and 'inset 0 7px 0 var(--v8-green)' in CSS

env=os.environ.copy(); env.update({'VANTRAS_PORT':'8208','VANTRAS_NO_BROWSER':'1','AI_PROVIDER_TIMEOUT':'0.15','OLLAMA_URL':'http://127.0.0.1:1/api/chat'})
proc=subprocess.Popen([sys.executable,'app.py'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8208'
def wait():
    end=time.time()+12
    while time.time()<end:
        try:
            with urllib.request.urlopen(BASE+'/api/health',timeout=1) as r:
                if json.load(r).get('ok'): return
        except Exception: time.sleep(.2)
    raise RuntimeError('server did not start')
def session(email,password):
    jar=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req=urllib.request.Request(BASE+'/api/login',data=json.dumps({'email':email,'password':password}).encode(),headers={'Content-Type':'application/json'},method='POST')
    with op.open(req) as r: assert json.load(r)['ok']
    return op
def get(op,path):
    with op.open(BASE+path) as r:
        d=json.load(r); assert d.get('ok') is True; return d
try:
    wait()
    stu=session('student@vantras.demo','student123')
    ass=get(stu,'/api/student/assessments')['assessments']
    assert ass and all('due_date' in x and 'ending_in_days' in x and 'attempt_count' in x for x in ass)
    assert 'results' in get(stu,'/api/student/results')
    tr=session('trainer@vantras.demo','trainer123')
    live=get(tr,'/api/trainer/live-sessions')['sessions']
    assert live and {'status','meeting_link','recording_status'} <= live[0].keys()
    print('Vantras functionality test: PASS')
finally:
    proc.terminate(); proc.wait(timeout=5)
