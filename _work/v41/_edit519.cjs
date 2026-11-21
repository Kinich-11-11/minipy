const fs = require('fs');
let s = fs.readFileSync('D:/编程/scratch/ai/minipython/_work/v41/p519.txt', 'utf8');
const marker = "  console.log('[P519] __contains__ + Exception.__init__ + hasattr installed');";
const add = `
  // hasattr must pass eval's callable gate (builtins are pre-registered; hasattr is not)
  {
    const evd2 = inDef('eval %s %s');
    const gates = find(evd2, (b) => b.opcode === 'control_if'
      && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
      && BL()[b.inputs.CONDITION[1]].opcode === 'operator_equals'
      && JSON.stringify(BL()[b.inputs.CONDITION[1]].inputs).includes('"callable"')
      && JSON.stringify(BL()[b.inputs.CONDITION[1]].inputs).includes('[1,[4,"1"]]'));
    let gate = null;
    for (const gid of gates) {
      const sub = reach(gid);
      const hasCall = [...sub].some((x) => BL()[x].opcode === 'procedures_call' && BL()[x].mutation && BL()[x].mutation.proccode === 'callfn %s %s %s');
      if (hasCall) { gate = gid; break; }
    }
    if (!gate) throw new Error('[P519] callable gate not found');
    insertBeforeStmt(gate, [IF(EQ(item('Tok', argOf('lo')), txt('hasattr')), [setV('callable', num(1))])]);
  }
  console.log('[P519] __contains__ + Exception.__init__ + hasattr installed');`;
if (!s.includes(marker)) throw new Error('marker not found');
s = s.replace(marker, add);
fs.writeFileSync('D:/编程/scratch/ai/minipython/_work/v41/p519.txt', s);
console.log('ok');
