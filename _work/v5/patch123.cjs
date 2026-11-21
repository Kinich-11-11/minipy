const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const A="  function jsonLoads() {";
if(c.indexOf(A)>=0){ c=c.replace(A, "  function jsonLoadsMini() {\n    const arg = (k) => E.item('Stk', E.add(E.var('ubase'), E.num(k)));\n    return [\n      ...L.payInto(arg(2), 'jt'),\n      S.set('jsi', E.num(1)), S.set('jsroot', E.str('Z')),\n      S.Until(E.gt(E.var('jsi'), E.slen(E.var('jt'))), [\n        S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),\n        S.If(E.eq(E.var('jsc'), E.str('[')), [\n          ...heapNew('jso'),\n          S.set('jsroot', E.join(E.str('L'), E.var('jso'))),\n        ]),\n        S.chg('jsi', E.num(1)),\n      ]),\n      ...L.outLine(E.join(E.str('|MINI root=['), E.join(E.var('jsroot'), E.str(']')))),\n      S.set('res2', E.var('jsroot')),\n    ];\n  }\n"+NL+A); console.log('mini added'); } else console.log('MISS fn');
const B="        S.If(E.eq(E.var('mname'), E.str('loads|00000')), ["+NL+"          ...L.failAt(E.str('NotImplementedError: json.loads'), E.var('pc')),"+NL+"        ]),\n";
const B2="        S.If(E.eq(E.var('mname'), E.str('loads|00000')), ["+NL+"          ...jsonLoadsMini(),"+NL+"        ]),"+NL;
if(c.indexOf(B)>=0){ c=c.replace(B,B2); console.log('routed to mini'); } else { const b2=B.split(NL).join(String.fromCharCode(13)+NL); if(c.indexOf(b2)>=0){ c=c.replace(b2,B2.split(NL).join(String.fromCharCode(13)+NL)); console.log('routed (crlf)'); } else console.log('MISS route'); }
fs.writeFileSync(P,c);