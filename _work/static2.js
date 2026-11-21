
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const L=[]; const log=(...a)=>L.push(a.join(' '));
const PRIM=new Set([4,5,6,7,8,9,10,11,12,13]);
for (const t of p.targets){
  const B=t.blocks;
  const ids=Object.keys(B).filter(id=>B[id]&&B[id].opcode);
  log('===== '+t.name+' ('+ids.length+' blocks) =====');
  // proper child extraction
  function children(id){ const b=B[id]; const out=[];
    if(b.next) out.push(b.next);
    for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp) continue;
      for(let i=1;i<inp.length;i++){ const v=inp[i];
        if(typeof v==='string') out.push(v);
        else if(Array.isArray(v)){ if(PRIM.has(v[0])) continue; if(typeof v[1]==='string') out.push(v[1]); }
      } }
    return out.filter(x=>B[x]&&B[x].opcode);
  }
  // dangling
  let dangling=0, dangEx=[];
  for(const id of ids){ for(const c of children(id)) if(!B[c]) {dangling++; dangEx.push(B[id].opcode+'->'+c);} }
  const rawDangling=[];
  for(const id of ids){ const b=B[id];
    if(b.next && !B[b.next]) rawDangling.push(b.opcode+'.next');
    for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp)continue;
      for(let i=1;i<inp.length;i++){ const v=inp[i];
        if(typeof v==='string' && !PRIM.has(inp[0]) && !B[v]) rawDangling.push(b.opcode+'.'+k+'='+v.slice(0,12));
        else if(Array.isArray(v) && !PRIM.has(v[0]) && typeof v[1]==='string' && !B[v[1]]) rawDangling.push(b.opcode+'.'+k);
      } } }
  log('dangling refs: '+rawDangling.length+' '+JSON.stringify(rawDangling.slice(0,5)));
  // reachability from top-level
  const seen=new Set(); const stack=ids.filter(id=>B[id].topLevel);
  while(stack.length){const id=stack.pop(); if(seen.has(id))continue; seen.add(id); for(const c of children(id)) stack.push(c);}
  const unreach=ids.filter(id=>!seen.has(id));
  log('unreachable blocks: '+unreach.length);
  if(unreach.length){ log('  sample unreachable opcodes: '+JSON.stringify(unreach.slice(0,10).map(id=>B[id].opcode))); }
  // call graph: which top-level def contains which procedures_call
  const defs=ids.filter(id=>B[id].topLevel && B[id].opcode==='procedures_definition');
  for(const d of defs){
    const proto=B[B[d].inputs.custom_block[1]];
    const code=proto?proto.mutation.proccode:'?';
    const s=new Set(); const st=[d];
    while(st.length){const id=st.pop(); if(s.has(id))continue; s.add(id); for(const c of children(id)) st.push(c);}
    const calls={};
    for(const id of s){ if(B[id].opcode==='procedures_call'){ const pc=B[id].mutation.proccode; calls[pc]=(calls[pc]||0)+1; } }
    const nc=Object.keys(calls);
    log('  DEF '+code.padEnd(26)+' blocks='+String(s.size).padStart(6)+'  calls='+(nc.length?JSON.stringify(calls):'[] (LEAF)'));
  }
  // non-definition hats
  const other=ids.filter(id=>B[id].topLevel && B[id].opcode!=='procedures_definition');
  for(const id of other){ const s=new Set(); const st=[id];
    while(st.length){const x=st.pop(); if(s.has(x))continue; s.add(x); for(const c of children(x)) st.push(c);}
    const calls={}; for(const x of s){ if(B[x].opcode==='procedures_call'){const pc=B[x].mutation.proccode; calls[pc]=(calls[pc]||0)+1;} }
    log('  HAT '+B[id].opcode.padEnd(28)+' blocks='+String(s.size).padStart(6)+' calls='+JSON.stringify(calls));
  }
}
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-static2.txt', L.join('\n'));
console.log(L.join('\n'));
