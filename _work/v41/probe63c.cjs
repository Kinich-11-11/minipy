'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const ctrl = j.targets.find(t => t.name === 'Controller');
const it = j.targets.find(t => /Interp/i.test(t.name));
const names = (t) => { const m = {}; for (const [id, v] of Object.entries(t.variables||{})) m[id] = v[0]; for (const [id, v] of Object.entries(t.lists||{})) m[id] = v[0]; return m; };
const cn = names(ctrl), inn = names(it);
console.log('Controller vars has sodep:', Object.values(ctrl.variables||{}).some(v => v[0] === 'sodep'));
console.log('Stage vars has sodep:', Object.values(j.targets.find(t=>t.isStage).variables||{}).some(v => v[0] === 'sodep'));
// startRun body: count sodep sets
let srDef = null;
for (const [id, b] of Object.entries(ctrl.blocks)) {
  if (b.opcode !== 'procedures_definition' || !b.inputs.custom_block) continue;
  const pr = ctrl.blocks[b.inputs.custom_block[1]];
  if (pr && pr.mutation && pr.mutation.proccode === 'startRun %s') srDef = id;
}
let cur = ctrl.blocks[srDef].next, sets = 0, modes = 0, guard = 0;
const walk = (id) => {
  let c = id;
  while (c && guard++ < 300) {
    const b = ctrl.blocks[c];
    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE) {
      const n = b.fields.VARIABLE[0];
      if (n === 'sodep') sets++;
      if (n === 'mode') modes++;
    }
    for (const v of Object.values(b.inputs||{})) if (Array.isArray(v) && v[0] === 2 && typeof v[1] === 'string') walk(v[1]);
    c = b.next;
  }
};
walk(cur);
console.log('startRun: mode sets=' + modes + ' sodep sets=' + sets);
// OUT click zone
const zones = Object.values(ctrl.blocks).filter(b => b.opcode === 'operator_gt' && b.inputs.OPERAND1 && Array.isArray(b.inputs.OPERAND1[1]) && b.inputs.OPERAND1[1][1] === 'ux');
for (const z of zones) console.log('ux > ' + JSON.stringify(z.inputs.OPERAND2));
// interpreter gates
const paused = Object.values(it.blocks).filter(b => b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'status'
  && b.inputs.VALUE && b.inputs.VALUE[0] === 1 && String(b.inputs.VALUE[1][1]).indexOf('Paused') === 0);
console.log('pause status setters:', paused.map(b => JSON.stringify(b.inputs.VALUE[1][1])).join(' | '));
console.log('sodep uses in Interpreter:', Object.values(it.blocks).filter(b => JSON.stringify(b).includes('sodep')).length);
