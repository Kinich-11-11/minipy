const fs = require('fs');
const f = '_work/v41/p133.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep(`  replaceStmt(tnmIf[0], [callProc('clnames', []), setV('tnm', VAR('c3nm'))].length === 2 && tnmIf[0]);
  // (replaceStmt takes a statement, so wrap the two statements in an IF(true)-free chain instead)
  spliceAfter(tnmIf[0], chain([setV('tnm', VAR('c3nm'))]));
  insertBeforeStmt(tnmIf[0], [callProc('clnames', [])]);`,
  `  // (replaceStmt swaps in a single statement, so group the two under an always-true IF)\n  replaceStmt(tnmIf[0], IF(EQ(num(1), num(1)), [callProc('clnames', []), setV('tnm', VAR('c3nm'))]));`,
  'try site');
rep(`  replaceStmt(t2nIf[0], IF(txt('1'), [callProc('clnames', []), setV('t2n', VAR('c3nm'))]));`,
  `  replaceStmt(t2nIf[0], IF(EQ(num(1), num(1)), [callProc('clnames', []), setV('t2n', VAR('c3nm'))]));`, 'walk site');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
