// final: move the `self.m()` promotion to before methodcall's type guards, drop all debug logging
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", "  B.addList(IT, 'CQ2', []);", 'drop dbgl');
rep("'cinst', 'cmeth', 'clo', 'chi'];", "'cinst', 'cmeth', 'clo', 'chi', 'cselfr'];", 'vars3');
const start = t.indexOf("  // ---------- (f) `self.m(...)`");
const end = t.indexOf("  // ---------- (d2) iscls <name>");
if (start < 0 || end < 0) throw new Error('fix block not found');
const fix = `  // ---------- (f) \`self.m(...)\`: inside a method \`self\` is the Scratch variable that
  // callmeth/callcls set; it is not an ordinary MiniPy variable, so methodcall's receiver
  // evaluation comes back as \`0\` with type N and the type guards fail before the instance
  // dispatch is reached.  Remember the receiver token up front (a nested methodcall may
  // re-tokenize Tok) and put the running instance back before those guards run.
  {
    const mcDef = defIdOf('methodcall %s %s');
    const mcHead = BL()[mcDef].next;
    if (!mcHead) throw new Error('[P127] methodcall has no body');
    insertBeforeStmt(mcHead, [setV('cselfr', item('Tok', argOf('lo')))]);
    const typeGuard = find(reach(mcDef), (b) => b.opcode === 'control_if' && b.inputs.SUBSTACK
      && typeof b.inputs.SUBSTACK[1] === 'string'
      && [...reach(b.inputs.SUBSTACK[1])].some((x) => {
        const q = BL()[x];
        return !!q && q.opcode === 'procedures_call' && q.mutation
          && q.mutation.proccode === 'dictmeth %s %s %s %s %s';
      }));
    if (typeGuard.length !== 1) throw new Error('[P127] methodcall type guard = ' + typeGuard.length);
    insertBeforeStmt(typeGuard[0], [
      IF(EQ(VAR('cselfr'), txt('self')), [setV('xa', VAR('self')), setV('xb', txt('O'))])
    ]);
    console.log('[P127] self.m() reaches the instance dispatch');
  }

`;
t = t.slice(0, start) + fix + t.slice(end);
fs.writeFileSync(f, t);
console.log('written ' + t.length);
