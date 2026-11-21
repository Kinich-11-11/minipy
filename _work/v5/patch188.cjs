const fs = require('fs');
const NL = String.fromCharCode(10);
const C = 'D:/编程/scratch/ai/minipython/_work/v5/kernel/compiler.js';
let s = fs.readFileSync(C, 'utf8');
function rep(a, b, tag) {
  const i = s.indexOf(a);
  if (i < 0) { console.log('MISS ' + tag); process.exitCode = 1; return; }
  s = s.slice(0, i) + b + s.slice(i + a.length);
  console.log('ok ' + tag);
}
// drop the side-by-side hook
rep("        S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name'))," + NL + "          E.eq(NdA(Ch(nd(), E.num(0))), E.str('next|0000'))), E.eq(NdN(nd()), E.num(2))), [...compNext()])," + NL, '', 'hook removed');
// make it the else of the plain call path
rep("        ], [" + NL + "          ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0)," + NL + "        ]),",
    ["        ], [",
     "          S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),",
     "            E.eq(NdA(Ch(nd(), E.num(0))), E.str('next|0000'))), E.eq(NdN(nd()), E.num(2))), [",
     "            ...compNext(),",
     "          ], [",
     "            ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0),",
     "          ]),",
     "        ]),"].join(NL), 'exclusive hook');
fs.writeFileSync(C, s);