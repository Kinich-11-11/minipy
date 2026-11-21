'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
for (const f of ['MiniPy_v4.30.sb3','_work/v41/v431_p58.sb3','MiniPy_v4.31.sb3']) {
  const j = JSON.parse(zipRead(f).find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
  const it = j.targets.find(t => /Interp/i.test(t.name));
  const names = Object.values(it.variables||{}).map(v => v[0]);
  const st = j.targets.find(t => t.isStage);
  const stn = Object.values(st.variables||{}).map(v => v[0]);
  console.log(f + ': interp has mv/tv/sv = ' + ['mv','tv','sv'].map(n => n + ':' + names.includes(n)).join(' ') + ' | stage has live/depth = ' + ['live','depth'].map(n => n + ':' + stn.includes(n)).join(' ') + ' | interp vars=' + names.length);
}
