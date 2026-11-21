'use strict';
const fs = require('fs');
const { zipRead } = require('../sb3lib.js');
const j = JSON.parse(zipRead('MiniPy_v4.31.sb3').find(e => /project\.json$/.test(e.name)).data.toString('utf8'));
const have = new Set();
for (const t of j.targets) { for (const v of Object.values(t.variables||{})) have.add(v[0]); for (const v of Object.values(t.lists||{})) have.add(v[0]); }
for (const w of ['smode','stick','sstep','dbgmode','dbgticket','dbgsteps','mv2','tv2','sv2','kvm','kvt','kvs']) console.log(w.padEnd(10) + (have.has(w) ? 'TAKEN' : 'free'));
