
const fs = require('fs'), crypto = require('crypto');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));

function canon(t, id, seen){
  const b = t.blocks[id];
  if (!b || typeof b !== 'object') return 'S(' + JSON.stringify(b) + ')';
  if (seen.has(id)) return 'REF';
  seen.add(id);
  const parts = [b.opcode];
  const f = b.fields||{}; const fk = Object.keys(f).sort();
  for (const k of fk) parts.push('f:'+k+'='+JSON.stringify(f[k][0]));
  if (b.mutation) parts.push('m:'+JSON.stringify(b.mutation));
  const ik = Object.keys(b.inputs||{}).sort();
  for (const k of ik){
    const inp = b.inputs[k];
    const v = inp[1];
    if (Array.isArray(v)) parts.push('i:'+k+'='+canon(t, v[1], seen));
    else parts.push('i:'+k+'='+JSON.stringify(v));
  }
  if (b.next) parts.push('n:'+canon(t, b.next, seen));
  return '{' + parts.join(' ') + '}';
}
function scripts(t){
  const tops = Object.keys(t.blocks).filter(id=>{ const b=t.blocks[id]; return b && typeof b==='object' && !b.topLevel && b.parent===undefined; });
  const alsoTop = Object.keys(t.blocks).filter(id=>{const b=t.blocks[id]; return b&&typeof b==='object'&&b.topLevel;});
  const list = [...new Set([...tops,...alsoTop])];
  return list.map(id=>({op:t.blocks[id].opcode, h: crypto.createHash('sha1').update(canon(t,id,new Set())).digest('hex').slice(0,10), src: canon(t,id,new Set())}));
}
const a=byName(A), b=byName(B);
const out=[]; const p=(...x)=>out.push(x.join(' '));
for (const name of ['Controller','Stage','TextRenderer']){
  const sa=scripts(a[name]), sb=scripts(b[name]);
  const ha=new Map(sa.map(s=>[s.h,s])), hb=new Map(sb.map(s=>[s.h,s]));
  const onlyA=sa.filter(s=>!hb.has(s.h)), onlyB=sb.filter(s=>!ha.has(s.h));
  p('#### ' + name + ': v4 scripts=' + sa.length + ' v7 scripts=' + sb.length + ' | v4-only=' + onlyA.length + ' v7-only=' + onlyB.length);
  for (const s of onlyA) p('  V4ONLY ['+s.op+'] ' + s.src.slice(0,600));
  for (const s of onlyB) p('  V7ONLY ['+s.op+'] ' + s.src.slice(0,600));
}
// asset diff
function assets(dir){ return fs.readdirSync(dir).filter(f=>f!=='project.json').map(f=>f+' '+crypto.createHash('md5').update(fs.readFileSync(dir+'/'+f)).digest('hex')).sort(); }
const aa=assets(base+'v4'), ab=assets(base+'v7');
const setA=new Set(aa), setB=new Set(ab);
p('#### ASSETS: v4=' + aa.length + ' v7=' + ab.length);
p('  v4-only: ' + JSON.stringify(aa.filter(x=>!setB.has(x))));
p('  v7-only: ' + JSON.stringify(ab.filter(x=>!setA.has(x))));
fs.writeFileSync(base+'surface4.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,14000));
