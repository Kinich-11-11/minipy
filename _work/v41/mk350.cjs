// p350 = p349（无 (D)）+ 在链式分支与通用 callfn 站点各插一条日志，跑 c2 看谁在干活
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p349.txt', 'utf8');
// 辅助
{
  const anchor = "patch('P349 bisect: chain disabled', () => {";
  const anchor2 = s.match(/patch\('[^']*', \(\) => \{/);
  const use = s.includes(anchor) ? anchor : anchor2[0];
  if (!s.includes('const LOGX')) {
    s = s.replace(use, [
      use,
      "  const LOGX = (expr) => callProc('log %s', [expr]);",
      "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"
    ].join('\n'));
  }
}
// 链式分支内：第一次 callfn 之前
const a1 = "          callProc('callfn %s %s %s', [\n            item('Tok', argOf('lo')),";
if (!s.includes(a1)) { console.log('MISS chain call'); process.exit(1); }
s = s.replace(a1, "          LOGX(JX(txt('CHAIN-IN lo='), argOf('lo'), txt(' close='), VAR('p344close'))),\n" + a1);
// 站点改写循环里：每个站点打一条（虽然不改写，仍在循环里）
const a2 = "    n++;\n  }\n  console.log('[P349] third argument replaced at '";
if (!s.includes(a2)) { console.log('MISS site loop'); process.exit(1); }
s = s.replace(a2, "    LOGX(JX(txt('SITE seen n='), VAR('p344ok'), txt(' end='), VAR('p344end'))),\n" + a2);
s = s.split('P349').join('P350');
fs.writeFileSync('_work/v41/p350.txt', s);
console.log('wrote p350.txt (no (D) + probes)');
