const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const a="...L.setAt('BindName', E.var('bTop'), E.str(nm)),";
const b="...L.setAt('BindName', E.var('bTop'), E.str(key(nm))),";
if(c.indexOf(a)>=0){ c=c.split(a).join(b); console.log('fixed bind key'); } else console.log('MISS');
fs.writeFileSync(P,c);