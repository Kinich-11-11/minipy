// 临时调试：打印多目标扫描得到的 eqi
const fs = require('fs');
const p = '_work/v41/p229.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  // flag: did this statement start with a bracket?";
const ins = [
  "  const scanLoop = one(find(reach(body), (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION",
  "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_gt' && nameOf(x.inputs.OPERAND1) === 'ek', 0)), 'scan loop');",
  "  spliceAfter(scanLoop, chain([callProc('fail %s', [VAR('eqi')])]));",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
