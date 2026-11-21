const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const proj=JSON.parse(ents.find(e=>e.name==='project.json').data.toString('utf8'));
const blocks={};
for(const t of proj.targets) for(const id in t.blocks) blocks[id]=Object.assign({_t:t.name}, t.blocks[id]);
const kids={};
for(const id in blocks){ const p=blocks[id].parent; if(p!=null){ (kids[p]=kids[p]||[]).push(id); } }
function txt(id){ const b=blocks[id]; if(!b) return ''; let s=b.opcode;
  for(const k in (b.fields||{})) s+=' '+k+'='+JSON.stringify(b.fields[k][0]);
  for(const k in (b.inputs||{})){ const v=b.inputs[k]; if(v&&typeof v[1]==='string'){ const ob=blocks[v[1]]; if(ob&&ob.fields&&Object.keys(ob.fields).length) s+=' '+k+'='+Object.keys(ob.fields).map(f=>JSON.stringify(ob.fields[f][0])).join('/'); } }
  return s; }
let p=Object.keys(blocks).find(id=>blocks[id].opcode==='data_variable' && blocks[id].fields && blocks[id].fields.VARIABLE && blocks[id].fields.VARIABLE[0]==='fbrk');
const seen=new Set();
while(p && blocks[p].opcode!=='control_repeat_until' && !seen.has(p)){ seen.add(p); p=blocks[p].parent; }
console.log('loop:', p && blocks[p].opcode);
function dump(id,d){ const b=blocks[id]; if(!b) return;
  console.log('  '.repeat(d)+(blocks[id].parent_input||'')+' '+txt(id));
  if(d>16) return;
  const list=(kids[id]||[]).slice().sort((a,b)=>String(blocks[a].parent_input||'').localeCompare(String(blocks[b].parent_input||'')));
  for(const s of list) dump(s,d+1); }
if(p) dump(p,0);