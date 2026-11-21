const fs = require('fs');
let s = fs.readFileSync('_work/v41/p248.txt', 'utf8');
const from = [
  "  // 注意：把 bindId 放进 IFELSE 的 else 分支时，chain 会把它当作链尾（next = null），",
  "  // 于是 replaceStmt 复制到的 old.next 已经是 null —— 绑定循环后面的 `aui += 1` 就丢了。",
  "  // 所以在构造之前先把 next 抓下来，替换后再接回去。",
  "  const nextAfterBind = BL()[bindId].next || null;",
  "  const newBind = IFELSE(",
  "    OR(CONTAINS('[', item('AName', VAR('aui'))), CONTAINS('.', item('AName', VAR('aui')))),",
  "    [callProc('pathset %s %s %s %s', [item('ATgtLo', VAR('aui')), item('ATgtHi', VAR('aui')), VAR('evtype'), VAR('ev')])],",
  "    [bindId]",
  "  );",
  "  replaceStmt(bindId, newBind);",
  "  if (nextAfterBind) { BL()[newBind].next = nextAfterBind; BL()[nextAfterBind].parent = newBind; }"
].join('\n');
const to = [
  "  // 低风险版：**不动控制流** —— 照原样先 assign（下标目标会多建一个没用到的隐藏变量），",
  "  // 然后若是下标/属性目标，再用 pathset 覆盖一次正确的值。",
  "  // （上一版把 bindId 塞进 IFELSE 的 else 分支，运行时绑定循环只走了一轮 —— 见 notes 第 45 轮。）",
  "  spliceAfter(bindId, chain([",
  "    IF(OR(CONTAINS('[', item('AName', VAR('aui'))), CONTAINS('.', item('AName', VAR('aui')))), [",
  "      callProc('pathset %s %s %s %s', [item('ATgtLo', VAR('aui')), item('ATgtHi', VAR('aui')), VAR('evtype'), VAR('ev')])",
  "    ])",
  "  ]));"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
s = s.replace("patch('P248 multi-token targets in assignlist'", "patch('P249 multi-token targets in assignlist'");
s = s.replace(/\[P248\]/g, '[P249]');
fs.writeFileSync('_work/v41/p249.txt', s);
console.log('ok');
