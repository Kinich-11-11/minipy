const fs = require('fs');
let s = fs.readFileSync('_work/v41/p419.txt', 'utf8');
const from = "  BB[strIf].inputs.CONDITION = [2, AND(EQ(VAR('evtype'), txt('O')), OR(hasOf('__str__'), hasOf('__repr__')))];";
const to = `  // 外科式：保留原条件的第一项（evtype=="O"），只把第二项(.__str__ 检查)换成 OR(原检查, .__repr__ 检查)
  {
    const condId = BB[strIf].inputs.CONDITION[1];
    const condB = BB[condId];
    if (condB && condB.opcode === 'operator_and' && condB.inputs.OPERAND2) {
      const orig2 = condB.inputs.OPERAND2[1];
      condB.inputs.OPERAND2 = [2, OR(orig2, hasOf('__repr__'))];
      const orb = BB[condB.inputs.OPERAND2[1]];
      orb.parent = condId;
      if (orig2 && BB[orig2]) BB[orig2].parent = orb;
      console.log('[P419] condition relaxed via OR into existing AND');
    } else {
      BB[strIf].inputs.CONDITION = [2, AND(EQ(VAR('evtype'), txt('O')), OR(hasOf('__str__'), hasOf('__repr__')))];
      console.log('[P419] condition rebuilt (fallback path)');
    }
  }`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p419.txt', s.replace(from, to));
console.log('surgical condition edit installed');