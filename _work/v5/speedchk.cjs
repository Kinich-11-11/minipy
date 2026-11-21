const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead('MiniPy_v5.sb3').find(e=>e.name==='project.json').data.toString('utf8'));
for (const t of proj.targets) {
  for (const id in (t.blocks||{})) { const b = t.blocks[id];
    if (b.fields && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'speed') {
      console.log(t.name + ' ' + id + ' ' + b.opcode + ' inputs=' + JSON.stringify(Object.keys(b.inputs||{})));
      for (const k in (b.inputs||{})) { const v = b.inputs[k]; if (Array.isArray(v)) console.log('    ' + k + ' = ' + JSON.stringify(v[1])); }
    } }
}
