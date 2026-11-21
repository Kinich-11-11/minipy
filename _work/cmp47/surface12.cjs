
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
for (const n of ['Stage','Controller','TextRenderer']){
  const a=byName(A)[n], b=byName(B)[n];
  const ka=new Set(Object.keys(a.blocks)), kb=new Set(Object.keys(b.blocks));
  const onlyA=[...ka].filter(k=>!kb.has(k)), onlyB=[...kb].filter(k=>!ka.has(k));
  const common=[...ka].filter(k=>kb.has(k));
  const changed=common.filter(k=>JSON.stringify(a.blocks[k])!==JSON.stringify(b.blocks[k]));
  p('## ' + n + ': common=' + common.length + ' v4only=' + onlyA.length + ' v7only=' + onlyB.length + ' changed=' + changed.length);
  for (const k of onlyA) p('   V4ONLY ' + k + ' :: ' + JSON.stringify(a.blocks[k]));
  for (const k of onlyB) p('   V7ONLY ' + k + ' :: ' + JSON.stringify(b.blocks[k]));
  for (const k of changed.slice(0,20)) p('   CHANGED ' + k + '\n      v4 ' + JSON.stringify(a.blocks[k]) + '\n      v7 ' + JSON.stringify(b.blocks[k]));
  // context: parent chain to root for the diff blocks
  const ctx=(t,id)=>{ const c=[]; let cur=id,g=0; while(cur&&g++<60){ const bl=t.blocks[cur]; if(!bl){c.push('?'+cur);break;} c.push(bl.opcode+'['+JSON.stringify(bl.fields&&Object.keys(bl.fields).length?Object.fromEntries(Object.entries(bl.fields).map(([k,v])=>[k,v[0]])):{}) + ']'); if(bl.topLevel)break; cur=bl.parent; } return c.join(' <- '); };
  for (const k of [...onlyA,...onlyB]) p('   CTX ' + k + ': ' + ctx(n==='Controller'?a:b, k));
}
fs.writeFileSync(base+'surface12.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,9000));
