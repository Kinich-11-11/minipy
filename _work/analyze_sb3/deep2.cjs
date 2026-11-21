
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const known = /^(motion|looks|sound|event|control|sensing|operator|data|procedures|argument|pen|music|video|text2speech|translate|makeymakey|microbit|ev3|boost|wedo2|gdxfor|speech|turbo|enhance|music)_/;
const odd = {};
for (const t of p.targets) for (const id in (t.blocks||{})) {
  const o = t.blocks[id].opcode;
  if (!known.test(o)) odd[o] = (odd[o]||0)+1;
}
console.log('NON-STANDARD PREFIX OPCODES:', JSON.stringify(odd));
// py procedures
const t = p.targets.find(x=>x.name==='Interpreter');
if (t) {
  const names = [];
  for (const id in t.blocks) { const b=t.blocks[id]; if (b.opcode==='procedures_prototype') names.push(b.mutation.proccode); }
  console.log('Interpreter procs (' + names.length + '):');
  console.log(names.join('\n'));
  const v = Object.values(t.variables).map(x=>x[0]);
  console.log('--- Interpreter VARS(' + v.length + ') sample:');
  console.log(v.slice(0,120).join(' | '));
}
