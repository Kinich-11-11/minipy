// 把链式 IF 的 AND(AND(a,b),c) 改成三层嵌套 IF（避开嵌套 AND 的拼法问题），并去掉所有诊断日志
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');

// 1) 去掉 C/E/A 诊断行与辅助函数
{
  const lines = s.split('\n').filter((l) => {
    if (/LOGX\(JX\(txt\('[CEA][0-9]/.test(l)) return false;
    if (l.trim().startsWith('const LOGX')) return false;
    if (l.trim().startsWith('const JX')) return false;
    return true;
  });
  s = lines.join('\n');
}

// 2) 找到链式 IF 的那一行，替换成嵌套 IF 写法
const start = s.indexOf('    IF(AND(AND(EQ(VAR(\'p344ok\'), num(1)), LT(VAR(\'p344close\'), argOf(\'hi\'))), isOpen(item(\'Tok\', ADD(VAR(\'p344close\'), num(1))))), [');
if (start < 0) { console.log('MISS chain IF head'); process.exit(1); }
// 找到该 IF 对应的结尾（"    ])" 紧跟其后、位于 stopThis 之后）
const tail = s.indexOf('      stopThis()\n    ])', start);
if (tail < 0) { console.log('MISS chain IF tail'); process.exit(1); }
const body = s.slice(start, tail + '      stopThis()\n    ])'.length);
// body 形如:
//     IF(<cond>, [
//       <statements>
//       stopThis()
//     ])
const inner = body.slice(body.indexOf('[\n') + 2, body.lastIndexOf('      stopThis()'));
const tok = "item('Tok', ADD(VAR('p344close'), num(1)))";
const replacement = [
  "    IF(EQ(VAR('p344ok'), num(1)), [",
  "      IF(LT(VAR('p344close'), argOf('hi')), [",
  "        IF(EQ(" + tok + ", txt('(')), [",
  inner.replace(/\n$/, ''),
  "          stopThis()",
  "        ])",
  "      ])",
  "    ])"
].join('\n');
s = s.slice(0, start) + replacement + s.slice(tail + '      stopThis()\n    ])'.length);
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('chain IF is now three nested IFs; diagnostics stripped');
