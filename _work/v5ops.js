
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const t=p.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function children(id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const inp=b.inputs[k];if(!inp)continue;for(let i=1;i<inp.length;i++){const v=inp[i];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
function reach(root){const s=new Set();const st=[root];while(st.length){const id=st.pop();if(s.has(id))continue;s.add(id);for(const c of children(id))st.push(c);}return s;}
const vmRun=reach('v5def5d');
// collect string literals inside vm_run
const lits=new Map();
function scanInputs(id, cb){const b=B[id]; for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp)continue;
  const walk=(v)=>{ if(Array.isArray(v)){ if(PRIM.has(v[0])&&typeof v[1]==='string') cb(v[0],v[1],b,k); else for(const x of v) walk(x);} };
  walk(inp);} }
for(const id of vmRun){ scanInputs(id,(type,val)=>{ lits.set(val,(lits.get(val)||0)+1); }); }
const all=[...lits.keys()];
const opcodes=all.filter(s=>/^[A-Z][A-Z0-9_]{1,12}$/.test(s));
console.log('string literals in vm_run:', all.length);
console.log('UPPERCASE-looking literals ('+opcodes.length+'):');
console.log(opcodes.sort().join(' '));
// dispatch chain: control_if_else whose condition is operator_equals comparing Iop item
let dispatch=0;
for(const id of vmRun){ const b=B[id]; if(b.opcode!=='control_if_else'&&b.opcode!=='control_if') continue;
  const cond=b.inputs.CONDITION; if(!cond)continue; const cid=Array.isArray(cond[1])?cond[1][1]:cond[1];
  const cb=B[cid]; if(!cb)continue;
  const isEq = cb.opcode==='operator_equals'||cb.opcode==='operator_contains';
  if(isEq){ // check one side is Iop item
    for(const k in cb.inputs){ const inp=cb.inputs[k]; if(!inp)continue; let v=Array.isArray(inp[1])?inp[1][1]:inp[1]; const vb=B[v];
      if(vb&&vb.opcode==='data_itemoflist'){ const f=vb.fields.LIST; if(f&&f[0]==='Iop') dispatch++; } } }
}
console.log('dispatch branches comparing Iop:', dispatch);
// list usage frequency across whole Interpreter
const listUse={};
for(const id of Object.keys(B)){const b=B[id]; if(!b||!b.opcode)continue;
 for(const k in (b.fields||{})){ const f=b.fields[k];
   if(/^(LIST|VARIABLE)$/.test(k) && f && f[1]) { } }
}
// opcode handler size distribution: count blocks per control_if_else branch at depth1 of vm_run
const vmRunRoot=B['v5def5d'];
let topChain=0; let cur=vmRunRoot.next; const chainOps={};
while(cur){ const b=B[cur]; if(!b)break; topChain++; chainOps[b.opcode]=(chainOps[b.opcode]||0)+1; cur=b.next; }
console.log('vm_run top-level chain length:', topChain, JSON.stringify(chainOps));
console.log('vm_run total blocks:', vmRun.size);
// Reg list
console.log('Reg list declared in Interpreter?', Object.values(t.lists||{}).filter(l=>l[0]==='Reg').map(l=>l[1].length));
