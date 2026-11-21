const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0;
const A="          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(0)),"
const B="          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(0)),"+String.fromCharCode(10)+"          ...L.outLine(E.join(E.str('|PARSE c=['), E.join(E.var('jsc'), E.str(']')))),"
if(c.indexOf(A)>=0){ c=c.replace(A,B); n++; } else console.log('MISS1');
const C="            S.set('jsnew', E.num(1)), S.chg('jsi', E.num(1)),"
const D="            S.set('jsnew', E.num(1)), S.chg('jsi', E.num(1)),"+String.fromCharCode(10)+"            ...L.outLine(E.str('|LBR')),"
if(c.indexOf(C)>=0){ c=c.replace(C,D); n++; } else console.log('MISS2');
const E2="            S.chg('jsd', E.num(1)),"+String.fromCharCode(10)+"            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),"
const F2="            S.chg('jsd', E.num(1)),"+String.fromCharCode(10)+"            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),"+String.fromCharCode(10)+"            ...L.outLine(E.join(E.str('|PUSH d='), E.join(E.var('jsd'), E.join(E.str(' root=['), E.join(E.var('jsroot'), E.str(']')))))),"
if(c.indexOf(E2)>=0){ c=c.replace(E2,F2); n++; } else console.log('MISS3');
fs.writeFileSync(P,c); console.log('dbg',n);