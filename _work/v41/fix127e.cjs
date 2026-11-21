// anchor the self.m() fix on methodcall's `lmeth` assignment (the statement P55 spliced the
// dispatch after) instead of insertBeforeStmt, and log for one verification cycle
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  B.addList(IT, 'CQ2', []);", "  B.addList(IT, 'CQ2', []);\n  B.addList(IT, 'DbgL', []);", 'dbgl');
const start = t.indexOf("  // ---------- (f) `self.m(...)`");
const end = t.indexOf("  // ---------- (d2) iscls <name>");
if (start < 0 || end < 0) throw new Error('fix block not found');
const fix = `  // ---------- (f) \`self.m(...)\`: \`self\` is not an ordinary MiniPy variable, so methodcall's
  // receiver evaluation comes back as 0.  Put the running instance in before the instance
  // dispatch runs.
  {
    const mcDef = defIdOf('methodcall %s %s');
    const lmAssign = find(reach(mcDef), (b) => b.opcode === 'data_setvariableto'
      && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'lmeth');
    if (lmAssign.length !== 1) throw new Error('[P127] methodcall lmeth assign = ' + lmAssign.length);
    spliceAfter(lmAssign[0], chain([
      addTo('DbgL', JOIN(txt('pre '), JOIN(tokAt(argOf('lo')), JOIN(txt('/'), JOIN(VAR('xa'), JOIN(txt('/'), VAR('xb'))))))),
      IF(EQ(tokAt(argOf('lo')), txt('self')), [
        addTo('DbgL', JOIN(txt('selfv '), VAR('self'))),
        setV('xa', VAR('self')), setV('xb', txt('O'))
      ])
    ]));
    console.log('[P127] self.m() reaches the instance dispatch');
  }

`;
t = t.slice(0, start) + fix + t.slice(end);
fs.writeFileSync(f, t);
console.log('written ' + t.length);
