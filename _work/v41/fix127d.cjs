// replace the temporary receiver log with the real `self.m()` fix, and drop DbgL again
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", "  B.addList(IT, 'CQ2', []);", 'drop dbgl');
const start = t.indexOf("  // ---------- (f) log the receiver type");
const end = t.indexOf("  // ---------- (d2) iscls <name>");
if (start < 0 || end < 0) throw new Error('debug block not found');
const fix = `  // ---------- (f) \`self.m(...)\`: \`self\` is not an ordinary MiniPy variable, so methodcall's
  // receiver evaluation comes back as 0.  Put the running instance in before the instance
  // dispatch runs: inside a method \`self\` (the Scratch variable that callmeth/callcls set)
  // holds the instance id, and the class-method copy makes every inherited method reachable
  // under the child's name, so callmeth finds it.
  {
    const mcDef = defIdOf('methodcall %s %s');
    const dispIf = find(reach(mcDef), (b) => b.opcode === 'control_if' && b.inputs.CONDITION
      && typeof b.inputs.CONDITION[1] === 'string' && (() => {
        const q = BL()[b.inputs.CONDITION[1]];
        return !!q && q.opcode === 'operator_equals' && varName(q.inputs.OPERAND1) === 'xb'
          && litOf(q.inputs.OPERAND2) === 'O';
      })()
      && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string'
      && [...reach(b.inputs.SUBSTACK[1])].some((x) => {
        const q = BL()[x];
        return !!q && q.opcode === 'procedures_call' && q.mutation
          && q.mutation.proccode === 'callmeth %s %s %s %s';
      }));
    if (dispIf.length !== 1) throw new Error('[P127] methodcall instance dispatch = ' + dispIf.length);
    insertBeforeStmt(dispIf[0], [
      IF(EQ(tokAt(argOf('lo')), txt('self')), [setV('xa', VAR('self')), setV('xb', txt('O'))])
    ]);
    console.log('[P127] self.m() reaches the instance dispatch');
  }

`;
t = t.slice(0, start) + fix + t.slice(end);
fs.writeFileSync(f, t);
console.log('written ' + t.length);
