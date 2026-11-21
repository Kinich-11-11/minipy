const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const start=c.indexOf('  function jsonLoads() {');
if(start<0){ console.log('MISS def'); process.exit(1); }
const end=c.indexOf('  function caseConv(', start);
let body=c.slice(start, end);
const before=body; let n=0;
function rep(a,b,tag){ if(body.indexOf(a)>=0){ body=body.split(a).join(b); n++; return true; } console.log('miss',tag); return false; }
rep("          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(0)),", "          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(3)),", 'default');
rep("            S.set('jsv', E.join(E.str('S'), E.var('jsb'))),", "            S.set('jsv', E.join(E.str('S'), E.var('jsb'))), S.set('jsnew', E.num(0)),", 'str');
rep("            S.set('jsv', E.var('jsb')),"+NL+"          ]),", "            S.set('jsv', E.var('jsb')), S.set('jsnew', E.num(0)),"+NL+"          ]),", 'num');
rep("S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsv', E.str('B1')), S.chg('jsi', E.num(4))]),", "S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsv', E.str('B1')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),", 'lit1');
rep("S.If(E.eq(E.var('jsc'), E.str('f')), [S.set('jsv', E.str('B0')), S.chg('jsi', E.num(5))]),", "S.If(E.eq(E.var('jsc'), E.str('f')), [S.set('jsv', E.str('B0')), S.chg('jsi', E.num(5)), S.set('jsnew', E.num(0))]),", 'lit2');
rep("S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsv', E.str('Z')), S.chg('jsi', E.num(4))]),", "S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsv', E.str('Z')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),", 'lit3');
rep("          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [", "          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), ["+NL+"          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [", 'guard');
rep("          ]),"+NL+"          S.If(E.eq(E.var('jsnew'), E.num(1)), ["+NL+"            S.chg('jsd', E.num(1)),", "          ]),"+NL+"          ]),"+NL+"          S.If(E.eq(E.var('jsnew'), E.num(1)), ["+NL+"            S.chg('jsd', E.num(1)),", 'close');
c=c.slice(0,start)+body+c.slice(end);
fs.writeFileSync(P,c); console.log('applied',n,'/8 in jsonLoads');