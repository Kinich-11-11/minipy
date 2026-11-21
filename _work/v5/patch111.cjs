const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="      ...L.payInto(arg(2), 'jt'),"+String.fromCharCode(10)+"      S.set('jsi', E.num(1)), S.set('jsd', E.num(0)), S.set('jsroot', E.str('Z')),"
const B=A+String.fromCharCode(10)+"      ...L.outLine(E.join(E.str('|JT=['), E.join(E.var('jt'), E.str(']')))),"
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else console.log('MISS1');
const C="      S.set('res2', E.var('jsroot')),"
const D="      ...L.outLine(E.join(E.str('|JROOT=['), E.join(E.var('jsroot'), E.str(']')))),"+String.fromCharCode(10)+C
if(c.indexOf(C)>=0){ c=c.replace(C,D); n++; } else console.log('MISS2');
fs.writeFileSync(P,c); console.log('dbg',n);