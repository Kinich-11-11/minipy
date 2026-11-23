import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
parents={}
for p,pb in bs.items():
 if pb.get('next'): parents.setdefault(pb['next'],[]).append((p,'next'))
 for slot,val in pb.get('inputs',{}).items():
  if isinstance(val,list) and len(val)>1 and isinstance(val[1],str): parents.setdefault(val[1],[]).append((p,slot))
for k,b in bs.items():
 if b.get('opcode')=='procedures_call' and b.get('mutation',{}).get('proccode')=='genExceptionMeth783 %s %s %s %s':
  print('\nCALL',k)
  cur=k
  for _ in range(8):
   ps=parents.get(cur,[]); print(' node',cur,bs[cur].get('opcode'),bs[cur].get('mutation',{}).get('proccode'),'parentrefs',ps)
   if not ps:break
   p=ps[0][0]; print(' parent inputs',bs[p].get('inputs',{}),'next',bs[p].get('next'))
   cur=p
