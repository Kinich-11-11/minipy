const fs = require('fs');
const p = '_work/v41/p284.txt';
let s = fs.readFileSync(p, 'utf8');
// reprval 改用"入口短路"写法：不找它的实例分支（结构不明），直接在函数体最前面判断并返回
const from = "  patchOne('strval %s %s', '__str__', 'vv');\n  patchOne('reprval %s %s', '__repr__', 'vv');";
const to = [
  "  patchOne('strval %s %s', '__str__', 'vv');",
  "  // reprval 的实例分支结构与 strval 不同（找不到那条引用 InstCls 的赋值），",
  "  // 所以改成在它的函数体最前面短路：有 __repr__ 就直接 callmeth 并结束本过程。",
  "  {",
  "    const rv = defIdOf('reprval %s %s');",
  "    const clsName = I('operator_join', {",
  "      inputs: {",
  "        STRING1: B.REP(item('InstCls', argOf('vv')), [10, '']),",
  "        STRING2: B.REP(txt('.__repr__'), [10, ''])",
  "      }",
  "    });",
  "    insertBeforeStmt(BL()[rv].next, [",
  "      IF(AND(EQ(argOf('vt'), txt('O')), inFn(clsName)), [",
  "        callProc('callmeth %s %s %s %s', [argOf('vv'), txt('__repr__'), num(1), num(0)]),",
  "        STOPTHIS()",
  "      ])",
  "    ]);",
  "    console.log('[P284] reprval entry short-circuit installed');",
  "  }"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to);
// 需要 STOPTHIS
if (!s.includes('const STOPTHIS')) {
  s = s.replace("  const inFn = (nameExpr)", "  const STOPTHIS = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });\n  const inFn = (nameExpr)");
}
fs.writeFileSync(p, s);
console.log('ok');
