const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
const lines2=fs.readFileSync(P,'utf8').split(NL);
let s=-1; for(let i=0;i<lines2.length;i++) if(lines2[i].indexOf('function jsonLoadsMini')>=0) s=i;
if(s<0){ console.log('MISS'); process.exit(0); }
let e=-1; for(let i=s+1;i<lines2.length;i++) if(lines2[i]==='  }'){ e=i; break; }
console.log('removing lines', s+1, 'to', e+1);
lines2.splice(s, e-s+1);
fs.writeFileSync(P, lines2.join(NL));