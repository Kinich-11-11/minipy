'use strict';
const fs=require('fs');
const lines = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp23.txt','utf8').split(/\r?\n/);
const names=[];
lines.forEach((t,i)=>{ const m=t.match(/^\s*append\(VSave, \?\?12,([A-Za-z_][A-Za-z0-9_]*),/); if(m) names.push(m[1]); });
console.log('VSave vars ('+names.length+'): '+names.join(', '));
console.log('---- fpush head 3249-3300 ----');
console.log(lines.slice(3248,3300).map((t,i)=>(i+3249)+'| '+t).join('\n'));
