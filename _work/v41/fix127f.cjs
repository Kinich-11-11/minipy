// add a log at the "only lists have methods" fail and after the self fix
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep(`      IF(EQ(tokAt(argOf('lo')), txt('self')), [
        addTo('DbgL', JOIN(txt('selfv '), VAR('self'))),
        setV('xa', VAR('self')), setV('xb', txt('O'))
      ])`,
  `      IF(EQ(tokAt(argOf('lo')), txt('self')), [
        addTo('DbgL', JOIN(txt('selfv '), VAR('self'))),
        setV('xa', VAR('self')), setV('xb', txt('O'))
      ]),
      addTo('DbgL', JOIN(txt('O? '), JOIN(VAR('xb'), JOIN(txt('/'), VAR('lmeth')))))`, 'olog');
rep(`  {
    const mcDef = defIdOf('methodcall %s %s');`,
  `  {
    const failMsg = find(reach(defIdOf('methodcall %s %s')), (b) => b.opcode === 'procedures_call'
      && JSON.stringify(b.inputs || {}).includes('only lists have methods'));
    if (failMsg.length !== 1) throw new Error('[P127] methodcall fail msg = ' + failMsg.length);
    insertBeforeStmt(failMsg[0], [
      addTo('DbgL', JOIN(txt('FAIL lo='), JOIN(tokAt(argOf('lo')), JOIN(txt(' xa='), JOIN(VAR('xa'), JOIN(txt(' xb='), JOIN(VAR('xb'), JOIN(txt(' m='), VAR('lmeth')))))))))
    ]);
    const mcDef = defIdOf('methodcall %s %s');`, 'faillog');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
