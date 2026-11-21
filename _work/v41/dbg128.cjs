// temporary: log the issubset lengths and the isanc climb (fixed anchors)
const fs = require('fs');
const f = '_work/v41/p128.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];",
  "  const bale = () => [chgV('fnlimit', num(-1)), STOPTHIS()];\n  B.addList(IT, 'DbgL', []);", 'dbgl');
rep(`    callProc('setfilter %s %s %s', [outerExpr, innerExpr, num(1)]),
    callProc('listlen %s', [VAR('ev')]),
    IFELSE(EQ(VAR('ev'), VAR('p2sh2')), [setV('ev', num(1))], [setV('ev', num(0))]),`,
  `    addTo('DbgL', JOIN(txt('sub n='), JOIN(VAR('p2sh2'), JOIN(txt(' arg='), JOIN(VAR('p2sh1'), JOIN(txt(' at='), VAR('evtype'))))))),
    callProc('setfilter %s %s %s', [outerExpr, innerExpr, num(1)]),
    addTo('DbgL', JOIN(txt('filt='), VAR('ev'))),
    callProc('listlen %s', [VAR('ev')]),
    addTo('DbgL', JOIN(txt('fn='), VAR('ev'))),
    IFELSE(EQ(VAR('ev'), VAR('p2sh2')), [setV('ev', num(1))], [setV('ev', num(0))]),`, 'sublog');
rep(`      IF(EQ(VAR('p2cur'), VAR('p2c2')), [setV('ev', num(1))]),
      IF(AND(EQ(VAR('ev'), num(0)), NOT(EQ(VAR('p2cur'), txt('')))), [
        setV('cname', VAR('p2cur')), callProc('clspar', []),`,
  `      IF(EQ(VAR('p2cur'), VAR('p2c2')), [setV('ev', num(1))]),
      addTo('DbgL', JOIN(txt('climb '), JOIN(VAR('p2cur'), JOIN(txt('->'), JOIN(VAR('p2c2'), JOIN(txt(' ev='), VAR('ev'))))))),
      IF(AND(EQ(VAR('ev'), num(0)), NOT(EQ(VAR('p2cur'), txt('')))), [
        setV('cname', VAR('p2cur')), callProc('clspar', []),
        addTo('DbgL', JOIN(txt('par='), VAR('ev'))),`, 'isanc log');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
