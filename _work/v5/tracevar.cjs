const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p=JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t=p.targets.find(t=>t.name==='Interpreter'); const b=t.blocks;
const roots=Object.keys(b).filter(id=>JSON.stringify(b[id]).indexOf('|JROOT=[')>=0);
console.log('probe blocks', roots.length);
// find the variable read inside the JROOT join
let varIds=new Set();
function walk(id,d){ const bb=b[id]; if(!bb||d>6) return; if(bb.opcode==='data_variable'&&bb.fields.VARIABLE) varIds.add(bb.fields.VARIABLE[1]);
  for(const k in (bb.inputs||{})){ const v=bb.inputs[k]; if(v&&typeof v[1]==='string') walk(v[1],d+1); } }
for(const r of roots) walk(r,0);
console.log('vars read by probe', [...varIds].join(','));
for(const vid of varIds){
  const refs=Object.keys(b).filter(id=>b[id].fields&&b[id].fields.VARIABLE&&b[id].fields.VARIABLE[1]===vid);
  console.log('--- var', vid, 'refs', refs.length);
  for(const id of refs){
    let anc=[], c=id, g=0;
    while(c&&g++<60){ const bb=b[c]; if(bb.opcode&&(bb.opcode==='control_repeat_until'||bb.opcode==='control_if'||bb.opcode==='control_if_else')) anc.push(bb.opcode); c=bb.parent; }
    console.log('   ', b[id].opcode, 'ancestors:', anc.slice(0,6).join('<'), 'idx', refs.indexOf(id));
  }
}