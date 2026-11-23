import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
for target in ['genExceptionMeth783 %s %s %s %s','egRestore764','genResumeException783 %s %s %s','methodcall %s %s']:
 print('\nTARGET',target)
 for k,b in bs.items():
  if b.get('opcode')=='procedures_call' and b.get('mutation',{}).get('proccode')==target:
   print('call',k,'next',b.get('next'),'parent?',b.get('parent'))
   # reverse parent by checking input references
   parents=[]
   for p,pb in bs.items():
    if pb.get('next')==k: parents.append((p,'next'))
    for slot,val in pb.get('inputs',{}).items():
     if isinstance(val,list) and len(val)>1 and val[1]==k: parents.append((p,slot))
   print(' refs',parents)
