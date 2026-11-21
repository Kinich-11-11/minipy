'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
for (const name of ['Controller','TextRenderer','Stage']) {
  const t = j.targets.find(x => x.name === name);
  const costumes = (t.costumes||[]).map(c => c.name);
  console.log('== ' + name + ' costumes(' + costumes.length + '): ' + costumes.slice(0,40).join(',') + (costumes.length>40?' ...':''));
  const used = new Set();
  for (const b of Object.values(t.blocks)) {
    if (b.opcode === 'looks_switchcostumeto' && b.inputs && b.inputs.COSTUME) {
      const v = b.inputs.COSTUME;
      if (v[1] && v[1][1] && typeof v[1][1][1] === 'string') used.add(v[1][1][1]);
      if (Array.isArray(v[1]) === false && typeof v[1] === 'string') used.add('block:'+v[1]);
    }
    if (b.opcode === 'looks_costume') used.add('menu:' + JSON.stringify(b.fields));
  }
  console.log('   switched-to costumes: ' + [...used].slice(0,40).join(' | '));
}
