const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const byId = t.blocks;
let found = 0, defs = 0;
for (const id in byId) {
  const b = byId[id];
  if (b.opcode === 'procedures_definition') defs++;
  if (b.opcode === 'data_replaceitemoflist' && b.fields.LIST && b.fields.LIST[0] === 'FnFlags') {
    found++;
    const it = b.inputs.ITEM;
    let lit = null;
    if (it && typeof it[1] === 'string' && byId[it[1]]) { const ib = byId[it[1]]; lit = ib.fields.TEXT ? ib.fields.TEXT[0] : ib.opcode; }
    else if (Array.isArray(it)) lit = JSON.stringify(it[1]);
    console.log('FnFlags write item=' + JSON.stringify(lit));
  }
}
console.log('FnFlags writes =', found, ' procedures =', defs);
// also: which opcodes appear in the dispatch? look for the equals against GDEF
const texts = new Set();
for (const id in byId) { const b = byId[id]; if (b.opcode === 'operator_equals') { const i2 = b.inputs.OPERAND2; if (i2 && typeof i2[1] === 'string' && byId[i2[1]] && byId[i2[1]].fields.TEXT) texts.add(byId[i2[1]].fields.TEXT[0]); } }
console.log('opcode names compared in dispatch:', [...texts].filter(x => /^[A-Z]+$/.test(x)).sort().join(' '));