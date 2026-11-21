
const fs = require('fs');
const base = 'D:/编程/scratch/ai/minipython/_work/cmp47/';
const A = JSON.parse(fs.readFileSync(base+'v4/project.json','utf8'));
const B = JSON.parse(fs.readFileSync(base+'v7/project.json','utf8'));
const out=[]; const p=(...x)=>out.push(x.join(' '));
function findStr(P, needle){
  const hits=[];
  for (const t of P.targets){
    for (const id of Object.keys(t.blocks)){
      const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
      let hit=false;
      for(const [k,v] of Object.entries(b.fields||{})) if(v[0]===needle) hit=true;
      for(const [k,v] of Object.entries(b.inputs||{})){const val=v[1]; if(Array.isArray(val)&&val[1]===needle) hit=true;}
      if(hit) hits.push([t.name,id,b.opcode,JSON.stringify(b).slice(0,240)]);
    }
  }
  return hits;
}
for (const [tag,P] of [['v4',A],['v7',B]]){
  const h = findStr(P, 'Waiting for input');
  p('== ' + tag + ' blocks with "Waiting for input": ' + h.length);
  h.slice(0,6).forEach(x=>p('   ' + JSON.stringify(x)));
  // which sprites listen for ANSWER-ish broadcasts
  for (const t of P.targets){
    for (const id of Object.keys(t.blocks)){
      const b=t.blocks[id]; if(!b||typeof b!=='object') continue;
      if (b.opcode==='event_whenbroadcastreceived'){ const nm=b.fields.BROADCAST_OPTION[0];
        if (/ANS|KEY|INP|RUN|HALT|INIT/i.test(nm)) p('   hat ' + t.name + ' <- ' + nm); }
      if (b.opcode && b.opcode.startsWith('sensing_')) p('   sensing ' + t.name + ' ' + b.opcode);
    }
  }
}
fs.writeFileSync(base+'inputflow.txt', out.join('\n'),'utf8');
console.log(out.join('\n').slice(0,5000));
