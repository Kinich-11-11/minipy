import subprocess, sys, glob
PY = sys.executable
for f in glob.glob('_new*_*.txt'):
    lines = open(f, encoding='utf8').read().replace('\r','').split('\n')
    cases=[]; cur=None
    for ln in lines:
        if ln.startswith('### '):
            if cur: cases.append(cur)
            name=ln[4:].strip(); cur={'err':name.startswith('!'),'name':name.lstrip('!'),'code':[]}
        elif cur is not None: cur['code'].append(ln)
    if cur: cases.append(cur)
    for c in cases:
        code='\n'.join(c['code']).strip('\n')
        if not code: continue
        r=subprocess.run([PY,'-c',code],capture_output=True,text=True,timeout=20)
        ok = (r.returncode!=0) if c['err'] else (r.returncode==0)
        if not ok:
            print(('BAD-ERRCASE' if c['err'] else 'BAD-CASE'), f, c['name'], '|', (r.stderr.strip().splitlines() or [''])[-1])
print('precheck done')
