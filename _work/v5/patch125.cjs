const fs=require('fs');
const NL=String.fromCharCode(10);
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
// locate the full attach block: from the jsnew==0 test to the three ladds
const start=c.indexOf("          S.If(E.eq(E.var('jsnew'), E.num(0)), [");
if(start<0){ console.log('MISS start'); process.exit(1); }
const marker="            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),";
const mi=c.indexOf(marker, start);
if(mi<0){ console.log('MISS end'); process.exit(1); }
const end=c.indexOf(String.fromCharCode(10), mi);
c=c.slice(0,start)+"          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [\n            S.If(E.eq(E.item('JsKind', E.var('jsd')), E.num(1)), [\n              ...L.payInto(E.item('JsSt', E.var('jsd')), 'jsl'), ...heapPush(E.var('jsl'), E.var('jsv')),\n            ], [\n              S.If(E.eq(E.item('JsKey', E.var('jsd')), E.str('')), [\n                S.lset('JsKey', E.var('jsd'), E.var('jsv')),\n              ], [\n                ...keyOf(E.item('JsKey', E.var('jsd')), 'jsk'),\n                ...L.payInto(E.item('JsSt', E.var('jsd')), 'jsm'),\n                ...bindSet(E.var('jsm'), E.var('jsk'), E.var('jsv'), 'fd12'),\n                S.lset('JsKey', E.var('jsd'), E.str('')),\n              ]),\n            ]),\n          ]),\n          S.If(E.eq(E.var('jsnew'), E.num(1)), [\n            S.chg('jsd', E.num(1)),\n            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),\n          ]),"+c.slice(end);
fs.writeFileSync(P,c); console.log('attach simplified');
// route loads back to the full parser
const B="        S.If(E.eq(E.var('mname'), E.str('loads|00000')), ["+NL+"          ...jsonLoadsMini(),"+NL+"        ]),"+NL;
const B2="        S.If(E.eq(E.var('mname'), E.str('loads|00000')), ["+NL+"          ...jsonLoads(),"+NL+"        ]),"+NL;
if(c.indexOf(B)>=0){ c=c.replace(B,B2); console.log('routed to full'); } else console.log('MISS route');
fs.writeFileSync(P,c);