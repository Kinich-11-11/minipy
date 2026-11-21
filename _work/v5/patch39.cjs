const fs=require('fs');
const P='D:/编程/scratch/ai/minipython/_work/v5/kernel/vm.js';
let c=fs.readFileSync(P,'utf8');
const a="      is('IMPORT', [\n        S.set('mnm', E.item('Kval', ia())),\n        ...L.signInto(E.var('mnm'), 'msig'),\n        ...bindSet(E.item('FrEnv', E.var('frTop')),\n          E.join(E.var('mnm'), E.join(E.str('|'), E.var('msig'))),\n          E.join(E.str('S!'), E.var('mnm')), 'fd8'),\n      ]),";
const b="      is('IMPORT', [\n        S.set('mnm', E.item('Kval', ia())), S.set('mcut', E.var('mnm')), S.set('mj', E.num(1)),\n        S.Until(E.or(E.gt(E.var('mj'), E.slen(E.var('mnm'))),\n          E.eq(E.letter(E.var('mj'), E.var('mnm')), E.str('|'))), [\n          S.chg('mj', E.num(1)),\n        ]),\n        ...substrInto(E.var('mnm'), E.num(1), E.sub(E.var('mj'), E.num(1)), 'mcut'),\n        ...bindSet(E.item('FrEnv', E.var('frTop')), E.var('mnm'),\n          E.join(E.str('S!'), E.var('mcut')), 'fd8'),\n      ]),";
if(c.indexOf(a)>=0){ c=c.split(a).join(b); console.log('import fixed'); }
else { const a2=a.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); const b2=b.split(String.fromCharCode(10)).join(String.fromCharCode(13,10)); if(c.indexOf(a2)>=0){ c=c.split(a2).join(b2); console.log('import fixed (crlf)'); } else console.log('MISS'); }
fs.writeFileSync(P,c);