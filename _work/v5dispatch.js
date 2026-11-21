
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const t=p.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
function kids(id){const b=B[id];const out=[];if(b.next)out.push(b.next);
 for(const k in (b.inputs||{})){const inp=b.inputs[k];if(!inp)continue;for(let i=1;i<inp.length;i++){const v=inp[i];
  if(typeof v==='string')out.push(v);else if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string')out.push(v[1]);}}
 return out.filter(x=>B[x]&&B[x].opcode);}
function inputBlock(id,name){const b=B[id];const inp=b.inputs[name];if(!inp)return null;
  for(let i=1;i<inp.length;i++){const v=inp[i]; if(typeof v==='string'&&B[v])return v; if(Array.isArray(v)&&!PRIM.has(v[0])&&typeof v[1]==='string'&&B[v[1]]) return v[1];} return null;}
const root='v5def5d';
// find the repeat_until in vm_run and walk its if-else chain
let ru=null;
(function dfs(id){ if(ru)return; const b=B[id]; if(b.opcode==='control_repeat_until'){ru=id;return;} for(const c of kids(id)) dfs(c); })(root);
console.log('repeat_until id', ru, 'opcode', B[ru].opcode);
let cur = inputBlock(ru,'SUBSTACK');
const ops=[]; let n=0; let depthMax=0;
while(cur && B[cur]){ const b=B[cur]; n++;
  if(b.opcode==='control_if_else'||b.opcode==='control_if'){
    // condition
    let condId=inputBlock(cur,'CONDITION'); const cb=condId?B[condId]:null;
    let desc='?';
    if(cb){ const op=cb.opcode;
      const parts=[];
      for(const k of Object.keys(cb.inputs)){ const inp=cb.inputs[k]; if(!inp)continue; const v0=inp[1];
        if(Array.isArray(v0)&&PRIM.has(v0[0])) parts.push(JSON.stringify(v0[1]));
        else { const bid = (typeof v0==='string')?v0:v0[1]; const bb=B[bid]; parts.push(bb?bb.opcode:''); } }
      desc=op+'('+parts.join(',')+')';
    }
    ops.push(b.opcode+' <- '+desc);
  } else {
    ops.push(b.opcode);
  }
  const nx = b.opcode==='control_if_else' ? inputBlock(cur,'SUBSTACK2') : null;
  if(nx){ // nested chain: descend into else; also record then-branch size
    const thenId=inputBlock(cur,'SUBSTACK');
    const cnt=(function(){let s=0;const st=thenId?[thenId]:[];const seen=new Set();while(st.length){const x=st.pop();if(seen.has(x))continue;seen.add(x);s++;for(const c of kids(x))st.push(c);}return s;})();
    ops[ops.length-1]+='  THEN='+cnt+' blocks';
    cur=nx; depthMax=Math.max(depthMax,1);
  } else cur=b.next;
  if(n>200) break;
}
console.log('dispatch chain entries:', n);
console.log(ops.slice(0,80).join('\n'));
