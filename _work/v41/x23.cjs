'use strict';
const fs=require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const entries = zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.23.sb3');
const pj = entries.find(e=>e.name==='project.json').data.toString('utf8');
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v423.json', pj);
const t = JSON.parse(pj).targets.find(x=>x.name==='Interpreter');
console.log('blocks', Object.keys(t.blocks).length);
