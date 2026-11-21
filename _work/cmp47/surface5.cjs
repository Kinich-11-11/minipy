
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const out=[]; const p=(...x)=>out.push(x.join(' '));

// 1. deep-equal check of shell targets
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const a=byName(A), b=byName(B);
for (const n of ['Stage','Controller','TextRenderer','Interpreter']){
  const ta=a[n], tb=b[n];
  const keys=['blocks','costumes','sounds','variables','lists','broadcasts','comments'];
  const per = keys.map(k=>k+'=' + (JSON.stringify(ta[k])===JSON.stringify(tb[k]) ? 'SAME':'DIFF'));
  p('EQ ' + n + ': ' + per.join(' '));
}
p('meta equal? ' + (JSON.stringify(A.meta)===JSON.stringify(B.meta)) + ' :: ' + JSON.stringify(A.meta) + ' | ' + JSON.stringify(B.meta));
p('extensions v4=' + JSON.stringify(A.extensions) + ' v7=' + JSON.stringify(B.extensions));
p('stage eq? ' + (JSON.stringify(a.Stage)===JSON.stringify(b.Stage)));

// 2. all "#!" strings anywhere, with owner sprite
function bang(P){ const r=new Set(); for(const t of P.targets){ for(const id of Object.keys(t.blocks)){ const bl=t.blocks[id]; if(!bl||typeof bl!=='object') continue;
  const scan=(v)=>{ if(typeof v==='string'&&v.includes('#!')) r.add(t.name+' :: '+v); };
  for(const fk of Object.keys(bl.fields||{})) scan(bl.fields[fk][0]);
  for(const ik of Object.keys(bl.inputs||{})){ const v=bl.inputs[ik][1]; if(Array.isArray(v)) scan(v[1]); }
}}
 return [...r].sort(); }
p('== v4 "#!" strings (' + bang(A).length + ') =='); bang(A).forEach(s=>p('   '+s));
p('== v7 "#!" strings (' + bang(B).length + ') =='); bang(B).forEach(s=>p('   '+s));

// 3. editor-visible state: local vars/lists per target
for (const [tag,P] of [['v4',A],['v7',B]]){
  for (const t of P.targets){
    const v=Object.values(t.variables||{}).map(x=>x[0]);
    const l=Object.values(t.lists||{}).map(x=>x[0]);
    p(tag + ' ' + t.name + ' vars(' + v.length + '): ' + v.join(','));
    p(tag + ' ' + t.name + ' lists(' + l.length + '): ' + l.join(','));
  }
}
fs.writeFileSync(base+'surface5.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,16000));
