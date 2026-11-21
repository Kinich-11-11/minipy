const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const raw = zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8');
for (const needle of ['BINDBG', 'SFDBG', 'strFormat']) {
  console.log(needle + ': ' + (raw.split(needle).length - 1) + ' occurrences');
}
const proj = JSON.parse(raw);
const t = proj.targets.find(x=>x.name==='Interpreter');
let n = 0;
for (const id in t.blocks) { const b = t.blocks[id]; if (b.opcode === 'data_itemoflist' && b.fields.LIST && b.fields.LIST[0] === 'Reg') n++; }
console.log('Reg item reads:', n);
console.log('Reg list defined:', !!(t.lists && Object.values(t.lists).some(v => (v[0]||v.name) === 'Reg')));