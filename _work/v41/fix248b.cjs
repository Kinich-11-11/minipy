const fs = require('fs');
const p = '_work/v41/p248.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 去掉调试块
const dbgStart = s.indexOf('  {\n    let c1 = 0');
const dbgEndMarker = "    console.log('[P248dbg] clauses loops=' + c1 + ' cond=' + c2 + ' gt=' + c3 + ' aui2=' + c4 + ' sub=' + c5 + ' final=' + c6);\n  }\n";
const dbgEnd = s.indexOf(dbgEndMarker);
if (dbgStart < 0 || dbgEnd < 0) { console.log('MISS dbg block'); process.exit(1); }
s = s.slice(0, dbgStart) + s.slice(dbgEnd + dbgEndMarker.length);
// 2) grpScan 用显式循环
const grpFrom = [
  "  const grpScan = find(al, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION",
  "    && BL()[b.inputs.CONDITION[1]] && BL()[b.inputs.CONDITION[1]].opcode === 'operator_gt'",
  "    && nameOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1) === 'aui2'",
  "    && BL()[b.inputs.SUBSTACK]",
  "    && find([b.inputs.SUBSTACK[1]], (x) => x.opcode === 'control_if' && x.inputs.CONDITION",
  "      && BL()[x.inputs.CONDITION[1]] && BL()[x.inputs.CONDITION[1]].opcode === 'operator_contains'",
  "      && litOf(BL()[x.inputs.CONDITION[1]].inputs.STRING1) === '([{').length === 1);"
].join('\n');
const grpTo = [
  "  // 用显式循环定位（DSL 的 find 在这个复合谓词上返回 0，手工循环却能匹配 —— 见 notes）",
  "  const grpScan = [];",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'control_repeat_until' || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;",
  "    const c = BL()[b.inputs.CONDITION[1]];",
  "    if (!c || c.opcode !== 'operator_gt' || nameOf(c.inputs.OPERAND1) !== 'aui2') continue;",
  "    const head = BL()[b.inputs.SUBSTACK[1]];",
  "    const hc = head && head.inputs.CONDITION ? BL()[head.inputs.CONDITION[1]] : null;",
  "    if (head && head.opcode === 'control_if' && hc && hc.opcode === 'operator_contains' && litOf(hc.inputs.STRING1) === '([{') grpScan.push(id);",
  "  }"
].join('\n');
if (!s.includes(grpFrom)) { console.log('MISS grpFrom'); process.exit(1); }
s = s.replace(grpFrom, grpTo);
// 3) simpleLoop 也用显式循环
const slFrom = [
  "  const simpleLoop = find(al, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION",
  "    && BL()[b.inputs.CONDITION[1]] && BL()[b.inputs.CONDITION[1]].opcode === 'operator_gt'",
  "    && nameOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1) === 'mi'",
  "    && BL()[b.inputs.SUBSTACK]",
  "    && find([b.inputs.SUBSTACK[1]], (x) => x.opcode === 'data_addtolist' && x.fields.LIST[0] === 'AName').length === 1);"
].join('\n');
const slTo = [
  "  const simpleLoop = [];",
  "  for (const id of al) {",
  "    const b = BL()[id];",
  "    if (b.opcode !== 'control_repeat_until' || !b.inputs.CONDITION || !b.inputs.SUBSTACK) continue;",
  "    const c = BL()[b.inputs.CONDITION[1]];",
  "    if (!c || c.opcode !== 'operator_gt' || nameOf(c.inputs.OPERAND1) !== 'mi') continue;",
  "    const head = BL()[b.inputs.SUBSTACK[1]];",
  "    if (head && head.opcode === 'data_addtolist' && head.fields.LIST[0] === 'AName') simpleLoop.push(id);",
  "  }"
].join('\n');
if (!s.includes(slFrom)) { console.log('MISS slFrom'); process.exit(1); }
s = s.replace(slFrom, slTo);
fs.writeFileSync(p, s);
console.log('ok');
