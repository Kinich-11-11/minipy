// 临时调试：在 assignlist 的扁平守卫前后各插一个标记
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  const auSets = find(al,";
const ins = [
  "  insertBeforeStmt(flatGuard, [callProc('fail %s', [txt('BEFORE-GUARD')])]);",
  "  spliceAfter(flatGuard, chain([callProc('fail %s', [txt('AFTER-GUARD')])]));",
  ""
].join('\n');
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, ins + anchor));
console.log('instrumented');
