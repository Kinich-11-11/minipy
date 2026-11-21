const fs=require('fs'), cp=require('child_process');
function readProj(sb3,out){ fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  cp.execSync('powershell -NoProfile -Command "Expand-Archive -LiteralPath \''+sb3.replace(/'/g,"''")+'\' -DestinationPath \''+out.replace(/'/g,"''")+'\' -Force"',{stdio:'ignore'});
  const p=JSON.parse(fs.readFileSync(out+'/project.json','utf8'));
  const names={}; for(const t of p.targets){ for(const k in (t.variables||{})) names[k]=t.name+'.'+t.variables[k][0]; for(const k in (t.lists||{})) names[k]=t.name+'.'+t.lists[k][0]; }
  return {p, B:p.targets.find(x=>x.name==='Interpreter').blocks, names};
}
const A=readProj('MiniPy_v5.sb3','_work/tmp/a8');
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function inputBlock(B,id,name){ const b=B[id]; const inp=b.inputs&&b.inputs[name]; if(!inp)return null;
  for(let i=1;i<inp.length;i++){const v=inp[i]; if(typeof v==='string'&&B[v]&&B[v].opcode)return v; if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]])return v[1];} return null; }
// find vm_run definition
let def=null;
for(const id of Object.keys(A.B)){ const b=A.B[id]; if(b.opcode==='procedures_definition'){ const pr=A.B[b.inputs.custom_block[1]]; if(pr.mutation.proccode==='vm_run') def=id; } }
// find the repeat_until inside
let ru=null;
(function dfs(id){ const b=A.B[id]; if(!b)return; if(b.opcode==='control_repeat_until'){ru=id;return;} if(ru)return;
  if(b.next)dfs(b.next); for(const k in (b.inputs||{})){ const c=inputBlock(A.B,id,k); if(c)dfs(c);} })(A.B[def].next);
console.log('repeat_until', ru);
let cur=inputBlock(A.B,ru,'SUBSTACK');
let n=0;
function show(id,d){
  if(!id||n>60) return; const b=A.B[id]; if(!b) return; n++;
  let f='';
  if(b.fields){ for(const k of Object.keys(b.fields)){ const v=b.fields[k]; f+=' '+k+'='+(A.names[v[1]]||v[1]); } }
  let lit='';
  for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp)continue; let l=null;
    for(let i=1;i<inp.length;i++){ const v=inp[i]; if(Array.isArray(v)&&PRIM.has(v[0])){l=v[1];break;} }
    if(l!==null) lit+=' '+k+'="'+l+'"'; }
  console.log('  '.repeat(d)+b.opcode+f+lit);
  for(const k in (b.inputs||{})){ const c=inputBlock(A.B,id,k); if(c) show(c,d+1); }
  if(b.next) show(b.next,d);
}
show(cur,0);
