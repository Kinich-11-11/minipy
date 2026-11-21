const fs = require('fs');
let s = fs.readFileSync('_work/v41/p335.txt', 'utf8');

// 1) 追加新变量声明（放在已有的 newVar 段之后）
const varAnchor = "  const have = new Set(Object.values(T(IT).lists).map((x) => x[0]));";
const varDecl = [
  "  for (const n of ['mzfd2', 'mznm2', 'mziv', 'mzit', 'mzvt', 'mzvv', 'mzrec', 'mzrt']) {",
  "    if (taken.has(n)) throw new Error('[P336] var taken: ' + n);",
  "  }",
  "  newVar('mzfd2', 0);",
  "  for (const n of ['mznm2', 'mziv', 'mzit', 'mzvt', 'mzvv', 'mzrec', 'mzrt']) newVar(n, '');",
  ""
].join('\n');
if (!s.includes(varAnchor)) { console.log('MISS varAnchor'); process.exit(1); }
s = s.replace(varAnchor, varDecl + varAnchor);

// 2) 用"值级写回"替换 pathset
const from = [
  "        IF(GT(VAR('mzfd'), num(0)), [",
  "          callProc('pathset %s %s %s %s', [",
  "            VAR('mzlo'), VAR('mzhi'),",
  "            item('Types', VAR('mzfd')), item('Values', VAR('mzfd'))",
  "          ])",
  "        ]),"
].join('\n');
const to = [
  "        IF(GT(VAR('mzfd'), num(0)), [",
  "          setV('mzvt', item('Types', VAR('mzfd'))),",
  "          setV('mzvv', item('Values', VAR('mzfd'))),",
  "          // 段名 = Tok[mzlo]；下标表达式 = mzlo+2 .. mzhi-1（不碰括号字形判定）",
  "          setV('mznm2', item('Tok', VAR('mzlo'))),",
  "          callProc('eval %s %s', [ADD(VAR('mzlo'), num(2)), SUB(VAR('mzhi'), num(1))]),",
  "          setV('mziv', VAR('ev')),",
  "          setV('mzit', VAR('evtype')),",
  "          callProc('lookup %s', [VAR('mznm2')]),",
  "          setV('mzfd2', VAR('found')),",
  "          IF(GT(VAR('mzfd2'), num(0)), [",
  "            setV('mzrec', item('Values', VAR('mzfd2'))),",
  "            setV('mzrt', item('Types', VAR('mzfd2'))),",
  "            IFELSE(EQ(VAR('mzrt'), txt('L')), [",
  "              callProc('lsetv %s %s %s %s', [VAR('mzrec'), VAR('mziv'), VAR('mzvt'), VAR('mzvv')]),",
  "              callProc('assign %s %s %s', [VAR('mznm2'), VAR('ev'), VAR('mzrt')])",
  "            ], [",
  "              IFELSE(EQ(VAR('mzrt'), txt('D')), [",
  "                callProc('dsetv %s %s %s %s %s', [VAR('mzrec'), VAR('mziv'), VAR('mzit'), VAR('mzvt'), VAR('mzvv')]),",
  "                callProc('assign %s %s %s', [VAR('mznm2'), VAR('ev'), VAR('mzrt')])",
  "              ], [])",
  "            ])",
  "          ])",
  "        ]),"
].join('\n');
if (!s.includes(from)) { console.log('MISS pathset block'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P335').join('P336');
fs.writeFileSync('_work/v41/p336.txt', s);
console.log('wrote p336.txt');
