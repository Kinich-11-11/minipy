const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const src=fs.readFileSync(dir+'build41.js','utf8');
// head = everything before the P13 banner
const i=src.indexOf("// ---- P13: list methods");
if(i<0) throw new Error('P13 banner not found');
let head=src.slice(0,i).trimEnd();
fs.writeFileSync(dir+'head.txt', head);
// tail = from the DEBUG banner onwards
const j=src.indexOf('// ---- DEBUG');
if(j<0) throw new Error('DEBUG banner not found');
fs.writeFileSync(dir+'tail.txt', src.slice(j));
console.log('head/tail refreshed');
