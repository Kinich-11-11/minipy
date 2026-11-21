const fs=require('fs'), cp=require('child_process');
function readProj(sb3, out){
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  return JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
}
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function tok(B,id,out,depth){
  const b=B[id]; if(!b) return;
  if(depth>400) return;
  let t=b.opcode;
  if(b.fields){ for(const k of Object.keys(b.fields).sort()){ const f=b.fields[k]; if(f&&f[1]!==undefined) t+='|'+k+'='+String(f[1]).slice(0,40); } }
  if(b.mutation) t+='|M='+JSON.stringify(b.mutation).slice(0,120);
  out.push(t);
  const ins=b.inputs||{};
  for(const k of Object.keys(ins).sort()){ const inp=ins[k]; if(!inp)continue;
    let sub=null;
    for(let i=1;i<inp.length;i++){ const v=inp[i]; if(typeof v==='string'&&B[v]&&B[v].opcode) {sub=v;break;} if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]]){sub=v[1];break;} }
    if(sub){ out.push('  '.repeat(depth+1)+'<'+k+'>'); tok(B,sub,out,depth+1); }
    else { let lit=null; for(let i=1;i<inp.length;i++){const v=inp[i]; if(Array.isArray(v)&&PRIM.has(v[0])) {lit=v[1];break;}} if(lit!==null) out.push('  '.repeat(depth+1)+'<'+k+'>='+String(lit).slice(0,40)); }
  }
  if(b.next) tok(B,b.next,out,depth);
}
function tree(proj, code){
  const t=proj.targets.find(x=>x.name==='Interpreter'), B=t.blocks;
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]];
    if(proto.mutation.proccode!==code) continue;
    const out=[]; tok(B,b.next,out,0); return out; }
  return null;
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a3');
const Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b3');
for(const code of ['init_vm','vm_run']){
  const a=tree(A,code), b=tree(Bp,code);
  console.log('\n===== '+code+' shipped='+a.length+' rebuilt='+b.length+' =====');
  let i=0; while(i<Math.min(a.length,b.length) && a[i]===b[i]) i++;
  console.log('first difference at token index '+i);
  console.log('--- shipped context (around diff) ---');
  for(let j=Math.max(0,i-25); j<Math.min(a.length,i+40); j++) console.log((j===i?'>> ':'   ')+a[j]);
  console.log('--- rebuilt context (around diff) ---');
  for(let j=Math.max(0,i-25); j<Math.min(b.length,i+40); j++) console.log((j===i?'>> ':'   ')+b[j]);
}
