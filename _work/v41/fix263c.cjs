const fs = require('fs');
const p = '_work/v41/p263.txt';
let s = fs.readFileSync(p, 'utf8');
// 变量声明补 kvv/kvvt
s = s.replace("['kwp', 'kwacc', 'kwd', 'kwvlo', 'kws', 'kwt', 'kwhas'].forEach((n) => newVar(n, 0));",
              "['kwp', 'kwacc', 'kwd', 'kwvlo', 'kws', 'kwt', 'kwhas', 'kvv', 'kvvt'].forEach((n) => newVar(n, 0));");
// 修 1：先保存值，再转义键（lesc 会把结果写回 ev）
const from = [
  "        setV('kwt', VAR('evtype')),",
  "        callProc('lesc %s', [VAR('kws')]),",
  "        setV('kws', VAR('ev')),",
  "        callProc('lesc %s', [VAR('ev')]),   // 转义值（非字符串类型 lesc 原样返回）",
  "        setV('kwacc', joinAll([VAR('kwacc'), J(LSEP(), txt('S')), VAR('kws'), J(LSEP(), VAR('kwt')), VAR('ev')])),"
].join('\n');
const to = [
  "        setV('kvv', VAR('ev')),          // 先保存值：lesc 会把结果写回 ev",
  "        setV('kvvt', VAR('evtype')),",
  "        callProc('lesc %s', [VAR('kws')]),",
  "        setV('kws', VAR('ev')),",
  "        callProc('lesc %s', [VAR('kvv')]),   // 转义值（非字符串类型 lesc 原样返回）",
  "        setV('kwt', VAR('kvvt')),",
  "        setV('kwacc', joinAll([VAR('kwacc'), J(LSEP(), txt('S')), VAR('kws'), J(LSEP(), VAR('kwt')), VAR('ev')])),"
].join('\n');
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
// 修 2：assign 用 dupd 之后的合并结果（ev），而不是 kwacc
const from2 = "      callProc('assign %s %s %s', [argOf('nm'), VAR('kwacc'), txt('D')]),";
const to2 = "      callProc('assign %s %s %s', [argOf('nm'), VAR('ev'), txt('D')]),";
if (!s.includes(from2)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from2, to2));
console.log('ok');
