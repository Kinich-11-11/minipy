const fs=require('fs'), cp=require('child_process');
function readProj(sb3, out){
  fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  const p=JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
  const t=p.targets.find(x=>x.name==='Interpreter');
  const named={}; for(const k in t.lists) named[k]=t.lists[k][0];
  return {B:t.blocks, named};
}
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function seq(proj, code){
  const B=proj.B, out=[];
  function walk(id){ let cur=id; while(cur&&B[cur]){ const b=B[cur];
      if(b.opcode==='data_replaceitemoflist'||b.opcode==='data_deletealloflist'||b.opcode==='data_addtolist'){ const f=(b.fields.LIST||[])[1]; out.push(b.opcode+':'+(proj.named[f]||f)); }
      const ins=b.inputs||{}; for(const k of Object.keys(ins)){ const inp=ins[k]; if(!inp)continue;
        for(let i=1;i<inp.length;i++){ const v=inp[i]; if(typeof v==='string'&&B[v]&&B[v].opcode) walk(v); else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]]) walk(v[1]); } }
      cur=b.next; } }
  for(const id of Object.keys(B)){ const b=B[id]; if(!b||b.opcode!=='procedures_definition') continue;
    const proto=B[b.inputs.custom_block[1]]; if(proto.mutation.proccode!==code) continue; walk(b.next); }
  return out;
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a5'), Bp=readProj('_work/v5/rebuild.sb3','_work/tmp/b5');
for(const code of ['init_vm']){
  const a=seq(A,code), b=seq(Bp,code);
  console.log('shipped ops',a.length,'rebuilt ops',b.length);
  // longest common subsequence based diff (simple: find first/last divergence windows)
  let i=0; while(i<a.length&&i<b.length&&a[i]===b[i]) i++;
  let j=0; while(j<a.length-i-1&&j<b.length-i-1&&a[a.length-1-j]===b[b.length-1-j]) j++;
  console.log('common prefix',i,'common suffix',j);
  console.log('--- shipped divergent window ('+(a.length-i-j)+' ops) ---');
  console.log(a.slice(i, a.length-j).join(' '));
  console.log('--- rebuilt divergent window ('+(b.length-i-j)+' ops) ---');
  console.log(b.slice(i, b.length-j).join(' '));
}
