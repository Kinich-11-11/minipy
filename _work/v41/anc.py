import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
for root in ['bcontro_148licqkw','bcontro_14k7aq1t8']:
 print('\nROOT',root)
 # print ancestor ref chain
 cur=root
 for _ in range(15):
  b=bs[cur]; print(cur,b.get('opcode'),b.get('mutation',{}).get('proccode'),b.get('fields',{}))
  pars=[]
  for p,pb in bs.items():
   if pb.get('next')==cur: pars.append((p,'next'))
   for slot,val in pb.get('inputs',{}).items():
    if isinstance(val,list) and len(val)>1 and val[1]==cur: pars.append((p,slot))
  if not pars:break
  cur=pars[0][0]
