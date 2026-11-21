const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } bad.push(tag); }
// compDict: children are [callee, ITER, VAR, KEY, VAL]
rep("      ...pushT('n', Ch(nd(), E.num(3))),"+String.fromCharCode(10)+"      ...pushT('n', Ch(nd(), E.num(2))),"+String.fromCharCode(10)+"      ...pushT('e', E.str('PUSHV'), E.var('lcak')),"+String.fromCharCode(10)+"      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(1)))),", "      ...pushT('n', Ch(nd(), E.num(4))),"+String.fromCharCode(10)+"      ...pushT('n', Ch(nd(), E.num(3))),"+String.fromCharCode(10)+"      ...pushT('e', E.str('PUSHV'), E.var('lcak')),"+String.fromCharCode(10)+"      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),", 'storev');
rep("      ...pushT('n', Ch(nd(), E.num(0))),"+String.fromCharCode(10)+"      ...pushT('e', E.str('STOREV'), E.var('lcak')),"+String.fromCharCode(10)+"      ...pushT('e', E.str('BUILD'), E.str('D|0')),", "      ...pushT('n', Ch(nd(), E.num(1))),"+String.fromCharCode(10)+"      ...pushT('e', E.str('STOREV'), E.var('lcak')),"+String.fromCharCode(10)+"      ...pushT('e', E.str('BUILD'), E.str('D|0')),", 'iter');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));