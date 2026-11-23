import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
# proc def for methodcall
for k,b in bs.items():
 if b.get('opcode')=='procedures_definition':
  ci=b.get('inputs',{}).get('custom_block',[None,None]); c=bs.get(ci[1]);
  if c and c.get('mutation',{}).get('proccode')=='methodcall %s %s':
   print('DEF',k); cur=b.get('next'); n=0
   while cur and n<250:
    q=bs[cur]; print(cur,q.get('opcode'),q.get('mutation',{}).get('proccode',''), 'next',q.get('next'), 'fields',q.get('fields',{}))
    cur=q.get('next');n+=1
