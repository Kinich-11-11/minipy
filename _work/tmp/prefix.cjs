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
  function walk(id,d){ if(d>60) return; let cur=id; let guard=0;
    while(cur&&B[cur]&&guard++<2000000){ const b=B[cur];
      let t=(b.opcode||'?');
      const L=(b.fields&&b.fields.LIST)?proj.named[b.fields.LIST[1]]:null;
      const V=(b.fields&&b.fields.VARIABLE)?proj.named[b.fields.VARIABLE[1]]:null;
      if(L) t+=':'+L; else if(V) t+=':'+V;
      else if(b.fields){ for(const k of Object.keys(b.fields).sort()){ const f=b.fields[k]; if(f&&f[1]!==undefined&&typeof f[1]!=='string') t+='|'+String(f[1]).slice(0,20); } }
      out.push({t,d, id:cur});
      const ins=b.inputs||{}; for(const k of Object.keys(ins)){ const inp=ins[k]; if(!inp)continue;
        for(let i=1;i<inp.length;i++){ const v=inp[i]; let lit=null;
          if(Array.isArray(v)&&PRIM.has(v[0])) lit=v[1];
          if(lit!==null){ out.push({t:'('+k+'='+String(lit).slice(0,20)+')', d:d+1}); continue; }
          if(typeof v==='string'&&B[v]&&B[v].opcode) walk(v,d+1); else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]]) walk(v[1],d+1); } }
      cur=b.next; } }
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]]; if(proto.mutation.proccode!==code) continue; walk(b.next,0); }
  return out;
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a7'), Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b7');
const a=toks(A,'vm_run'), b=toks(Bp,'vm_run');
for(let i=0;i<55;i++){
  const L=a[i]?('  '.repeat(a[i].d)+a[i].t):''; const R=b[i]?('  '.repeat(b[i].d)+b[i].t):'';
  console.log(String(i).padStart(3)+' | '+L.padEnd(62)+' | '+R);
}
