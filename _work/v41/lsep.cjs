'use strict';
const fs=require('fs');
const L=fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/decomp24.txt','utf8').split(/\r?\n/);
L.forEach((t,i)=>{ if(/lsep|lesc1/.test(t)) console.log((i+1)+'| '+t); });