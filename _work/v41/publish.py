import zipfile,json
with zipfile.ZipFile('MiniPy_v4.249-candidate.sb3') as z:d=json.loads(z.read('project.json'))
t=next(t for t in d['targets'] if t.get('name')=='Interpreter');bs=t['blocks']
for k,b in bs.items():
 if b.get('opcode')=='procedures_definition':
  cb=b.get('inputs',{}).get('custom_block',[None,None]); c=bs.get(cb[1]);
  if c and 'publish' in c.get('mutation',{}).get('proccode',''):
   print('DEF',k,c.get('mutation',{}).get('proccode'))
   cur=b.get('next'); n=0
   while cur and n<30:
    q=bs[cur]; print(cur,q.get('opcode'),q.get('mutation',{}).get('proccode',''),'next',q.get('next'),q.get('fields',{})); cur=q.get('next');n+=1
