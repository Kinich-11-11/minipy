// 临时调试：判断 assignlist 的扁平名字表是否真的跑了（augmark: W = 跑了）
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const auSets = find(al,";
const ins = [
  "  newVar('augmark', '');",
  "  insertBeforeStmt(flatWalk, [setV('augmark', txt('W'))]);",
  "  spliceAfter(flatGuard, chain([callProc('fail %s', [JOIN(txt('M='), VAR('augmark'))])]));",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
