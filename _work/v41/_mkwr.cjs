'use strict';
const fs = require('fs');
const { zipRead, zipWrite } = require('../sb3lib.js');
const entries = zipRead('MiniPy_v4.30.sb3');
const pj = entries.find(e => /project\.json$/.test(e.name));
const j = JSON.parse(pj.data.toString('utf8'));
const tr = j.targets.find(t => /Interp/i.test(t.name));
let n = 0;
for (const b of Object.values(tr.blocks)) {
  if (b.opcode === 'procedures_prototype' && b.mutation && /^calluser/.test(b.mutation.proccode)) {
    console.log('found', b.mutation.proccode, 'warp=', b.mutation.warp);
    b.mutation.warp = process.argv[3] === 'nw' ? 'false' : 'true';
    n++;
  }
}
pj.data = Buffer.from(JSON.stringify(j), 'utf8');
zipWrite(entries, process.argv[2]);
console.log('wrote', process.argv[2], 'patched', n);
