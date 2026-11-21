const fs = require('fs');
const p = '_work/v41/p281.txt';
let s = fs.readFileSync(p, 'utf8');
// (c) 置标志：从"分支体最前面"改到"检查宿主之前"（那时 mpcut 已经算好）
const from = s.slice(s.indexOf('  // (c) 置标志'), s.indexOf('  // (d) 放行检查'));
const to = [
  "  // (c) 置标志：**必须在逗号扫描之后**（mpcut 那时才有效；放在分支最前面时 mpcut 还是 0，",
  "  //     条件 `Tok[lo+3] == mpcut` 永远不成立 —— 第 93 轮 PZ66 探针实测得到这个结论）。",
  "  setV('mpisId', num(0));",
  "  insertBeforeStmt(host, [",
  "    IF(AND(EQ(item('Tok', ADD(argOf('lo'), num(2))), txt('None')),",
  "      AND(EQ(VAR('mpisMap'), num(0)), EQ(ADD(argOf('lo'), num(3)), VAR('mpcut')))), [",
  "      setV('mpisId', num(1))",
  "    ])",
  "  ]);",
  ""
].join('\n');
if (!from) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
