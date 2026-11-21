const fs=require('fs');
const {zipRead}=require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const walk=(f,label)=>{
  const e=zipRead('D:/编程/scratch/ai/minipython/'+f);
  const pj=JSON.parse(e.find(x=>x.name==='project.json').data.toString('utf8'));
  realLog('#### '+label);
  for (const t of pj.targets) {
    const blocks=t.blocks||{};
    const parents=new Map();
    for (const [id,b] of Object.entries(blocks)) { if(b.next) parents.set(b.next,id); for (const v of Object.values(b.inputs||{})) if(typeof v[1]==='string') parents.set(v[1],id); }
    for (const [id,b] of Object.entries(blocks)) {
      if (b.opcode!=='sensing_askandwait' && b.opcode!=='sensing_answer') continue;
      let cur=id,d=0,top=id;
      while(cur && d++<200){ const p=parents.get(cur); if(!p) break; cur=p; if(blocks[cur].topLevel){ top=cur; break; } }
      const h=blocks[top];
      const f2=(k)=>(h.fields&&h.fields[k])?h.fields[k][0]:'';
      let name=h.opcode;
      if (h.opcode==='procedures_definition') { const cb=blocks[h.inputs.custom_block[1]]; name='PROC '+((cb.mutation||{}).proccode||''); }
      realLog('  '+t.name+' '+b.opcode+' in '+name+' '+f2('KEY_OPTION')+f2('BROADCAST_OPTION'));
    }
  }
};
const realLog=console.log.bind(console);
walk('MiniPy_v4.sb3','v4');
walk('MiniPy_v6.sb3','v6');
