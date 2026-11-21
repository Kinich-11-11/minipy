
const fs = require('fs');
for (const f of ['8086','py']) {
  const p = JSON.parse(fs.readFileSync(process.argv[2] + '\\' + f + '.json','utf8'));
  console.log('##### ' + f);
  const known = /^(motion|looks|sound|event|control|sensing|operator|data|procedures|argument|pen|music|video|text2speech|translate|makeymakey|microbit|ev3|boost|wedo2|gdxfor|speech|turbo|enhance|music)_/;
  for (const t of p.targets) for (const id in (t.blocks||{})) {
    const b = t.blocks[id];
    if (!known.test(b.opcode)) console.log('  ODD target=' + t.name + ' opcode=' + b.opcode + ' -> ' + JSON.stringify(b).slice(0,400));
  }
  const t2 = p.targets.find(x=>x.name==='Interpreter');
  if (t2) {
    const names = [];
    for (const id in t2.blocks) { const b=t2.blocks[id]; if (b.opcode==='procedures_prototype') names.push(b.mutation.proccode); }
    console.log('  Interpreter procs (' + names.length + '):');
    console.log(names.join('\n'));
    const v = Object.values(t2.variables).map(x=>x[0]);
    console.log('  --- Interpreter VARS(' + v.length + ') first 150:');
    console.log(v.slice(0,150).join(' | '));
  }
}
