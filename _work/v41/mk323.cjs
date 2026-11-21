const fs = require('fs');
let s = fs.readFileSync('_work/v41/p323.txt', 'utf8');
const from = s.slice(s.indexOf("  let last = BL()[raiseIf].inputs.SUBSTACK[1];"), s.indexOf("  console.log('[P323] (b) recording appended after '"));
const to = [
  "  // 分支里最后往往是 `stop this script`（raise 会中止），所以记录要插在**中止语句之前**",
  "  let anchor = null;",
  "  {",
  "    let cur = BL()[raiseIf].inputs.SUBSTACK[1];",
  "    let stopSite = null, prev = null, lastStmt = null;",
  "    for (let i = 0; i < 300 && cur; i++) {",
  "      lastStmt = cur;",
  "      const q = BL()[cur];",
  "      if (!stopSite && q.opcode === 'control_stop') { stopSite = cur; break; }",
  "      prev = cur; cur = q.next;",
  "    }",
  "    anchor = stopSite || lastStmt;",
  "  }",
  "  if (!anchor) throw new Error('[P323] raise branch anchor not found');",
  "  const rec = [IF(EQ(VAR('evtype'), txt('O')), [clearL('ErrV'), clearL('ErrT'), addTo('ErrV', VAR('ev')), addTo('ErrT', VAR('evtype'))])];",
  "  insertBeforeStmt(anchor, rec);",
  ""
].join('\n');
s = s.replace(from, to);
s = s.replace("  console.log('[P323] (b) recording appended after ' + last);", "  console.log('[P323] (b) recording inserted before ' + anchor);");
fs.writeFileSync('_work/v41/p323.txt', s);
console.log('rewrote p323 (b)');