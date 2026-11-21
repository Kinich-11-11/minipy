const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
// 1) push the container frame for both lists (1) and maps (2)
const A="          S.If(E.eq(E.var('jsnew'), E.num(1)), ["+NL+"            S.chg('jsd', E.num(1)),";
const B="          S.If(E.or(E.eq(E.var('jsnew'), E.num(1)), E.eq(E.var('jsnew'), E.num(2))), ["+NL+"            S.chg('jsd', E.num(1)),";
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else console.log('miss push');
// 2) drop the duplicated guard line and the duplicated jsnew set
const D="          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), ["+NL+"          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), ["+NL;
const E2="          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), ["+NL;
if(c.indexOf(D)>=0){ c=c.replace(D,E2); n++; } else console.log('miss dupguard');
const F="S.set('jsv', E.join(E.str('S'), E.var('jsb'))), S.set('jsnew', E.num(0)), S.set('jsnew', E.num(0)),";
const G="S.set('jsv', E.join(E.str('S'), E.var('jsb'))), S.set('jsnew', E.num(0)),";
if(c.indexOf(F)>=0){ c=c.replace(F,G); n++; } else console.log('miss dupset');
fs.writeFileSync(P,c); console.log('applied',n);