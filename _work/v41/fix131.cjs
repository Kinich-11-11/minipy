const fs = require('fs');
const f = '_work/v41/p131.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep(`    IF(AND(EQ(tok(argOf('lo')), txt('isinstance')), (() => {
      // structural: only when the type argument actually starts with '('
      return true;
    })()), [`,
  `    IF(EQ(tok(argOf('lo')), txt('isinstance')), [`, 'simplify');
rep(`        ...forEachName([
          setV('p5a', VAR('p5a')), callProc('issub', []),`,
  `        ...forEachName([
          callProc('issub', []),`, 'drop noop');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
