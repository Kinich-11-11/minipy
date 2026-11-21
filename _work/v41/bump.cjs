const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const f=dir+'head.txt';
let t=fs.readFileSync(f,'utf8');
const reps=[["MiniPy_v4.15.sb3');","MiniPy_v4.16.sb3');"],["'MiniPy v4.15 - built 2026-09-14'","'MiniPy v4.16 - built 2026-09-14'"],["-> MiniPy_v4.15.sb3 (newest)","-> MiniPy_v4.16.sb3 (newest)"]];
for(const [a,b] of reps){ if(!t.includes(a)) throw new Error('missing '+a); t=t.replace(a,b); }
fs.writeFileSync(f,t);
console.log('head.txt -> v4.16');
