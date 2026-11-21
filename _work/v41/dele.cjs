'use strict';
const fs=require('fs');
const lines = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp23.txt','utf8').split(/\r?\n/);
lines.forEach((t,i)=>{ if(/del (VSave|LSave|FrVBase|FrLBase|FrLoop|FrRet|FrBase|VStack)\b/.test(t)) console.log((i+1)+'| '+t); });
console.log('--- fpop 3586-3615 ---');
console.log(lines.slice(3585,3615).map((t,i)=>(i+3586)+'| '+t).join('\n'));
console.log('--- fpop 3500-3520 ---');
console.log(lines.slice(3499,3520).map((t,i)=>(i+3500)+'| '+t).join('\n'));
