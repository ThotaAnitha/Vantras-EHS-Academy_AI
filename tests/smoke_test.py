import json, os, subprocess, sys, time, urllib.request, http.cookiejar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
env = os.environ.copy()
env.update({"VANTRAS_PORT":"8199", "VANTRAS_NO_BROWSER":"1"})
proc = subprocess.Popen([sys.executable, "app.py"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    deadline=time.time()+12
    while True:
        try:
            with urllib.request.urlopen("http://127.0.0.1:8199/api/health", timeout=1) as r:
                assert json.load(r)["ok"] is True
            break
        except Exception:
            if time.time()>deadline: raise
            time.sleep(.25)
    jar=http.cookiejar.CookieJar(); opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req=urllib.request.Request("http://127.0.0.1:8199/api/login", data=json.dumps({"email":"student@vantras.demo","password":"student123"}).encode(), headers={"Content-Type":"application/json"}, method="POST")
    with opener.open(req) as r: assert json.load(r)["ok"] is True
    with opener.open("http://127.0.0.1:8199/api/dashboard") as r: assert json.load(r)["ok"] is True
    with opener.open("http://127.0.0.1:8199/api/student/my-courses") as r: assert "courses" in json.load(r)
    print("Vantras smoke test: PASS")
finally:
    proc.terminate(); proc.wait(timeout=5)
