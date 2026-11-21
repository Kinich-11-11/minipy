const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="      S.ldelall('JsSt'), S.ldelall('JsKind'), S.ldelall('JsKey'),"
const B=A+String.fromCharCode(10)+"      ...L.outLine(E.join(E.str('|JT=['), E.join(E.var('jt'), E.str(']')))),"
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; }
const C="      S.set('res2', E.var('jsroot')),"
const D="      ...L.outLine(E.join(E.str('|JROOT=['), E.join(E.var('jsroot'), E.str(']')))),"+String.fromCharCode(10)+C
if(c.indexOf(C)>=0){ c=c.replace(C,D); n++; }
const E2="            S.chg('jsd', E.num(1)),"+String.fromCharCode(10)+"            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),"
const F2=E2+String.fromCharCode(10)+"            ...L.outLine(E.join(E.str('|CONT root=['), E.join(E.var('jsroot'), E.str(']')))),"
if(c.indexOf(E2)>=0){ c=c.replace(E2,F2); n++; }
fs.writeFileSync(P,c); console.log('probes',n);