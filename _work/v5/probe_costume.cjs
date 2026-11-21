const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const t=p.targets.find(x=>x.name==='Interpreter');
console.log('Interpreter costumes:', t.costumes.length);
console.log('first 5:', t.costumes.slice(0,5).map(c=>c.name).join(' | '));
console.log('last 5:', t.costumes.slice(-5).map(c=>c.name).join(' | '));
const names=t.costumes.map(c=>c.name);
const bad=names.filter(n=>!/^_.$/.test(n));
console.log('non _X costumes:', JSON.stringify(bad));
console.log('size:', t.size, 'visible:', t.visible, 'x,y:', t.x, t.y);
for(const id in t.blocks){
  const b=t.blocks[id];
  if(b.opcode==='looks_switchcostumeto'||b.opcode==='looks_costumenumbername'){
    console.log(id, JSON.stringify(b));
    if(--globalThis.n===undefined) globalThis.n=3;
  }
}
