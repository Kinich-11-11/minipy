const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
// default state: 3 = structural character, nothing to attach
rep("          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(0)),", "          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(3)),", 'default');
// string / number / literal branches produce a value
rep("            S.set('jsv', E.join(E.str('S'), E.var('jsb'))),", "            S.set('jsv', E.join(E.str('S'), E.var('jsb'))), S.set('jsnew', E.num(0)),", 'str');
rep("            S.set('jsv', E.var('jsb')),"+NL+"          ]),", "            S.set('jsv', E.var('jsb')), S.set('jsnew', E.num(0)),"+NL+"          ]),", 'num');
rep("          S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsv', E.str('B1')), S.chg('jsi', E.num(4))]),", "          S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsv', E.str('B1')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),", 'lit1');
rep("          S.If(E.eq(E.var('jsc'), E.str('f')), [S.set('jsv', E.str('B0')), S.chg('jsi', E.num(5))]),", "          S.If(E.eq(E.var('jsc'), E.str('f')), [S.set('jsv', E.str('B0')), S.chg('jsi', E.num(5)), S.set('jsnew', E.num(0))]),", 'lit2');
rep("          S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsv', E.str('Z')), S.chg('jsi', E.num(4))]),", "          S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsv', E.str('Z')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),", 'lit3');
// only attach when an actual value/container was parsed
rep("          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [", "          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), ["+NL+"          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [", 'guard');
rep("          ]),"+NL+"          S.If(E.eq(E.var('jsnew'), E.num(1)), ["+NL+"            S.chg('jsd', E.num(1)),", "          ]),"+NL+"          ]),"+NL+"          S.If(E.eq(E.var('jsnew'), E.num(1)), ["+NL+"            S.chg('jsd', E.num(1)),", 'close');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));