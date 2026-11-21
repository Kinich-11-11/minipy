
const fs=require('fs');
for (const f of ['8086','py']) {
  const p=JSON.parse(fs.readFileSync(process.argv[2]+'\\'+f+'.json','utf8'));
  const ext=new Set();
  for(const t of p.targets) for(const id in t.blocks){ const o=t.blocks[id].opcode; if(o&&/^(enhance|pen|turbowarp|tw)_/.test(o)) ext.add(o); }
  console.log(f, JSON.stringify([...ext]));
  console.log('  twconfig:', JSON.stringify((p.targets.find(x=>x.isStage).comments)||{}).slice(0,400));
}
