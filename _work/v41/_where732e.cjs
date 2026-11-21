const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const exDef=defs['execute'];
function summ(i,d){if(!i||d>12)return '…';const b=BL[i];if(!b)return '?';const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');let s=b.opcode+(f?'['+f+']':'');const parts=[];for(const [k,v] of Object.entries(b.inputs||{})){if(Array.isArray(v)&&typeof v[1]==='string'&&BL[v[1]])parts.push(k+'='+summ(v[1],d+1));else if(Array.isArray(v))parts.push(k+'='+JSON.stringify(v[1]));}
 if(parts.length)s+='('+parts.join(' ').slice(0,220)+')';return s;}
let c=BL[exDef].next,g=0;
while(c&&g++<40){const b=BL[c];console.log('#'+g, summ(c,0).slice(0,260));c=b.next;}
