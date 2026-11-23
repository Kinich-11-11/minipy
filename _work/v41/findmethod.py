import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
for t in d['targets']:
 if t.get('name')!='Interpreter':continue
 bs=t['blocks']
 for k,b in bs.items():
  m=b.get('mutation',{})
  if 'method' in str(m).lower() or (b.get('opcode')=='procedures_call' and 'calluser' in m.get('proccode','')):
   print(k,b.get('opcode'),m.get('proccode'), 'next',b.get('next'))
