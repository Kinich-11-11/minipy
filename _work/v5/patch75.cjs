const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
const A="      S.If(E.eq(E.var('t1g'), E.str('O')), [S.set(dst, E.str('<object>'))]),";
const B=["      S.If(E.eq(E.var('t1g'), E.str('F')), [...L.payInto(E.var('t1v'), 't1f'),",
  "        S.set(dst, E.join(E.str('<function '), E.join(E.item('FnName', E.var('t1f')), E.str('>'))))]),",
  "      S.If(E.eq(E.var('t1g'), E.str('C')), [...L.payInto(E.var('t1v'), 't1f'),",
  "        S.set(dst, E.join(E.str(\"<class '\"), E.join(E.item('ClName', E.var('t1f')), E.str(\"'>\"))))]),",
  "      S.If(E.eq(E.var('t1g'), E.str('O')), [S.set(dst, E.str('<object>'))]),"].join(NL);
rep(A, B, 'tostr1');
rep("        ...L.failAt(E.join(E.str('KeyError: '), E.var('kk')), E.var('pc')),", "        ...raiseBuiltin('KeyError'),", 'keyerr');
rep("        ...L.failAt(E.str('IndexError: list assignment index out of range'), E.var('pc')),", "        ...raiseBuiltin('IndexError'),", 'setidx');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));