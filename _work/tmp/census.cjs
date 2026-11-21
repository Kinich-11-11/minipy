const fs=require('fs'), cp=require('child_process');
function readProj(sb3, out){
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  return JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
}
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(B,id){const b=B[id];if(!b)return[];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const inp=b.inputs[k];if(!inp)continue;for(let i=1;i<inp.length;i++){const v=inp[i];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
function census(proj, code){
  const t=proj.targets.find(x=>x.name==='Interpreter'), B=t.blocks;
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]]; if(proto.mutation.proccode!==code) continue;
    const seen=new Set(), st=[id]; while(st.length){const x=st.pop(); if(seen.has(x))continue; seen.add(x); for(const c of kids(B,x))st.push(c);}
    const c={}; for(const x of seen){ const o=B[x].opcode||'(proto)'; c[o]=(c[o]||0)+1; } return c; }
  return {};
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a4'), Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b4');
for(const code of ['init_vm','vm_run']){
  const a=census(A,code), b=census(Bp,code);
  console.log('===== '+code+' =====');
  const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
  for(const k of keys){ const d=(b[k]||0)-(a[k]||0); if(d!==0) console.log('  '+k.padEnd(28), 'shipped='+String(a[k]||0).padStart(6), 'rebuilt='+String(b[k]||0).padStart(6), 'delta='+d); }
  if(!keys.some(k=>(b[k]||0)-(a[k]||0)!==0)) console.log('  (identical opcode census)');
}
