const fs = require('fs');
let s = fs.readFileSync('_work/v41/p332.txt', 'utf8');
const anchor = "  // ---------- (B) assignlist 开头的多目标分支 ----------";
const inject = [
  "  // ---------- (A2) 放宽后的门要真的把多目标路由到 assignlist ----------",
  "  {",
  "    const gb = T(IT).blocks[gate];",
  "    const first = gb.inputs.SUBSTACK[1];",
  "    if (!first) throw new Error('[P332] gate then-branch empty');",
  "    insertBeforeStmt(first, [",
  "      setV('mzhas', num(0)), setV('mzd', num(0)), setV('mzi', num(1)),",
  "      REPEATU(GT(VAR('mzi'), SUB(VAR('eqi'), num(1))), [",
  "        setV('mzc', item('Tok', VAR('mzi'))),",
  "        IF(isOpen(VAR('mzc')), [chgV('mzd', num(1))]),",
  "        IF(isClose(VAR('mzc')), [chgV('mzd', num(-1))]),",
  "        IF(AND(EQ(VAR('mzd'), num(0)), EQ(VAR('mzc'), txt(','))), [setV('mzhas', num(1))]),",
  "        chgV('mzi', num(1))",
  "      ]),",
  "      IF(EQ(VAR('mzhas'), num(1)), [",
  "        callProc('assignlist %s', [VAR('eqi')]),",
  "        stopThis()",
  "      ])",
  "    ]);",
  "    console.log('[P332] (A2) multi-target routed from the relaxed gate to assignlist');",
  "  }",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
fs.writeFileSync('_work/v41/p332.txt', s.replace(anchor, inject + anchor));
console.log('ok');