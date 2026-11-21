// 恢复 p228.txt 中被误覆盖的两处改动（contains 判定 + assignlist 分支）
const fs = require('fs');
const p = '_work/v41/p228.txt';
let s = fs.readFileSync(p, 'utf8');
const before = s;
const rep = (from, to, tag) => {
  if (!s.includes(from)) { console.log('MISS ' + tag); return false; }
  s = s.replace(from, to);
  console.log('ok   ' + tag);
  return true;
};

// (1) 括号判定改用 operator_contains（补丁里 `=` 比括号字形不可靠）
rep("  const isOpen = (v) => OR(EQ(v, txt('(')), EQ(v, txt('[')));\n  const isClose = (v) => OR(EQ(v, txt(')')), EQ(v, txt(']')));",
  "  // 补丁里用 `=` 比较**括号字形**不可靠（实测 letter(1,\"(a,b)\") == \"(\" 为 false；\n" +
  "  // MiniPy 自己的字符串比较走 compareText/字形表）。operator_contains 是纯 JS 子串判断，可靠。\n" +
  "  const CONTAINS = (hay, needle) => I('operator_contains', { inputs: { STRING1: B.REP(txt(hay), [10, '']), STRING2: B.REP(needle, [10, '']) } });\n" +
  "  const isOpen = (v) => CONTAINS('([{', v);\n" +
  "  const isClose = (v) => CONTAINS(')]}', v);",
  'contains helpers');
rep("      IF(OR(isOpen(item('Tok', VAR('fi2'))), EQ(item('Tok', VAR('fi2')), txt('{'))), [chgV('fd', num(1))]),\n      IF(OR(isClose(item('Tok', VAR('fi2'))), EQ(item('Tok', VAR('fi2')), txt('}'))), [chgV('fd', num(-1))]),",
  "      IF(isOpen(item('Tok', VAR('fi2'))), [chgV('fd', num(1))]),\n      IF(isClose(item('Tok', VAR('fi2'))), [chgV('fd', num(-1))]),",
  'forloop brace checks');

// (2) assignlist：含括号的目标跳过扁平名字表，交给 unpackto
const site3 = [
  "",
  "  // ---------------- (3) assignlist ----------------",
  "  // `(a, b), c = ...` / `a, (b, c) = ...`：扁平名字表要求每个目标 token 都是 Kind == \"I\"，",
  "  // 所以遇到括号会报 \"SyntaxError: invalid assignment target\"。目标里出现括号时跳过它，",
  "  // 等右侧求值完成后直接把名字串交给 unpackto（上面的类型检查照常执行）。",
  "  const chainFind = (head, pred) => { for (let cur = head; cur; cur = BL()[cur].next) if (pred(BL()[cur])) return cur; return null; };",
  "  const al = reach(defIdOf('assignlist %s'));",
  "  const flatWalk = one(find(al, (b) => b.opcode === 'control_repeat_until' && b.inputs.CONDITION",
  "    && deepHas(b.inputs.CONDITION[1], (x) => x.opcode === 'operator_gt' && nameOf(x.inputs.OPERAND1) === 'mi', 0)",
  "    && b.inputs.SUBSTACK",
  "    && deepHas(b.inputs.SUBSTACK[1], (y) => y.opcode === 'data_addtolist' && y.fields.LIST[0] === 'AName', 0)), 'assignlist flat walk');",
  "  insertBeforeStmt(flatWalk, [",
  "    setV('augrp', num(0)),",
  "    setV('augnames', txt('')),",
  "    setV('aui2', num(1)),",
  "    REPEATU(GT(VAR('aui2'), SUB(argOf('eqi'), num(1))), [",
  "      IF(isOpen(item('Tok', VAR('aui2'))), [setV('augrp', num(1))]),",
  "      setV('augnames', JOIN(VAR('augnames'), item('Tok', VAR('aui2')))),",
  "      chgV('aui2', num(1))",
  "    ])",
  "  ]);",
  "  const flatNx = BL()[flatWalk].next;",
  "  const flatPred = predecessorOf(flatWalk);",
  "  if (!flatPred || !flatNx) throw new Error('[P228] unexpected assignlist position');",
  "  const flatGuard = IF(EQ(VAR('augrp'), num(0)), [flatWalk]);",
  "  BL()[flatPred].next = flatGuard;",
  "  BL()[flatGuard].parent = flatPred;",
  "  BL()[flatGuard].next = flatNx;",
  "  BL()[flatNx].parent = flatGuard;",
  "  const auSets = find(al, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE[0] === 'auenc'",
  "    && b.inputs.VALUE && nameOf(b.inputs.VALUE) === 'ev');",
  "  if (!auSets.length) throw new Error('[P228] no assignlist auenc');",
  "  for (const auSet of auSets) {",
  "    spliceAfter(auSet, chain([",
  "      IF(EQ(VAR('augrp'), num(1)), [",
  "        callProc('unpackto %s %s', [VAR('augnames'), VAR('ev')]),",
  "        STOP()",
  "      ])",
  "    ]));",
  "  }",
  "  console.log('[P228] assignlist handles bracketed targets');",
  ""
].join('\n');
rep("  console.log('[P228] forloop collects bracketed targets');", site3 + "  console.log('[P228] forloop collects bracketed targets');", 'assignlist site');
fs.writeFileSync(p, s);
console.log(before.length + ' -> ' + s.length + ' bytes');
