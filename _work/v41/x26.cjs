'use strict';
const fs=require('fs');
const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const entries = zipRead('D:/编程/scratch/ai/minipython/MiniPy_v4.26.sb3');
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/project_v426.json', entries.find(e=>e.name==='project.json').data.toString('utf8'));
console.log('extracted v4.26');