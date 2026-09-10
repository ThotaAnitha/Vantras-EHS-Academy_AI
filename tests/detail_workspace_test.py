import json, os, subprocess, sys, time, urllib.request, http.cookiejar
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
env=os.environ.copy(); env.update({'VANTRAS_PORT':'8202','VANTRAS_NO_BROWSER':'1'})
proc=subprocess.Popen([sys.executable,'app.py'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8202'

def wait():
    end=time.time()+12
    while time.time()<end:
        try:
            with urllib.request.urlopen(BASE+'/api/health',timeout=1) as r:
                if json.load(r).get('ok'): return
        except Exception: time.sleep(.2)
    raise RuntimeError('server did not start')

def session(identifier,password):
    jar=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req=urllib.request.Request(BASE+'/api/login',data=json.dumps({'identifier':identifier,'password':password}).encode(),headers={'Content-Type':'application/json'},method='POST')
    with op.open(req) as r: assert json.load(r)['ok']
    return op

def workspace(op,feature):
    with op.open(BASE+'/api/workspace?feature='+feature) as r:
        d=json.load(r); assert d['ok']; return d

try:
    wait()
    trainer=session('trainer@vantras.demo','trainer123')
    assert workspace(trainer,'assignments')['counts']=={'Graded':128,'Open':14,'Resubmit':6}
    assert workspace(trainer,'feedback')['counts']=={'New':24,'Open':62,'Responded':300}
    assert workspace(trainer,'messages')['counts']=={'Open':12,'Read':23,'Unread':7}
    assert workspace(trainer,'certificates')['counts']=={'Eligible':4,'Issued':8,'Pending':5,'Revoked':2}

    corporate=session('corporate@vantras.demo','corporate123')
    assert workspace(corporate,'certificates')['counts']=={'Expiring Soon':4,'Pending':1,'Valid':33}
    assert workspace(corporate,'requests')['counts']=={'Approved':5,'Completed':12,'Open':3}

    admin=session('admin@vantras.demo','admin123')
    assert workspace(admin,'approvals')['counts']=={'Approved':21,'Pending':3,'Returned':2}
    assert workspace(admin,'enrollments')['counts']=={'Active':219,'Completed':164,'New':28}
    assert workspace(admin,'exams')['counts']=={'Active':2,'Completed':34,'Scheduled':6}
    cert=workspace(admin,'certificates')['counts']
    assert cert=={'Eligible':5,'Expiring Soon':4,'Pending':6,'Revoked':2,'Valid':33}

    cats=workspace(admin,'categories')['records']
    assert len(cats)==8 and sum(int(r['details']['published_courses']) for r in cats)==18
    assessments=workspace(admin,'assessments')['records']
    assert len(assessments)==46 and sum(int(r['details']['attempts']) for r in assessments)==2846
    qb=workspace(admin,'questionbank')['records']
    assert len(qb)==18
    assert sum(int(r['details']['total']) for r in qb)==486
    assert sum(int(r['details']['easy']) for r in qb)==128
    assert sum(int(r['details']['medium']) for r in qb)==214
    assert sum(int(r['details']['hard']) for r in qb)==144

    print('Vantras detail workspace test: PASS')
finally:
    proc.terminate(); proc.wait(timeout=5)
