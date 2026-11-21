const fs=require('fs');
const NL=String.fromCharCode(10), CR=String.fromCharCode(13);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(CR+NL), b2=b.split(NL).join(CR+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
rep("  function dispatch() {", "  function delvBlock() {\n    const ia = () => E.item('Ia', E.var('pc'));\n    return [\n      S.set('dvm', E.item('FrEnv', E.var('frTop'))), S.set('dvn', ia()),\n      S.set('dvh', E.item('MapHead', E.var('dvm'))),\n      S.Until(E.lt(E.var('dvh'), E.num(1)), [\n        S.If(E.eq(E.item('BindName', E.var('dvh')), E.var('dvn')), [\n          S.If(E.eq(E.item('MapHead', E.var('dvm')), E.var('dvh')), [\n            S.lset('MapHead', E.var('dvm'), E.item('BindNext', E.var('dvh'))),\n          ], [\n            S.lset('BindNext', E.var('dvp'), E.item('BindNext', E.var('dvh'))),\n          ]),\n          S.set('dvh', E.num(0)),\n        ], [\n          S.set('dvp', E.var('dvh')),\n          S.set('dvh', E.item('BindNext', E.var('dvh'))),\n        ]),\n      ]),\n    ];\n  }\n"+NL+"  function dispatch() {", 'fn');
rep("      is('DELV', []),", "      is('DELV', [delvBlock()]),", 'wire');
rep("          ...L.failAt(E.join(E.str('NameError: '), E.join(E.var('lkN'), E.str(' is not defined'))), E.var('pc')),", "          ...raiseBuiltin('NameError'),", 'nameerr');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));