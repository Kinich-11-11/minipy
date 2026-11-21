// 给 p345.txt 的链式分支插三条日志（用辅助函数拼 JOIN，避免括号不配对）
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');

// 在补丁体里注入两个辅助函数（放在 taken 声明之前）
const anchor = "patch('P345 chained call second half', () => {";
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const helpers = [
  anchor,
  '  const LOGX = (expr) => callProc(\'log %s\', [expr]);',
  '  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);'
].join('\n');
s = s.replace(anchor, helpers);

// 三条探针
const p1 = "      callProc('callfn %s %s %s', [\n        item('Tok', argOf('lo')),";
if (!s.includes(p1)) { console.log('MISS p1'); process.exit(1); }
s = s.replace(p1, "      LOGX(JX(txt('A0 lo='), argOf('lo'), txt(' close='), VAR('p344close'), txt(' hi='), argOf('hi'))),\n" + p1);

const p2 = "      setV('p345fn', item('FnName', VAR('ev'))),";
if (!s.includes(p2)) { console.log('MISS p2'); process.exit(1); }
s = s.replace(p2, "      LOGX(JX(txt('A1 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n" + p2);

const p3 = "      callProc('callfn %s %s %s', [\n        VAR('p345fn'),";
if (!s.includes(p3)) { console.log('MISS p3'); process.exit(1); }
s = s.replace(p3, "      LOGX(JX(txt('A2 fn=['), VAR('p345fn'), txt(']'))),\n" + p3);

const p4 = "      stopThis()\n    ])";
if (!s.includes(p4)) { console.log('MISS p4'); process.exit(1); }
s = s.replace(p4, "      LOGX(JX(txt('A3 ev=['), VAR('ev'), txt('] t='), VAR('evtype'))),\n" + p4);

fs.writeFileSync('_work/v41/p345.txt', s);
console.log('chain probes injected (balanced)');
