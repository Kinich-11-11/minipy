const fs = require('fs');
let s = fs.readFileSync('_work/v41/p405.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// 在 ELSE 分支末尾加一条日志（用已有的 keIf/elseFirst 变量）
const from = "  spliceAfter(elseFirst, chain([";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, "  spliceAfter(elseFirst, chain([\n    LOGX(JX(txt('PRE mkhi='), VAR('mkhi'), txt(' mkklo='), VAR('mkklo'), txt(' mkkhi='), VAR('mkkhi'), txt(' et='), VAR('evtype'))),");
// 找 ELSE 分支最后一条语句并在其后加日志
const from2 = "  console.log('[P405] default= installed (bypass minkey key loop)');";
s = s.replace(from2, [
  "  {",
  "    let c = elseFirst, lastS = null;",
  "    while (c) { lastS = c; c = BB[c].next; }",
  "    spliceAfter(lastS, chain([",
  "      LOGX(JX(txt('POST mkhi='), VAR('mkhi'), txt(' mkn='), VAR('mkn'), txt(' ev=['), VAR('ev'), txt('] et='), VAR('evtype'), txt(' err=['), VAR('error'), txt(']')))",
  "    ]));",
  "    console.log('[P405] tail probe at ' + lastS);",
  "  }",
  from2
].join('\n'));
s = s.split('P405').join('P407');
fs.writeFileSync('_work/v41/p407.txt', s);
console.log('wrote p407.txt');