const fs = require('fs');
let s = fs.readFileSync('_work/v41/pz93.txt', 'utf8');
const from = "  insertBeforeStmt(head, [";
const to = [
  "  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));",
  "  if (taken.has('pz93s')) throw new Error('[PZ93] var taken');",
  "  newVar('pz93s', '');",
  "  newVar('pz93i', 0);",
  "  const dumpTok = [",
  "    setV('pz93s', txt('')),",
  "    setV('pz93i', num(1)),",
  "    REPEATU(GT(VAR('pz93i'), VAR('count')), [",
  "      setV('pz93s', JOIN(VAR('pz93s'), item('Tok', VAR('pz93i')))),",
  "      setV('pz93s', JOIN(VAR('pz93s'), txt('|'))),",
  "      chgV('pz93i', num(1))",
  "    ]),",
  "    callProc('log %s', [JOIN(txt('PZ93 toks='), VAR('pz93s'))]),",
  "    callProc('log %s', [JOIN(txt('PZ93 count='), VAR('count'))])",
  "  ];",
  "  insertBeforeStmt(head, ["
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("    log('PZ93 head=', VAR('head'))\n  ]);", "    log('PZ93 head=', VAR('head')),\n    ...dumpTok\n  ]);");
if (!s.includes('dumpTok')) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync('_work/v41/pz93.txt', s);
console.log('patched pz93');