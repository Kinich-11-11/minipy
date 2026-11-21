const fs = require('fs');
let s = fs.readFileSync('_work/v41/p409.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
const from = "  insertBeforeStmt(site, [\n    IF(EQ(argOf('lefttype'), txt('O')), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, [
  "  insertBeforeStmt(site, [",
  "    LOGX(JX(txt('EQ lt='), argOf('lefttype'), txt(' lv=['), argOf('leftval'), txt('] cls=['), item('InstCls', argOf('leftval')), txt('] fnhas='), I('data_listcontainsitem', { fields: B.LISTF('FnName'), inputs: { ITEM: B.REP(JOIN(item('InstCls', argOf('leftval')), txt('.__eq__')), [10, '']) } }))),",
  "    IF(EQ(argOf('lefttype'), txt('O')), ["
].join('\n'));
s = s.split('P409').join('P410');
fs.writeFileSync('_work/v41/p410.txt', s);
console.log('wrote p410.txt');