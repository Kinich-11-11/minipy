const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const ents=zipRead(process.argv[2]);
const pj=ents.find(e=>e.name==='project.json');
const proj=JSON.parse(pj.data.toString('utf8'));
const blocks={};
for(const t of proj.targets) for(const id in t.blocks) blocks[id]=Object.assign({_t:t.name}, t.blocks[id]);
const needle=process.argv[3];
const hits=Object.keys(blocks).filter(id=>JSON.stringify(blocks[id]).indexOf(needle)>=0);
console.log('hits', hits.length);
if(!hits.length) process.exit(0);
let cur=hits[0]; const seen=new Set();
while(blocks[cur] && blocks[cur].opcode!=='procedures_definition' && !seen.has(cur)){ seen.add(cur); cur=blocks[cur].parent; }
console.log('proc root', blocks[cur] && blocks[cur].opcode);
const kids={};
for(const id in blocks){ const p=blocks[id].parent; if(p!=null){ (kids[p]=kids[p]||[]).push(id); } }
function dump(id,d){
  const b=blocks[id]; if(!b) return;
  let extra='';
  for(const k in (b.fields||{})) extra+=' '+k+'='+JSON.stringify(b.fields[k][0]);
  for(const k in (b.inputs||{})){ const v=b.inputs[k]; if(v && typeof v[1]==='string'){ const ob=blocks[v[1]]; extra+=' '+k+'='+(ob&&ob.fields?Object.keys(ob.fields).map(f=>JSON.stringify(ob.fields[f][0])).join('/'):JSON.stringify(v[1])); } }
  console.log('  '.repeat(d)+b.opcode+extra.slice(0,80));
  if(d>18) return;
  const list=(kids[id]||[]).slice();
  list.sort((a,b)=>String(blocks[a].parent_input||'').localeCompare(String(blocks[b].parent_input||'')));
  for(const s of list) dump(s,d+1);
}
dump(cur,0);