const fs = require('fs');
const p = '_work/v41/p263.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "        setV('kwt', VAR('evtype')),",
  "        callProc('lesc %s', [VAR('kws')]),",
  "        setV('kws', VAR('ev')),",
  "        callProc('lesc %s', [VAR('kwt')]),   // 占位：lesc 只处理字符串，这里保持类型原样",
  "        setV('kwacc', joinAll([VAR('kwacc'), J(LSEP(), txt('S')), VAR('kws'), J(LSEP(), VAR('kwt')), VAR('ev')])),"
].join('\n');
const to = [
  "        setV('kwt', VAR('evtype')),",
  "        callProc('lesc %s', [VAR('kws')]),",
  "        setV('kws', VAR('ev')),",
  "        callProc('lesc %s', [VAR('ev')]),   // 转义值（非字符串类型 lesc 原样返回）",
  "        setV('kwacc', joinAll([VAR('kwacc'), J(LSEP(), txt('S')), VAR('kws'), J(LSEP(), VAR('kwt')), VAR('ev')])),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
