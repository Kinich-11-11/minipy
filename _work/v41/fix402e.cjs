const fs = require('fs');
let s = fs.readFileSync('_work/v41/p402.txt', 'utf8');
// 1) 放宽断言：不再要求 keyEval
s = s.replace("  if (!keyEval || !minkeyCall || !last) {", "  if (!minkeyCall || !last) {");
s = s.replace("    throw new Error('[P402] keyEval/minkey/last missing');", "    throw new Error('[P402] minkey/last missing');");
// 2) 把 (3) 从"跟在 keyEval 之后"改成"插在 elseFirst（mkhi = mkend-2）之后"
const from = `  // (3) eval 之后存 default 值
  spliceAfter(keyEval, chain([
    IF(EQ(VAR('mkdef'), num(1)), [
      setV('mkdfv', VAR('ev')),
      setV('mkdft', VAR('evtype'))
    ])
  ]));`;
const to = `  // (3) 紧跟"可迭代范围收窄"之后：自己把 default 的值求出来（范围 = mkklo .. hi）
  spliceAfter(elseFirst, chain([
    IF(EQ(VAR('mkdef'), num(1)), [
      callProc('eval %s %s', [VAR('mkklo'), argOf('hi')]),
      setV('mkdfv', VAR('ev')),
      setV('mkdft', VAR('evtype')),
      setV('error', txt('')),
      setV('evK', txt('')),
      setV('mkpos', ADD(argOf('lo'), num(2))),
      setV('mkdep', num(0))
    ])
  ]));`;
if (!s.includes(from)) { console.log('MISS step3'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync('_work/v41/p402.txt', s);
console.log('step3 rewritten');