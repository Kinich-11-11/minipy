const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const from = "  // ---------- (C) 找到区域 root / scanIf / keIf ----------";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
const ins = [
  "  // ---------- (B) minkey 顶部：default 情形直接返回算好的结果 ----------",
  "  {",
  "    const mkDef2 = defIdOf('minkey');",
  "    const head = BB[mkDef2].next;",
  "    if (!head) throw new Error('[P405] minkey head missing');",
  "    insertBeforeStmt(head, [",
  "      IF(EQ(VAR('mkdef'), num(1)), [",
  "        setV('ev', VAR('mkdfv')),",
  "        setV('evtype', VAR('mkdft')),",
  "        setV('evK', txt('')),",
  "        stopThis()",
  "      ])",
  "    ]);",
  "    console.log('[P405] minkey early-return installed');",
  "  }",
  from
].join('\n');
fs.writeFileSync('_work/v41/p405.txt', s.replace(from, ins));
console.log('minkey early return added');