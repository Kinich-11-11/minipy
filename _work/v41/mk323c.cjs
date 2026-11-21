const fs = require('fs');
let s = fs.readFileSync('_work/v41/p323.txt', 'utf8');
const from = s.slice(s.indexOf("  // msgEval：分支里那句 eval"), s.indexOf("  spliceAfter(msgEval, chain(["));
const to = [
  "  // 分支里可能没有显式 eval（后期补丁改过）：退化为"插在第一条 control_stop 之前"",
  "  let msgEval = null;",
  "  {",
  "    let cur = BL()[raiseIf].inputs.SUBSTACK[1], lastStmt = null;",
  "    for (let i = 0; i < 300 && cur; i++) {",
  "      lastStmt = cur;",
  "      if (BL()[cur].opcode === 'control_stop') { msgEval = cur; break; }",
  "      cur = BL()[cur].next;",
  "    }",
  "    if (!msgEval) msgEval = lastStmt;",
  "  }",
  "  if (!msgEval) throw new Error('[P323] raise branch anchor not found');",
  "  console.log('[P323] (b) anchor=' + msgEval);",
  ""
].join('\n');
s = s.replace(from, to);
s = s.replace("  console.log('[P323] (b) msgEval=' + msgEval);\n", "");
s = s.replace("  spliceAfter(msgEval, chain([", "  insertBeforeStmt(msgEval, [");
s = s.replace("    IF(EQ(VAR('evtype'), txt('O')), [clearL('ErrV'), clearL('ErrT'), addTo('ErrV', VAR('ev')), addTo('ErrT', VAR('evtype'))])\n  ]));",
  "    IF(EQ(VAR('evtype'), txt('O')), [clearL('ErrV'), clearL('ErrT'), addTo('ErrV', VAR('ev')), addTo('ErrT', VAR('evtype'))])\n  ]);");
fs.writeFileSync('_work/v41/p323.txt', s);
console.log('rewrote p323 (b) anchor');