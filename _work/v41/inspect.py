import zipfile,json
p='MiniPy_v4.249-candidate.sb3'
with zipfile.ZipFile(p) as z:
 d=json.loads(z.read('project.json'))
for t in d['targets']:
 if t.get('name')!='Interpreter': continue
 bs=t['blocks']
 procs={}
 for k,b in bs.items():
  if b.get('opcode')=='procedures_definition':
   c=bs.get(b.get('inputs',{}).get('custom_block',[None,None])[1])
   if c: procs[c.get('mutation',{}).get('proccode')]=k
 for q in ['methodcall %s %s %s','genExceptionMeth783 %s %s %s %s','genResumeException783 %s %s %s','egRestore764']:
  print('\nPROC',q,procs.get(q))
  start=procs.get(q)
  if not start: continue
  cur=bs[start].get('next'); n=0
  while cur and n<200:
   b=bs[cur]; print(cur,b.get('opcode'),b.get('mutation',{}).get('proccode',''), 'next=',b.get('next'), 'fields=',b.get('fields',{}))
   cur=b.get('next'); n+=1
