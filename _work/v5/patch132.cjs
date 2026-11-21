const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A=c.indexOf('  function jsonLoadsMini() {');
const B=c.indexOf('  // flat JSON parser', A);
if(A>=0&&B>A){ c=c.slice(0,A)+c.slice(B); console.log('mini removed'); } else console.log('MISS mini');
fs.writeFileSync(P,c);