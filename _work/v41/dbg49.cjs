'use strict';
const fs=require('fs');
const P=JSON.parse(fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v423.json','utf8'));
const t=P.targets.find(x=>x.name==='Interpreter'); const B=t.blocks;
function findDef(pc){for(const [id,b] of Object.entries(B)){if(b.opcode==='procedures_definition'&&b.inputs&&b.inputs.custom_block){const pr=B[b.inputs.custom_block[1]];if(pr&&pr.mutation&&pr.mutation.proccode===pc)return id;}}throw new Error('no '+pc);}
function reach(roots){const seen=new Set();const st=[].concat(roots);while(st.length){const id=st.pop();if(!id||seen.has(id))continue;const b=B[id];if(!b)continue;seen.add(id);for(const v of Object.values(b.inputs||{})){if(v&&typeof v[1]==='string')st.push(v[1]);}if(b.next)st.push(b.next);}return seen;}
const ig=reach(findDef('indexget %s %s'));
const isArg=(d,n)=>{ if(!d||d[0]!==3||typeof d[1]!=='string')return false; const b=B[d[1]]; return b&&b.opcode==='argument_reporter_string_number'&&b.fields.VALUE[0]===n; };
const isLit=(d,n)=>Array.isArray(d[1])&&d[1][0]===4&&String(d[1][1])===String(n);
const adds=[...ig].filter(id=>B[id].opcode==='operator_add'&&isArg(B[id].inputs.NUM1,'lo')&&isLit(B[id].inputs.NUM2,2));
console.log('found '+adds.length);
function path(id){ const out=[]; let cur=id,g=0; while(cur&&g++<6){ const p=Object.entries(B).find(([k,b])=>Object.values(b.inputs||{}).some(v=>v&&v[1]===cur)); if(!p) break; out.push(p[0]+':'+p[1].opcode); cur=p[0]; } return out.join(' <- '); }
for(const id of adds) console.log(id+'  :: '+path(id));