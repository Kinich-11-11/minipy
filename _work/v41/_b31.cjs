const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
let c=BL[defs['execute']].next,g=0;
function show(id,d){const b=BL[id];if(!b)return;const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');console.log(' '.repeat(d)+b.opcode+(f?'['+f+']':''));for(const [k,v] of Object.entries(b.inputs||{})){if(k==='SUBSTACK'||k==='SUBSTACK2')continue;if(Array.isArray(v)&&typeof v[1]==='string'&&BL[v[1]])show(v[1],d+2);else if(Array.isArray(v)&&Array.isArray(v[1]))console.log(' '.repeat(d+2)+k+'='+JSON.stringify(v[1]));}}
while(c&&g++<40){if(g===31){const b=BL[c];console.log('=== #31');show(b.inputs.CONDITION[1],0);let s=b.inputs.SUBSTACK&&b.inputs.SUBSTACK[1],n=0;console.log('--- substack:');while(s&&n++<10){const q=BL[s];const f=q.fields&&Object.values(q.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');console.log(n,q.opcode+(f?'['+f+']':''),q.opcode==='procedures_call'?q.mutation.proccode:'');s=q.next;}
 break;}c=BL[c].next;}
