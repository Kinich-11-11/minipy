// p354 = p347（(D) 在、链式在）+ 在 5 个 callfn 站点各打一条日志：
// 站点 id、p344ok、p344end、hi —— 跑 d9 看 p344end 是否被算错/陈旧
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
const anchor = "patch('P347 chained call second half', () => {";
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [
    anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
  ].join('\n'));
}
const target = "    b.inputs[keys[2]] = B.REP(SUB(VAR('p344end'), num(1)), [4, '0']);";
if (!s.includes(target)) { console.log('MISS (D) line'); process.exit(1); }
s = s.replace(target, [
  "    LOGX(JX(txt('S ' + id + ' ok='), VAR('p344ok'), txt(' end='), VAR('p344end'), txt(' hi='), argOf('hi'))),",
  "    " + target
].join('\n'));
s = s.split('P347').join('P354');
fs.writeFileSync('_work/v41/p354.txt', s);
console.log('wrote p354.txt (site logs)');
