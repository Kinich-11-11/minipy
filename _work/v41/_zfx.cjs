const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
function walk(i,out,d){if(!i||d>12)return;const b=BL[i];if(!b)return;const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');out.push(b.opcode+(f?'['+f+']':''));for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string')walk(v[1],out,d+1);}
function dump(i,d){if(!i||d>30)return;const b=BL[i];const s=[];walk(i,s,0);console.log(' '.repeat(d)+s.slice(0,2).join(' ') + (s.length>2?' …':'') );
 for(const v of Object.values(b.inputs||{}))if(Array.isArray(v)&&typeof v[1]==='string'&&BL[v[1]]&&(BL[v[1]].opcode.startsWith('control_')||BL[v[1]].opcode==='procedures_call'))dump(v[1],d+2);
 if(b.next)dump(b.next,d);}
const d=defs['zfscaled %s %s'];
let c=BL[d].next;
// print top-level chain of the proc
while(c){const b=BL[c];const w=[];walk(c,w,0);console.log(w.slice(0,4).join(' ').slice(0,200));c=b.next;}
