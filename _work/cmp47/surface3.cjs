
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
function stringsOf(t){
  const s = new Map();
  for (const id of Object.keys(t.blocks)){
    const b = t.blocks[id]; if(!b||typeof b!=='object') continue;
    for (const fk of Object.keys(b.fields||{})){
      const v=b.fields[fk][0];
      if(typeof v==='string'&&v.length>1&&!/^-?\d+(\.\d+)?$/.test(v)) s.set(v,(s.get(v)||0)+1);
    }
    for (const ik of Object.keys(b.inputs||{})){
      const inp=b.inputs[ik]; if(!Array.isArray(inp)) continue; const val=inp[1];
      if(Array.isArray(val)&&typeof val[1]==='string'){const v=val[1]; if(v.length>1&&!/^-?\d+(\.\d+)?$/.test(v)) s.set(v,(s.get(v)||0)+1);}
    }
    if (b.mutation && b.mutation.proccode) s.set('PROC:'+b.mutation.proccode,(s.get('PROC:'+b.mutation.proccode)||0)+1);
  }
  return s;
}
const byName = P => Object.fromEntries(P.targets.map(t=>[t.name,t]));
const a = byName(A), b = byName(B);
const out=[];
const p=(...x)=>out.push(x.join(' '));
for (const name of ['Stage','Controller','TextRenderer']){
  const sa=stringsOf(a[name]), sb=stringsOf(b[name]);
  const onlyA=[...sa.keys()].filter(x=>!sb.has(x));
  const onlyB=[...sb.keys()].filter(x=>!sa.has(x));
  p('#### TARGET ' + name + '  v4strings=' + sa.size + ' v7strings=' + sb.size);
  p('  v4-ONLY (' + onlyA.length + '): ' + JSON.stringify(onlyA));
  p('  v7-ONLY (' + onlyB.length + '): ' + JSON.stringify(onlyB));
}
fs.writeFileSync(base+'surface3.txt', out.join('\n'),'utf8');
console.log(out.join('\n'));
