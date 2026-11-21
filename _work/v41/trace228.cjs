// 全链路追踪：把标记累加到 MiniPy 变量 trace（测试程序里 print(trace) 即可看到路径）
const fs = require('fs');

// --- p229: 调 assignlist 之前打 'C'
{
  const p = '_work/v41/p229.txt';
  let s = fs.readFileSync(p, 'utf8');
  const old = "  const asgCall = one(find(reach(BL()[tail].inputs.SUBSTACK[1]), (b) => b.opcode === 'procedures_call'";
  if (!s.includes(old)) { console.log('MISS p229'); process.exit(1); }
  const ins = [
    "  newVar('trace', '');",
    "  {",
    "    const ac = one(find(reach(BL()[tail].inputs.SUBSTACK[1]), (b) => b.opcode === 'procedures_call'",
    "      && b.mutation.proccode === 'assignlist %s'), 'assignlist call');",
    "    insertBeforeStmt(ac, [setV('trace', JOIN(VAR('trace'), txt('C')))]);",
    "  }",
    ""
  ].join('\n');
  fs.writeFileSync(p, s.replace(old, ins + old));
  console.log('ok p229');
}

// --- p228: 入口 'A'、eval 后 'E'、捷径前 'S'、unpackto 分派 'D'、分组 'G'
{
  const p = '_work/v41/p228.txt';
  let s = fs.readFileSync(p, 'utf8');
  const marks = [
    ["  insertBeforeStmt(flatWalk, [\n    setV('augrp', num(0)),", "A"],
    ["        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),", "S"],
    ["        callProc('listitem %s %s', [ENC(), VAR('unk')]),", "D"],
    ["          callProc('substr %s %s %s', [VAR('unseg'), num(2), SUB(lenOf(VAR('unseg')), num(1))]),", "G"]
  ];
  for (const [anchor, tag] of marks) {
    if (!s.includes(anchor)) { console.log('MISS p228 ' + tag); process.exit(1); }
  }
  s = s.replace("  insertBeforeStmt(flatWalk, [\n    setV('augrp', num(0)),",
    "  insertBeforeStmt(flatWalk, [\n    setV('trace', JOIN(VAR('trace'), txt('A'))),\n    setV('augrp', num(0)),");
  s = s.replace("        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),",
    "        setV('trace', JOIN(VAR('trace'), txt('S'))),\n        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),");
  s = s.replace("        callProc('listitem %s %s', [ENC(), VAR('unk')]),",
    "        setV('trace', JOIN(VAR('trace'), txt('D'))),\n        callProc('listitem %s %s', [ENC(), VAR('unk')]),");
  s = s.replace("          callProc('substr %s %s %s', [VAR('unseg'), num(2), SUB(lenOf(VAR('unseg')), num(1))]),",
    "          setV('trace', JOIN(VAR('trace'), txt('G'))),\n          callProc('substr %s %s %s', [VAR('unseg'), num(2), SUB(lenOf(VAR('unseg')), num(1))]),");
  s = s.replace("'fcomma', 'fd', 'augrp', 'augnames', 'aui2']", "'fcomma', 'fd', 'augrp', 'augnames', 'aui2', 'trace']");
  fs.writeFileSync(p, s);
  console.log('ok p228');
}
