const fs = require('fs');
let s = fs.readFileSync('_work/v41/p378.txt', 'utf8');
const anchor = s.match(/patch\('[^']*', \(\) => \{/)[0];
if (!s.includes('const LOGX')) {
  s = s.replace(anchor, [anchor,
    "  const LOGX = (expr) => callProc('log %s', [expr]);",
    "  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);"].join('\n'));
}
// 在 lookup 回退的最外层加上诊断：found / len(FnStack) / len(CloL)
const from = "    IF(EQ(VAR('found'), num(0)), [\n      IF(GT(llen('FnStack'), num(0)), [";
if (!s.includes(from)) { console.log('MISS A'); process.exit(1); }
s = s.replace(from, [
  "    IF(EQ(VAR('found'), num(0)), [",
  "      LOGX(JX(txt('L0 found=0 fnstack='), llen('FnStack'), txt(' cloL='), llen('CloL'), txt(' vn='), argOf('vn'))),",
  "      IF(GT(llen('FnStack'), num(0)), ["
].join('\n'));
// 进入搜索前再打一条
const from2 = "          IF(GT(item('CloL', VAR('cloFi')), num(0)), [\n            setV('cloJ', num(0)),";
if (!s.includes(from2)) { console.log('MISS B'); process.exit(1); }
s = s.replace(from2, [
  "          IF(GT(item('CloL', VAR('cloFi')), num(0)), [",
  "            LOGX(JX(txt('L1 fi='), VAR('cloFi'), txt(' n='), item('CloL', VAR('cloFi')), txt(' cloN1=['), item('CloN', num(1)), txt(']'))),",
  "            setV('cloJ', num(0)),"
].join('\n'));
// 命中时打一条
const from3 = "                setV('found', llen('Names')),";
if (!s.includes(from3)) { console.log('MISS C'); process.exit(1); }
s = s.replace(from3, [
  "                LOGX(JX(txt('L2 HIT '), argOf('vn'), txt(' -> '), llen('Names'))),",
  "                setV('found', llen('Names')),"
].join('\n'));
s = s.split('P378').join('P379');
fs.writeFileSync('_work/v41/p379.txt', s);
console.log('wrote p379.txt');
