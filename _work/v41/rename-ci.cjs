const fs=require('fs');
const dir='D:/编程/scratch/ai/minipython/_work/v41/';
const f=dir+'p26.txt';
let t=fs.readFileSync(f,'utf8');
const before=(t.match(/'ci'/g)||[]).length;
t=t.split("'ci'").join("'cqidx'");   // compareText/checkASCII also use ci -> collision
fs.writeFileSync(f,t);
console.log("renamed 'ci' occurrences: "+before);
