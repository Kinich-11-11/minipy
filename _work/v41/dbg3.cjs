const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const t=P.targets.find(t=>t.name==='Interpreter'); const B=t.blocks;
function defIdOf(pc){for(const id in B){const b=B[id];if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const p=B[b.inputs.custom_block[1]];if(p&&p.mutation&&p.mutation.proccode===pc)return id;}}throw new Error('nf');}
function dump(id,ind,depth){
  if(!id||depth>8) return;
  const b=B[id]; if(!b){console.log(' '.repeat(ind)+'<missing>');return;}
  const desc=(k)=>{const v=b.inputs[k]; if(!v) return k+'=<none>'; const x=v[1];
    if(typeof x==='string') return k+'=(block)'; return k+'='+JSON.stringify(x);};
  const f=Object.entries(b.fields||{}).map(([k,v])=>k+':'+JSON.stringify(v[0])).join(' ');
  console.log(' '.repeat(ind)+b.opcode+'  '+f+'  '+Object.keys(b.inputs||{}).map(desc).join(' | '));
  for(const [k,v] of Object.entries(b.inputs||{})){ if(v&&typeof v[1]==='string') dump(v[1],ind+2,depth+1); }
}
const d=defIdOf('eval %s %s');
let id=B[d].next; let n=0;
while(id && n<12){ const b=B[id]; n++; if(n>=3&&n<=7){ console.log('--- stmt '+n+' '+b.opcode); dump(id,2,0);} id=b.next; }
