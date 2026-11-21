'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const all = [];
for (const t of j.targets) { for (const v of Object.values(t.variables||{})) all.push(t.name + ':' + v[0]); for (const v of Object.values(t.lists||{})) all.push(t.name + ':' + v[0]); }
for (const w of ['live','depth','vspin','sodep','smode','stick','sstep','mv','tv','sv']) {
  const hits = all.filter(x => x.endsWith(':' + w));
  console.log(w.padEnd(7) + (hits.length ? ' present -> ' + hits.join(', ') : ' absent'));
}
const tr = j.targets.find(t => t.name === 'TextRenderer');
console.log('TextRenderer draws at (-118,146):', JSON.stringify(tr.blocks).includes('"-118"'));
const it = j.targets.find(t => /Interp/i.test(t.name));
const paused = Object.values(it.blocks).filter(b => b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'status' && b.inputs.VALUE && b.inputs.VALUE[0] === 1 && String(b.inputs.VALUE[1][1]).indexOf('Paused') === 0);
console.log('pause messages:', paused.map(b => b.inputs.VALUE[1][1]).join(' | '));
