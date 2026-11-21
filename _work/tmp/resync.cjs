const fs=require('fs'), cp=require('child_process');
function readProj(sb3, out){
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  const p=JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
  const t=p.targets.find(x=>x.name==='Interpreter');
  const named={}; for(const k in t.lists) named[k]=t.lists[k][0];
  for(const k in t.variables) named[k]=t.variables[k][0];
  return {B:t.blocks, named};
}
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function toks(proj, code){
  const B=proj.B, out=[];
  function walk(id){ let cur=id; let guard=0; while(cur&&B[cur]&&guard++<2000000){ const b=B[cur];
      let t=b.opcode||'?';
      const L=(b.fields&&b.fields.LIST)?proj.named[b.fields.LIST[1]]:null;
      const V=(b.fields&&b.fields.VARIABLE)?proj.named[b.fields.VARIABLE[1]]:null;
      if(L==='Reg') t='regop';
      else if(L) t+=':'+L;
      else if(V) t+=':'+V;
      else if(b.fields){ for(const k of Object.keys(b.fields).sort()){ const f=b.fields[k]; if(f&&f[1]!==undefined&&typeof f[1]!=='string') t+='|'+k+'='+String(f[1]).slice(0,30); } }
      out.push(t);
      const ins=b.inputs||{}; for(const k of Object.keys(ins)){ const inp=ins[k]; if(!inp)continue;
        for(let i=1;i<inp.length;i++){ const v=inp[i]; if(typeof v==='string'&&B[v]&&B[v].opcode) walk(v); else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]]) walk(v[1]); } }
      cur=b.next; } }
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]]; if(proto.mutation.proccode!==code) continue; walk(b.next); }
  return out;
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a6'), Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b6');
const a=toks(A,'vm_run'), b=toks(Bp,'vm_run');
console.log('shipped tokens',a.length,'rebuilt',b.length);
// resync walk
let i=0,j=0; const missing=[];
while(i<a.length&&j<b.length){
  if(a[i]===b[j]){ i++; j++; continue; }
  // try to resync: find k>0 such that a[i+k]===b[j] (shipped has extra) or a[i]===b[j+k] (rebuilt has extra)
  let found=null;
  for(let k=1;k<=40;k++){ if(i+k<a.length&&a[i+k]===b[j]){ found={skipA:k}; break; } if(j+k<b.length&&a[i]===b[j+k]){ found={skipB:k}; break; } }
  if(!found){ missing.push({at:i, a:a.slice(i,i+6), b:b.slice(j,j+6)}); i++; j++; continue; }
  if(found.skipA){ for(let k=0;k<found.skipA;k++) missing.push({at:i+k, extra:a[i+k]}); i+=found.skipA; }
  else j+=found.skipB;
}
console.log('total extra-in-shipped tokens:', missing.filter(m=>m.extra).length, ' ambiguous:', missing.filter(m=>!m.extra).length);
const groups={};
for(const m of missing){ if(!m.extra) continue; const k=m.at; groups[Math.floor(k/1)]=1; }
for(const m of missing.slice(0,80)) console.log('  at',m.at, m.extra?('SHIPPED-ONLY: '+m.extra):('AMBIG '+(m.a||[]).join(',')+' || '+(m.b||[]).join(',')));
