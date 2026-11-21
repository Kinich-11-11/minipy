const fs = require('fs');
const p = '_work/v41/p269.txt';
let s = fs.readFileSync(p, 'utf8');
const from = "  insertBeforeStmt(head, [\n    IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS(VAR('ev'), txt('.'))), [stripBody])\n  ]);";
const to = [
  "  // 注意：进入 strval 时数值在**参数 vv** 里（PZ57 实测 vv=[3.50]），ev 还没被赋值；",
  "  // 所以门控要看 vv，并先把 ev 设成它，再做去尾零。",
  "  insertBeforeStmt(head, [",
  "    IF(AND(EQ(argOf('vt'), txt('N')), CONTAINS(argOf('vv'), txt('.'))), [",
  "      setV('ev', argOf('vv')),",
  "      stripBody",
  "    ])",
  "  ]);"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
