const fs = require('fs');
const p = '_work/v41/p280.txt';
let s = fs.readFileSync(p, 'utf8');
// 去掉没用的 isCont
const from = s.slice(s.indexOf('  const isCont = (t) =>'), s.indexOf('  insertBeforeStmt(sumIf, ['));
if (!from) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, '');
// 补 STOPTHIS 定义
const anchor = "  const cf = reach(defIdOf('callfn %s %s %s'));";
const helper = [
  "  const STOPTHIS = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });",
  anchor
].join('\n');
if (!s.includes(anchor)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, helper));
console.log('ok');
