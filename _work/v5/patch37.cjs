const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const S1="S.If(E.eq(E.letter(E.num(1), E.var('ty')), E.str('C')), [";
const S2="S.If(E.eq(E.var('xv'), E.var('ty')), [S.set('res', E.str('B1'))]),";
const a=c.indexOf(S1), b=c.indexOf(S2);
if(a<0||b<0||b<a){ console.log('ANCHOR FAIL', a, b); process.exit(1); }
const ls=c.lastIndexOf(String.fromCharCode(10), a)+1;
const le=c.lastIndexOf(String.fromCharCode(10), b)+1;
c=c.slice(0,ls)+"      S.If(E.eq(E.letter(E.num(1), E.var('ty')), E.str('C')), [\n        ...L.payInto(E.var('ty'), 'clo'),\n        S.If(E.eq(E.letter(E.num(1), E.var('xv')), E.str('O')), [\n          ...L.payInto(E.var('xv'), 'ino'),\n          S.set('cm', E.item('InClass', E.var('ino'))),\n          S.Until(E.lt(E.var('cm'), E.num(1)), [\n            S.If(E.eq(E.var('cm'), E.var('clo')), [S.set('res', E.str('B1'))]),\n            S.set('cm', E.item('ClBase', E.var('cm'))),\n          ]),\n        ]),\n      ]),\n"+c.slice(le);
fs.writeFileSync(P,c); console.log('block replaced');