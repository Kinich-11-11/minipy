const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const d=defs['zfscaled %s %s'];
let c=BL[d].next; while(c && BL[c].opcode!=='control_if') c=BL[c].next; // first if (zero)
c=BL[c].next; // second if
console.log('2nd if cond ok; substack:');
let s=BL[c].inputs.SUBSTACK[1], n=0;
while(s && n++<20){const b=BL[s];const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');console.log(n, b.opcode+(f?'['+f+']':''), b.opcode==='procedures_call'?b.mutation.proccode:'');s=b.next;}
