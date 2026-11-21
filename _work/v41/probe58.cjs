'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.30.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const it = j.targets.find(t => /Interp/i.test(t.name));
const tr = j.targets.find(t => t.name === 'TextRenderer');
const showDel = (t, op, listName) => {
  const out = [];
  for (const [id, b] of Object.entries(t.blocks)) {
    if (b.opcode !== op) continue;
    const l = b.fields && b.fields.LIST ? b.fields.LIST[0] : null;
    if (l === listName) out.push(id + ' ' + JSON.stringify(b.inputs));
  }
  return out;
};
console.log('execute def?', Object.values(it.blocks).filter(b => b.opcode==='procedures_prototype').map(b=>b.mutation.proccode).filter(p=>/execute/.test(p)));
console.log('Interp data_deleteoflist Names:', showDel(it, 'data_deleteoflist', 'Names'));
console.log('Interp data_deleteoflist Values:', showDel(it, 'data_deleteoflist', 'Values'));
console.log('Interp data_deleteoflist Types:', showDel(it, 'data_deleteoflist', 'Types'));
console.log('Stage clear Names:', showDel(j.targets.find(t=>t.isStage), 'data_deletealloflist', 'Names'));
console.log('Interp clear Names:', showDel(it, 'data_deletealloflist', 'Names'));
console.log('Interp clear FN/FV/FT:', showDel(it,'data_deletealloflist','FN'), showDel(it,'data_deletealloflist','FV'), showDel(it,'data_deletealloflist','FT'));
// TextRenderer draw panel line
for (const [id, b] of Object.entries(tr.blocks)) {
  const s = JSON.stringify(b);
  if (b.opcode === 'procedures_call' && s.includes('Names')) console.log('TR panel call', id, s.slice(0,700));
}
