const p=require('./project234.json');
const it=p.targets.find(t=>t.name==='Interpreter'); const BL=it.blocks;
const defs={};for(const [id,b] of Object.entries(BL))if(b.opcode==='procedures_definition'&&b.inputs.custom_block){const q=BL[b.inputs.custom_block[1]];if(q&&q.mutation)defs[q.mutation.proccode]=id;}
const exDef=defs['execute'];
function summ(i,d){if(!i||d>10)return '';const b=BL[i];if(!b)return '';const f=b.fields&&Object.values(b.fields).map(x=>JSON.stringify(Array.isArray(x)?x[0]:x)).join(',');let s=b.opcode+(f?'['+f+']':'');const parts=[];for(const [k,v] of Object.entries(b.inputs||{})){if(Array.isArray(v)&&typeof v[1]==='string'&&BL[v[1]]){const q=summ(v[1],d+1);if(!q.includes('control_'))parts.push(k+'='+q);}}
 if(parts.length)s+='('+parts.join(' ').slice(0,160)+')';return s;}
// top-level index of control_if containing set w5eq and the z7augk anchor
const w5=Object.entries(BL).find(([i,b])=>b.opcode==='data_setvariableto'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='w5eq');
const z7=Object.entries(BL).find(([i,b])=>b.opcode==='data_setvariableto'&&b.fields&&b.fields.VARIABLE&&b.fields.VARIABLE[0]==='z7augk');
function topOf(id){let par=BL[id].parent,last=null;while(par){const b=BL[par];if(par===exDef)break;last=par;par=b.parent;}return last;}
const w5top=topOf(w5[0]), z7top=topOf(z7[0]);
let c=BL[exDef].next,g=0;
while(c&&g++<400){if(c===w5top)console.log('w5 host toplevel index',g,summ(c,0).slice(0,200));if(c===z7top)console.log('z7 inserted after toplevel index',g,summ(c,0).slice(0,200));c=BL[c].next;}
