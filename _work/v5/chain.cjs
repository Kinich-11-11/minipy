const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const p=JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t=p.targets.find(t=>t.name==='Interpreter'); const b=t.blocks;
const byName={}; for(const k in t.variables) byName[t.variables[k][0]]=k;
const name=process.argv[3]; const vid=byName[name];
console.log('id', vid, 'name', name);
const refs=Object.keys(b).filter(id=>b[id].fields&&b[id].fields.VARIABLE&&b[id].fields.VARIABLE[1]===vid);
console.log('refs', refs.length);
for(const id of refs){
  let anc=[], c=b[id].parent, g=0;
  while(c&&g++<80){ anc.push(b[c].opcode.replace('control_','').replace('data_','')); c=b[c].parent; }
  console.log(' ', b[id].opcode, '<=', anc.slice(0,8).join('<'));
}