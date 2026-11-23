import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
# find method def
root=next(k for k,b in bs.items() if b.get('opcode')=='procedures_definition' and (lambda c:c and c.get('mutation',{}).get('proccode')=='methodcall %s %s')(bs.get(b.get('inputs',{}).get('custom_block',[None,None])[1])))
seen=set()
def walk(i,ind=0):
 if not i or i in seen:return
 seen.add(i); b=bs[i]; m=b.get('mutation',{}).get('proccode','');
 if b.get('opcode')=='procedures_call' or 'Restore' in m or 'Save' in m: print(' '*ind,i,b.get('opcode'),m,'next',b.get('next'))
 for slot,val in b.get('inputs',{}).items():
  if isinstance(val,list) and len(val)>1 and isinstance(val[1],str): walk(val[1],ind+2)
 walk(b.get('next'),ind)
walk(root)
