const fs = require('fs');
const p = '_work/v41/p235.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "  const isOpen = (v) => OR(EQ(v, txt('(')), OR(EQ(v, txt('[')), EQ(v, txt('{'))));",
  "  const isClose = (v) => OR(EQ(v, txt(')')), OR(EQ(v, txt(']')), EQ(v, txt('}'))));"
].join('\n');
const to = [
  "  // 注意：新写的括号判定要用 operator_contains（补丁里 `=` 比括号字形不可靠，见 P230 的经验）",
  "  const CONTAINS = (hay, needle) => I('operator_contains', { inputs: { STRING1: B.REP(txt(hay), [10, '']), STRING2: B.REP(needle, [10, '']) } });",
  "  const isOpen = (v) => CONTAINS('([{', v);",
  "  const isClose = (v) => CONTAINS(')]}', v);"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
