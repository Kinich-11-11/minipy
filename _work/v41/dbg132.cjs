const fs = require('fs');
const f = '_work/v41/p132.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  const last = (l) => item(l, txt('last'));", "  const last = (l) => item(l, txt('last'));\n  B.addList(IT, 'DbgL', []);", 'dbgl');
rep(`    setV('t2x', item('Elses', SUB(last('TryHand'), num(1)))),
    setV('t2done', num(0)),`,
  `    setV('t2x', item('Elses', SUB(last('TryHand'), num(1)))),
    addTo('DbgL', JOIN(txt('start th='), JOIN(last('TryHand'), JOIN(txt(' nx='), JOIN(VAR('t2x'), JOIN(txt(' te='), last('TryEnd'))))))),
    setV('t2done', num(0)),`, 'start log');
rep(`      IFELSE(EQ(item('Tok', num(1)), txt('except')), [`,
  `      addTo('DbgL', JOIN(txt('line '), JOIN(VAR('t2x'), JOIN(txt(' head='), item('Tok', num(1)))))),
      IFELSE(EQ(item('Tok', num(1)), txt('except')), [`, 'line log');
rep(`        IFELSE(EQ(VAR('t2hit'), num(1)), [
          setV('tlast', VAR('error')),`,
  `        addTo('DbgL', JOIN(txt('test '), JOIN(VAR('t2n'), JOIN(txt(' hit='), VAR('t2hit'))))),
        IFELSE(EQ(VAR('t2hit'), num(1)), [
          setV('tlast', VAR('error')),`, 'test log');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
