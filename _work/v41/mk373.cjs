const fs = require('fs');
let s = fs.readFileSync('_work/v41/p372.txt', 'utf8');
const from = "  insertBeforeStmt(site, [setV('p345w', SUB(argOf('hi'), num(1)))]);";
if (!s.includes(from)) { console.log('MISS before-site'); process.exit(1); }
const to = [
  '  // 站点之前：默认 p345w = hi-1；链式形状时收窄到 hi-4（只取第一段的参数）',
  "  insertBeforeStmt(site, [",
  "    setV('p345w', SUB(argOf('hi'), num(1))),",
  "    IF(GT(argOf('hi'), num(3)), [",
  '      IF(isChained(), [',
  '        IF(closeBefore(), [',
  "          setV('p345w', SUB(argOf('hi'), num(4)))",
  '        ])',
  '      ])',
  '    ])',
  '  ]);'
].join('\n');
s = s.replace(from, to);
// isChained/closeBefore 必须在使用之前定义 -> 把它们提到 insertBeforeStmt 之前
s = s.replace("  const isChained = () => EQ(item('Tok', SUB(argOf('hi'), num(2))), txt('('));\n", '');
s = s.replace("  const closeBefore = () => EQ(item('Tok', SUB(argOf('hi'), num(3))), txt(')'));\n", '');
const anchor = "  const keys = Object.keys(BB[site].inputs);";
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
s = s.replace(anchor, [
  anchor,
  "  const isChained = () => EQ(item('Tok', SUB(argOf('hi'), num(2))), txt('('));",
  "  const closeBefore = () => EQ(item('Tok', SUB(argOf('hi'), num(3))), txt(')'));"
].join('\n'));
s = s.split('P372').join('P373');
fs.writeFileSync('_work/v41/p373.txt', s);
console.log('wrote p373.txt');
