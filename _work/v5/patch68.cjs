const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="          ...tostr(E.var('kv'), 'kk'),"+String.fromCharCode(10)+"          ...bindSet(E.var('tobj'), E.join(E.str('K'), E.var('kk')), E.var('vv'), 'fd2'),";
const B="          ...keyOf(E.var('kv'), 'kk'),"+String.fromCharCode(10)+"          ...bindSet(E.var('tobj'), E.var('kk'), E.var('vv'), 'fd2'),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); console.log('key1 fixed'); } else console.log('MISS');
fs.writeFileSync(P,c);