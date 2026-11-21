
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const out=[]; const p=(...x)=>out.push(x.join(' '));
const gone = ['dq','slash','branchjump','lsep','Indents','Ends','Elses','LoopHead','LoopEnd','LoopKind','LoopName','LoopValue','LoopStop','LoopStep'];
for (const [tag,P] of [['v4',A],['v7',B]]){
  for (const n of ['Stage','Controller','TextRenderer']){
    const t = byName(P)[n]; const hits=new Set();
    for (const id of Object.keys(t.blocks)){ const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
      for (const [k,v] of Object.entries(b.fields||{})) if (gone.includes(v[0])) hits.add('field:'+k+'='+v[0]);
      for (const [k,v] of Object.entries(b.inputs||{})) { const val=v[1];
        if (Array.isArray(val) && val[0]===12 && gone.includes(val[1])) hits.add('input:'+k+'='+val[1]);
        if (Array.isArray(val) && val[0]===13 && gone.includes(val[1])) hits.add('inputlist:'+k+'='+val[1]); }
    }
    p(tag + ' ' + n + ' refs to removed-name-set: ' + (hits.size? JSON.stringify([...hits]) : 'NONE'));
  }
}
// cross-sprite calls from the shell
function calls(t){ const m=new Map(); for(const id of Object.keys(t.blocks)){const b=t.blocks[id]; if(b&&b.opcode==='procedures_call'&&b.mutation) m.set(b.mutation.proccode,(m.get(b.mutation.proccode)||0)+1);} return m; }
function defs(t){ const s=new Set(); for(const id of Object.keys(t.blocks)){const b=t.blocks[id]; if(b&&b.opcode==='procedures_prototype'&&b.mutation) s.add(b.mutation.proccode);} return s; }
for (const [tag,P] of [['v4',A],['v7',B]]){
  const ctrl = byName(P).Controller;
  const c = calls(ctrl), d = defs(ctrl);
  const unresolved = [...c.keys()].filter(k=>!d.has(k));
  p(tag + ' Controller calls=' + c.size + ' local defs=' + d.size + ' UNRESOLVED-in-Controller: ' + JSON.stringify(unresolved));
  for (const u of unresolved){
    // is it defined in Interpreter?
    const idefs = defs(byName(P).Interpreter);
    p('    -> defined in Interpreter? ' + idefs.has(u) + ' :: ' + u);
  }
  p(tag + ' Interpreter defs=' + defs(byName(P).Interpreter).size);
}
fs.writeFileSync(base+'surface14.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,6000));
