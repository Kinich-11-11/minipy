
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function refs(t){ const s=new Set();
  for (const id of Object.keys(t.blocks)){ const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
    for (const [k,v] of Object.entries(b.fields||{})) if (k.startsWith('VARIABLE')||k.startsWith('LIST')) s.add(v[0]);
    for (const [k,v] of Object.entries(b.inputs||{})) { const val=v[1];
      if (Array.isArray(val) && (val[0]===12||val[0]===13)) s.add(val[1]); } }
  return s; }
for (const [tag,P] of [['v4',A],['v7',B]]){
  const shell = new Set([...refs(byName(P).Stage), ...refs(byName(P).Controller), ...refs(byName(P).TextRenderer)]);
  const eng = refs(byName(P).Interpreter);
  const globals = byName(P).Stage.variables, glists = byName(P).Stage.lists;
  const gnames = [...Object.values(globals).map(x=>x[0]), ...Object.values(glists).map(x=>x[0])];
  p('== ' + tag + ' == shell refs (' + shell.size + '): ' + [...shell].sort().join(','));
  const both = gnames.filter(n=>shell.has(n)&&eng.has(n));
  const shellOnly = gnames.filter(n=>shell.has(n)&&!eng.has(n));
  const engOnly = gnames.filter(n=>!shell.has(n)&&eng.has(n));
  p('   shared contract (' + both.length + '): ' + both.join(','));
  p('   shell-only (' + shellOnly.length + '): ' + shellOnly.join(','));
  p('   engine-only (' + engOnly.length + '): ' + engOnly.join(','));
}
fs.writeFileSync(base+'surface15.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,6000));
