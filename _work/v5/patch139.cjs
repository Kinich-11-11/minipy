const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8'); let n=0; const bad=[];
function rep(a,b,tag){ if(c.indexOf(a)>=0){ c=c.replace(a,b); n++; return; } const a2=a.split(NL).join(String.fromCharCode(13)+NL), b2=b.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(a2)>=0){ c=c.replace(a2,b2); n++; return; } bad.push(tag); }
rep("  function arithBlock() {\n    const op = () => E.var('op');\n    return [", "  function arithBlock() {\n    const op = () => E.var('op');\n    // Python distinguishes int from float when printing.  Numbers here are bare text, so a\n    // float result that lands on a whole number gets a '.0' suffix (either operand spelled\n    // with a '.', or true division, makes the result a float).\n    const floatFix = () => [\n      S.set('isflt', E.num(0)),\n      S.If(E.contains(E.join(E.str(''), E.var('na')), E.str('.')), [S.set('isflt', E.num(1))]),\n      S.If(E.contains(E.join(E.str(''), E.var('nb')), E.str('.')), [S.set('isflt', E.num(1))]),\n      S.If(E.eq(op(), E.str('/')), [S.set('isflt', E.num(1))]),\n      S.If(E.and(E.eq(E.var('isflt'), E.num(1)), E.eq(E.mod(E.var('res'), E.num(1)), E.num(0))), [\n        S.set('res', E.join(E.str(''), E.join(E.var('res'), E.str('.0')))),\n      ]),\n    ];\n    return [\n      S.set('isflt', E.num(0)),", 'head');
// call floatFix after the operator branches, before returning
const C=["        ]),","      ]),","    ];","  }","  function inBlock() {"].join(NL);
const D=["        ]),","      ]),","      ...floatFix(),","    ];","  }","  function inBlock() {"].join(NL);
rep(C, D, 'call');
// float() must print with .0
rep("        ...num1('na', 2), ...drop(), ...vpush(E.join(E.str(''), E.add(E.var('na'), E.num(0)))),", "        ...num1('na', 2), ...drop(), ...floatRepr(E.var('na'), 'res2'), ...vpush(E.join(E.str(''), E.var('res2'))),", 'floatbuiltin');
fs.writeFileSync(P,c); console.log('applied',n,'missed:',JSON.stringify(bad));