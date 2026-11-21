const fs = require('fs');
let s = fs.readFileSync('_work/v41/p368.txt', 'utf8');
const from = "  console.log('[P368] third argument is now a freshly-set variable');";
if (!s.includes(from)) { console.log('MISS tail'); process.exit(1); }
const to = [
  '  // 修正判据：链式形状 name(A)(B) 需要 Tok[hi-2]=="(" 且 Tok[hi-3]==")"',
  '  // （只看 hi-2 会把普通单参调用 f(1) 也误判：f ( 1 ) 里 hi-2 就是 "("）',
  "  const isChained = () => EQ(item('Tok', SUB(argOf('hi'), num(2))), txt('('));",
  "  const closeBefore = () => EQ(item('Tok', SUB(argOf('hi'), num(3))), txt(')'));",
  '  spliceAfter(site, chain([',
  "    IF(GT(argOf('hi'), num(3)), [",
  '      IF(isChained(), [',
  '        IF(closeBefore(), [',
  "          setV('p345fn', item('FnName', VAR('ev'))),",
  "          callProc('callfn %s %s %s', [VAR('p345fn'), SUB(argOf('hi'), num(1)), SUB(argOf('hi'), num(1))])",
  '        ])',
  '      ])',
  '    ])',
  '  ]));',
  "  console.log('[P372] append-after with the corrected chained test');"
].join('\n');
s = s.replace(from, to);
s = s.replace("  newVar('p345w', 0);", "  newVar('p345w', 0); newVar('p345fn', '');");
s = s.replace("  if (taken.has('p345w')) throw new Error('[P368] var taken');", "  for (const n of ['p345w', 'p345fn']) if (taken.has(n)) throw new Error('[P372] var taken: ' + n);");
s = s.split('P368').join('P372');
fs.writeFileSync('_work/v41/p372.txt', s);
console.log('wrote p372.txt');
