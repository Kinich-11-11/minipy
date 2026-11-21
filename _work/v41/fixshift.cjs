const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const f=dir+'p25.txt';
let t=fs.readFileSync(f,'utf8');
const a="REPEATU(OR(GT(VAR('bti'), VAR('bt_b')), GT(VAR('bt_b'), num(62))), [";
const b="REPEATU(OR(NOT(LT(VAR('bti'), VAR('bt_b'))), GT(VAR('bt_b'), num(62))), [";
if(!t.includes(a)) throw new Error('shift loop not found');
fs.writeFileSync(f, t.replace(a,b));
console.log('shift loop fixed');
