import json, os, subprocess, sys, time, urllib.request, http.cookiejar
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
env=os.environ.copy(); env.update({'VANTRAS_PORT':'8200','VANTRAS_NO_BROWSER':'1'})
proc=subprocess.Popen([sys.executable,'app.py'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8200'

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
        assert r.status==200
        data=json.load(r); assert data.get('ok') is True
        return data

try:
    wait()
    roles={
      'student':('student@vantras.demo','student123',['/api/dashboard','/api/student/my-courses','/api/student/assessments','/api/student/certificates','/api/student/payments','/api/resources','/api/support/tickets']),
      'trainer':('trainer@vantras.demo','trainer123',['/api/dashboard','/api/courses','/api/trainer/learners','/api/resources','/api/support/tickets']),
      'corporate':('corporate@vantras.demo','corporate123',['/api/dashboard','/api/corporate/employees','/api/corporate/enrollments','/api/courses','/api/resources','/api/support/tickets']),
      'admin':('admin@vantras.demo','admin123',['/api/dashboard','/api/admin/users','/api/admin/payments','/api/admin/certificates','/api/courses','/api/resources','/api/support/tickets']),
    }
    for role,(email,pw,paths) in roles.items():
        op=session(email,pw)
        for path in paths: get(op,path)
        print(role,'PASS')
    print('All portal API smoke test: PASS')
finally:
    proc.terminate(); proc.wait(timeout=5)
