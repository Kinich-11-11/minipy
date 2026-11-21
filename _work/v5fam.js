
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
for(const t of p.targets){
  const ops={}; for(const id in t.blocks){const b=t.blocks[id]; if(b&&b.opcode) ops[b.opcode]=(ops[b.opcode]||0)+1;}
  const fam={}; for(const o in ops){ const f=o.split('_')[0]; fam[f]=(fam[f]||0)+ops[o]; }
  console.log(t.name.padEnd(14), JSON.stringify(fam));
  if(t.name==='Controller'||t.name==='TextRenderer') console.log('   ops:', Object.keys(ops).sort().join(' '));
}
const ctrl=p.targets.find(t=>t.name==='Controller');
console.log('Controller costumes:', JSON.stringify(ctrl.costumes.map(c=>({n:c.name,md5:c.assetId,r:c.rotationCenterX+','+c.rotationCenterY}))));
const tr=p.targets.find(t=>t.name==='TextRenderer');
console.log('TextRenderer costume names:', JSON.stringify(tr.costumes.map(c=>c.name).join('')));
console.log('TextRenderer costume[0]:', JSON.stringify(tr.costumes[0]));
const it=p.targets.find(t=>t.name==='Interpreter');
console.log('Interpreter costume[0..2]:', JSON.stringify(it.costumes.slice(0,2)));
console.log('Interpreter === TextRenderer assets?', JSON.stringify(it.costumes.map(c=>c.assetId).join()===tr.costumes.map(c=>c.assetId).join()));
console.log('Interpreter x,y,size,dir,visible:', it.x, it.y, it.size, it.direction, it.visible, 'layerOrder', it.layerOrder);
console.log('sprite order:', p.targets.map(t=>t.name+':'+t.layerOrder).join(' '));
