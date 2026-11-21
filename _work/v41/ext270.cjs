const fs = require('fs');
const p = '_work/v41/p270.txt';
let s = fs.readFileSync(p, 'utf8');
// 在结尾的 console.log 前追加两处守卫
const tail = "  console.log('[P270] unhashable dict key guard installed');";
const extra = [
  "  // ---------- 下标赋值 `d[k] = v`：dsetv %s %s %s %s %s (s,key,kt,vt,vv)",
  "  {",
  "    const body = BL()[defIdOf('dsetv %s %s %s %s %s')].next;",
  "    insertBeforeStmt(body, [",
  "      IF(OR(EQ(argOf('kt'), txt('L')), OR(EQ(argOf('kt'), txt('D')), EQ(argOf('kt'), txt('E')))), [",
  "        setV('p6v', argOf('key')), setV('p6t', argOf('kt')), callProc('tname', []),",
  "        callProc('fail %s', [msg('dict key')])",
  "      ])",
  "    ]);",
  "    console.log('[P270] dsetv guard installed');",
  "  }",
  "  // ---------- 集合元素：setadd %s %s %s (enc,v,t)",
  "  {",
  "    const body = BL()[defIdOf('setadd %s %s %s')].next;",
  "    insertBeforeStmt(body, [",
  "      IF(OR(EQ(argOf('t'), txt('L')), OR(EQ(argOf('t'), txt('D')), EQ(argOf('t'), txt('E')))), [",
  "        setV('p6v', argOf('v')), setV('p6t', argOf('t')), callProc('tname', []),",
  "        callProc('fail %s', [msg('set element')])",
  "      ])",
  "    ]);",
  "    console.log('[P270] setadd guard installed');",
  "  }",
  tail
].join('\n');
if (!s.includes(tail)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(tail, extra));
console.log('ok');
