import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
# immediate parent refs map
parents={}
for p,pb in bs.items():
 if pb.get('next'): parents.setdefault(pb['next'],[]).append((p,'next'))
 for slot,val in pb.get('inputs',{}).items():
  if isinstance(val,list) and len(val)>1 and isinstance(val[1],str): parents.setdefault(val[1],[]).append((p,slot))
# proc def map
for k,b in bs.items():
 if b.get('opcode')=='procedures_call' and b.get('mutation',{}).get('proccode')=='genExceptionMeth783 %s %s %s %s':
  print('\nCALL',k)
  cur=k; seen=set()
  for _ in range(30):
   if cur in seen: break
   seen.add(cur); b=bs[cur]; print(cur,b.get('opcode'),b.get('mutation',{}).get('proccode'),b.get('fields',{}))
   ps=parents.get(cur,[])
   if not ps: break
   cur=ps[0][0]
