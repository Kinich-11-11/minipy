const fs=require('fs'), cp=require('child_process');
function readProj(sb3, out){
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  return JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a2');
const Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b2');
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(B,id){const b=B[id];if(!b)return[];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const inp=b.inputs[k];if(!inp)continue;for(let i=1;i<inp.length;i++){const v=inp[i];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
function procSizes(proj){
  const t=proj.targets.find(x=>x.name==='Interpreter'), B=t.blocks, res={};
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]]; const code=proto.mutation.proccode;
    const seen=new Set(), st=[id];
    while(st.length){const x=st.pop(); if(seen.has(x))continue; seen.add(x); for(const c of kids(B,x))st.push(c);}
    res[code]=seen.size; }
  return res;
}
const a=procSizes(A), b=procSizes(Bp);
const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
let ta=0,tb=0;
for(const k of keys){ ta+=a[k]||0; tb+=b[k]||0;
  const d=(b[k]||0)-(a[k]||0);
  console.log((k||'?').padEnd(14), 'shipped='+String(a[k]||0).padStart(6), 'rebuilt='+String(b[k]||0).padStart(6), d===0?'':('DELTA '+d)); }
console.log('TOTAL shipped',ta,'rebuilt',tb,'delta',tb-ta);
// variable + list name diff
const va=Object.values(A.targets.find(x=>x.name==='Interpreter').variables||{}).map(v=>v[0]);
const vb=Object.values(Bp.targets.find(x=>x.name==='Interpreter').variables||{}).map(v=>v[0]);
console.log('vars shipped',va.length,'rebuilt',vb.length);
console.log('only in shipped:', va.filter(x=>!vb.includes(x)).join(' '));
console.log('only in rebuilt:', vb.filter(x=>!va.includes(x)).join(' '));
const la=Object.values(A.targets.find(x=>x.name==='Interpreter').lists||{}).map(v=>v[0]);
const lb=Object.values(Bp.targets.find(x=>x.name==='Interpreter').lists||{}).map(v=>v[0]);
console.log('lists shipped',la.length,'rebuilt',lb.length);
console.log('lists only in shipped:', la.filter(x=>!lb.includes(x)).join(' '));
console.log('lists only in rebuilt:', lb.filter(x=>!la.includes(x)).join(' '));
