// fix the two P128 bugs: (1) issubset compares the filtered set with the receiver instead of
// counting (the second listlen call read the wrong value), (2) isanc must keep its result in p2r,
// not in `ev` -- clspar overwrites `ev` with the parents string and the climb stopped after one level
const fs = require('fs');
const f = '_work/v41/p128.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
// strip the debug list + logs
rep("  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];\n  B.addList(IT, 'DbgL', []);",
  "  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];", 'drop dbgl');
const s0 = t.indexOf("  const subsetOf = (outerExpr, innerExpr) => [");
const s1 = t.indexOf("  insertBeforeStmt(failCall[0], [");
if (s0 < 0 || s1 < 0) throw new Error('subsetOf block not found');
const newSub = `  // a is a subset of b iff filtering a by b (keep = 1) leaves a unchanged -- the set encoding
  // is canonical (setnorm), so the two strings compare equal exactly when nothing was dropped
  const subsetOf = (outerExpr, innerExpr, eqExpr) => [
    setV('p2sh2', outerExpr),
    callProc('eval %s %s', [argOf('lo'), argOf('hi')]),
    setV('p2sh1', VAR('ev')),
    callProc('setfilter %s %s %s', [VAR('p2sh2'), VAR('p2sh1'), num(1)]),
    IFELSE(EQ(VAR('ev'), eqExpr), [setV('ev', num(1))], [setV('ev', num(0))]),
    setV('evtype', txt('B')),
    STOPTHIS()
  ];
`;
t = t.slice(0, s0) + newSub + t.slice(s1);
// issuperset swaps the two sets around, so the comparison is against the argument
rep(`    IF(EQ(argOf('meth'), txt('issubset')), subsetOf(argOf('rec'), VAR('p2sh1'))),
    IF(EQ(argOf('meth'), txt('issuperset')), subsetOf(VAR('p2sh1'), argOf('rec')))`,
  `    IF(EQ(argOf('meth'), txt('issubset')), subsetOf(argOf('rec'), VAR('p2sh1'), VAR('p2sh2'))),
    IF(EQ(argOf('meth'), txt('issuperset')), [
      callProc('eval %s %s', [argOf('lo'), argOf('hi')]),
      setV('p2sh1', VAR('ev')),
      setV('p2sh2', argOf('rec')),
      callProc('setfilter %s %s %s', [VAR('p2sh1'), VAR('p2sh2'), num(1)]),
      IFELSE(EQ(VAR('ev'), VAR('p2sh1')), [setV('ev', num(1))], [setV('ev', num(0))]),
      setV('evtype', txt('B')),
      STOPTHIS()
    ])`, 'call sites');
// isanc: keep the result in p2r
rep(`    setV('ev', num(0)), setV('p2cur', VAR('p2c1')), setV('p2cnt', num(0)),
    REPEATU(OR(GT(VAR('p2cnt'), num(24)), OR(EQ(VAR('ev'), num(1)), EQ(VAR('p2cur'), txt('')))), [
      IF(EQ(VAR('p2cur'), VAR('p2c2')), [setV('ev', num(1))]),
      IF(AND(EQ(VAR('ev'), num(0)), NOT(EQ(VAR('p2cur'), txt('')))), [
        setV('cname', VAR('p2cur')), callProc('clspar', []),
        setV('cspec', VAR('ev')), callProc('clssplit', []),
        IFELSE(GT(llen('CQ2'), num(0)), [setV('p2cur', item('CQ2', num(1)))], [setV('p2cur', txt(''))])
      ]),
      chgV('p2cnt', num(1))
    ])`,
  `    setV('p2r', num(0)), setV('p2cur', VAR('p2c1')), setV('p2cnt', num(0)),
    REPEATU(OR(GT(VAR('p2cnt'), num(24)), OR(EQ(VAR('p2r'), num(1)), EQ(VAR('p2cur'), txt('')))), [
      IF(EQ(VAR('p2cur'), VAR('p2c2')), [setV('p2r', num(1))]),
      IF(AND(EQ(VAR('p2r'), num(0)), NOT(EQ(VAR('p2cur'), txt('')))), [
        setV('cname', VAR('p2cur')), callProc('clspar', []),
        setV('cspec', VAR('ev')), callProc('clssplit', []),
        IFELSE(GT(llen('CQ2'), num(0)), [setV('p2cur', item('CQ2', num(1)))], [setV('p2cur', txt(''))])
      ]),
      chgV('p2cnt', num(1))
    ])`, 'isanc');
rep(`            callProc('isanc', []),
            setV('p2r', VAR('ev'))`,
  `            callProc('isanc', [])`, 'isanc caller');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
