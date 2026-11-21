const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const proj=JSON.parse(ents.find(e=>e.name==='project.json').data.toString('utf8'));
const blocks={};
for(const t of proj.targets) for(const id in t.blocks) blocks[id]=Object.assign({_t:t.name}, t.blocks[id]);
const kids={};
for(const id in blocks){ const p=blocks[id].parent; if(p!=null){ (kids[p]=kids[p]||[]).push(id); } }
const needle=process.argv[3];
const hit=Object.keys(blocks).find(id=>JSON.stringify(blocks[id]).indexOf(needle)>=0);
console.log('hit', hit, blocks[hit]&&blocks[hit].opcode);
// walk up to the control_if that tests mname
let cur=hit, guard=0;
while(cur && blocks[cur].opcode!=='control_if' && blocks[cur].opcode!=='control_if_else' && guard++<50) cur=blocks[cur].parent;
console.log('branch root', cur, blocks[cur]&&blocks[cur].opcode);
function txt(id){ const b=blocks[id]; if(!b) return ''; let s=b.opcode;
  for(const k in (b.fields||{})) s+=' '+k+'='+JSON.stringify(b.fields[k][0]);
  return s; }
function dump(id,d){ const b=blocks[id]; if(!b) return;
  console.log('  '.repeat(d)+txt(id).slice(0,110));
  if(d>14) return;
  const list=(kids[id]||[]).slice().sort((a,b)=>String(blocks[a].parent_input||'').localeCompare(String(blocks[b].parent_input||'')));
  for(const s of list) dump(s,d+1); }
if(cur) dump(cur,0);