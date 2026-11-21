'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
for (const f of ['MiniPy_v4.31.sb3','MiniPy_v4.32.sb3']) {
  const j = JSON.parse(zipRead(f).find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
  const it = j.targets.find(t => /Interp/i.test(t.name));
  const protos = Object.values(it.blocks).filter(b => b.opcode === 'procedures_prototype' && b.mutation);
  const nw = protos.filter(p => p.mutation.warp === 'false').map(p => p.mutation.proccode);
  console.log(f + '  non-warp=' + nw.length + '  has printargs=' + nw.includes('printargs') + '  stamp=' + (j.meta && j.meta.agent));
  const st = j.targets.find(t => t.isStage);
  console.log('   totals: ' + j.targets.map(t => t.name + '=' + Object.keys(t.blocks).length).join(' ') + '  (backdrop ' + st.costumes[0].md5ext.slice(0,8) + ')');
}
