const fs = require('fs');
const p = '_work/v41/p262.txt';
let s = fs.readFileSync(p, 'utf8');
// 变量：存原元素
s = s.replace(
  "  ['mpd', 'mpk', 'mpcut', 'mpn', 'mpi', 'mpfn', 'mpbin', 'mpout', 'mpkeep', 'mpit', 'mpt', 'mpisMap'].forEach((n) => newVar(n, 0));",
  "  ['mpd', 'mpk', 'mpcut', 'mpn', 'mpi', 'mpfn', 'mpbin', 'mpout', 'mpkeep', 'mpit', 'mpt', 'mpisMap', 'mpel', 'mpelt'].forEach((n) => newVar(n, 0));"
);
// 在 callval 之前保存原元素
const from = "      callProc('listitem %s %s', [VAR('mpit'), VAR('mpi')]),\n      setV('p4v', VAR('ev')),";
const to = "      callProc('listitem %s %s', [VAR('mpit'), VAR('mpi')]),\n      setV('mpel', VAR('ev')),\n      setV('mpelt', VAR('evtype')),\n      setV('p4v', VAR('ev')),";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
// filter 收集原元素（不是回调返回值）
const from2 = "        IF(EQ(VAR('mpkeep'), num(1)), [setV('mpout', enc(VAR('mpout'), VAR('evtype'), VAR('ev')))])";
const to2 = "        IF(EQ(VAR('mpkeep'), num(1)), [setV('mpout', enc(VAR('mpout'), VAR('mpelt'), VAR('mpel')))])";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
