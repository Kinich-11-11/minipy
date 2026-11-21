'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('_work/v41/v431_p58.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const t = j.targets.find(x => /Interp/i.test(x.name));
const B = t.blocks;
const def = Object.entries(B).find(([id,b]) => b.opcode==='procedures_definition' && b.inputs.custom_block && B[b.inputs.custom_block[1]].mutation && B[b.inputs.custom_block[1]].mutation.proccode === 'dictpair %s %s');
let cur = B[def[0]].next, g=0;
while (cur && g++ < 200) {
  const b = B[cur];
  if (b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'DOut') {
    console.log('APPEND', cur, JSON.stringify(b.inputs));
    const itemId = b.inputs.ITEM[1];
    console.log('  item', itemId, JSON.stringify(B[itemId]));
  }
  cur = b.next;
}
