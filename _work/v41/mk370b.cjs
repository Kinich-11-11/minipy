const fs = require('fs');
let s = fs.readFileSync('_work/v41/p368.txt', 'utf8');
const from = "  console.log('[P368] third argument is now a freshly-set variable');";
if (!s.includes(from)) { console.log('MISS tail'); process.exit(1); }
const to = [
  '  // bisect 3a: only the after-site block',
  "  const hiGt2 = () => GT(argOf('hi'), num(2));",
  "  const isChained = () => EQ(item('Tok', SUB(argOf('hi'), num(2))), txt('('));",
  '  spliceAfter(site, chain([',
  '    IF(hiGt2(), [',
  '      IF(isChained(), [',
  "        setV('p345fn', item('FnName', VAR('ev'))),",
  "        callProc('callfn %s %s %s', [VAR('p345fn'), SUB(argOf('hi'), num(1)), SUB(argOf('hi'), num(1))])",
  '      ])',
  '    ])',
  '  ]));',
  "  console.log('[P370] append-after only');"
].join('\n');
s = s.replace(from, to);
s = s.replace("  newVar('p345w', 0);", "  newVar('p345w', 0); newVar('p345fn', '');");
s = s.replace("  if (taken.has('p345w')) throw new Error('[P368] var taken');", "  for (const n of ['p345w', 'p345fn']) if (taken.has(n)) throw new Error('[P370] var taken: ' + n);");
s = s.split('P368').join('P370');
fs.writeFileSync('_work/v41/p370.txt', s);
console.log('wrote p370.txt');
