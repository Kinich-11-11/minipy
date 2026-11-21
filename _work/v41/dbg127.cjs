// temporary: log receiver/type at methodcall's instance guard
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);", "  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", 'dbgl');
rep("  // ---------- (d2) iscls <name>", `  // ---------- (f) log the receiver type at methodcall's instance dispatch (debug)
  {
    const instIf = find(inDef('methodcall %s %s'), (b) => b.opcode === 'control_if' && b.inputs.CONDITION
      && typeof b.inputs.CONDITION[1] === 'string'
      && BL()[b.inputs.CONDITION[1]].opcode === 'operator_equals'
      && varName(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1) === 'xb'
      && litOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2) === 'O');
    if (instIf.length !== 1) throw new Error('[P127] methodcall instance guard = ' + instIf.length);
    insertBeforeStmt(instIf[0], [
      addTo('DbgL', JOIN(txt('mc '), JOIN(VAR('xa'), JOIN(txt('/'), VAR('xb')))))
    ]);
    console.log('[P127] methodcall receiver logged');
  }

  // ---------- (d2) iscls <name>`, 'instlog');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
