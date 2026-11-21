
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v5/project.json','utf8'));
const L=[]; const log=(...a)=>L.push(a.join(' '));
for (const t of p.targets){
  const B=t.blocks; const ids=Object.keys(B);
  log('===== '+t.name+' =====');
  // 1. opcode histogram top
  const ops={}; for(const id of ids){const b=B[id]; if(b&&b.opcode) ops[b.opcode]=(ops[b.opcode]||0)+1;}
  const sorted=Object.entries(ops).sort((a,b)=>b[1]-a[1]);
  log('opcodes: '+sorted.length+' distinct');
  log('top20: '+sorted.slice(0,20).map(([k,v])=>k+':'+v).join('  '));
  const customCalls = sorted.filter(([k])=>k==='procedures_call');
  log('procedures_call total = '+ (customCalls.length? customCalls[0][1]:0));
  // parent integrity
  let noParent=[], badParent=[], orphan=0;
  for(const id of ids){ const b=B[id]; if(!b||!b.opcode) continue;
    if(b.topLevel){ if(b.parent!==null) badParent.push(id); }
    else { if(b.parent===null||b.parent===undefined) noParent.push(id); else if(!B[b.parent]) badParent.push(id); }
  }
  log('non-topLevel without parent: '+noParent.length+'  badParent: '+badParent.length);
  // dangling input refs
  let dangling=0;
  for(const id of ids){ const b=B[id]; if(!b||!b.opcode) continue;
    for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp)continue;
      for(let i=1;i<inp.length;i++){ const v=inp[i];
        const refs=[];
        if(typeof v==='string') refs.push(v);
        else if(Array.isArray(v)){ if(typeof v[1]==='string') refs.push(v[1]); }
        for(const r of refs) if(!B[r]) dangling++;
      } }
    if(b.next && !B[b.next]) dangling++;
  }
  log('dangling refs: '+dangling);
  // shadow health: check inputs that need shadow have one
  const noShadow={};
  for(const id of ids){ const b=B[id]; if(!b||!b.opcode) continue;
    for(const k in (b.inputs||{})){ const inp=b.inputs[k]; if(!inp)continue;
      if(inp.length<2){ noShadow[b.opcode+'.'+k]=(noShadow[b.opcode+'.'+k]||0)+1; }
    } }
  log('inputs missing value (len<2): '+JSON.stringify(Object.entries(noShadow).slice(0,10)));
  // procedure call arg mismatch check
  const protos={};
  for(const id of ids){ const b=B[id]; if(b&&b.opcode==='procedures_prototype'){ protos[b.mutation.proccode]=JSON.parse(b.mutation.argumentnames).length; } }
  const callCounts={};
  for(const id of ids){ const b=B[id]; if(b&&b.opcode==='procedures_call'){ const pc=b.mutation.proccode; callCounts[pc]=(callCounts[pc]||0)+1;
     const nargs = Object.keys(b.inputs).length;
     const want = protos[pc];
     if(want!==undefined && nargs!==want) log('MISMATCH call '+pc+' has '+nargs+' inputs want '+want);
     if(want===undefined) log('CALL TO UNDEFINED: '+pc);
  }}
  log('procedure calls: '+JSON.stringify(callCounts));
  const called = new Set(Object.keys(callCounts));
  const defined = new Set(Object.keys(protos));
  log('defined but never called: '+[...defined].filter(x=>!called.has(x)).join(', '));
}
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v5-static.txt', L.join('\n'));
console.log(L.join('\n'));
