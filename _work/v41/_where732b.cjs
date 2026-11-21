const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const exDef=defs['execute'];
const id=Object.entries(BL).find(([i,b])=>b.opcode==='data_setvariableto'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='z7augk')[0];
let par=BL[id].parent, chain=[];
while(par){const b=BL[par];chain.push(par+':'+b.opcode);if(par===exDef)break;par=b.parent;}
console.log('chain root->leaf:',chain.reverse().slice(0,44).join(' > '));
let c=BL[exDef].next,g=0;
while(c&&g++<400){if(chain.some(x=>x.startsWith(c+':')))console.log('TOPLEVEL index',g,'id',c);c=BL[c].next;}
function walk(i,out,d){if(!i||d>8)return;const b=BL[i];if(!b)return;const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');out.push(b.opcode+(f?'['+f+']':''));for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')walk(v[1],out,d+1);}
const top=chain.reverse()[0]&&chain.reverse(); 
