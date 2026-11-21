const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');

// 1) 三个字形判定改成 contains（第 76 轮：Scratch 的 `=` 对圆括号字形不可靠）
const from = [
  "  const isOpen = (e) => OR(OR(EQ(e, txt('(')), EQ(e, txt('['))), EQ(e, txt('{')));",
  "  const isClose = (e) => OR(OR(EQ(e, txt(')')), EQ(e, txt(']'))), EQ(e, txt('}')));",
  "  const startsOpen = (e) => OR(EQ(e, txt('(')), EQ(e, txt('[')));"
].join('\n');
const to = [
  "  // 用 contains 代替 `=`（第 76 轮：`=` 对圆括号字形不可靠；contains 的'针'非空，空串安全）",
  "  const hasAny = (e, needles) => {",
  "    let acc = null;",
  "    for (const nd of needles) {",
  "      const c = I('operator_contains', { inputs: { STRING1: B.REP(e, [10, '']), STRING2: B.REP(txt(nd), [10, '']) } });",
  "      acc = acc ? OR(acc, c) : c;",
  "    }",
  "    return acc;",
  "  };",
  "  const isOpen = (e) => hasAny(e, ['(', '[', '{']);",
  "  const isClose = (e) => hasAny(e, [')', ']', '}']);",
  "  const startsOpen = (e) => hasAny(e, ['(', '[']);"
].join('\n');
if (!s.includes(from)) { console.log('MISS glyph fns'); process.exit(1); }
s = s.replace(from, to);

// 2) 在链式 IF 之前加一条**无条件**诊断日志（只打前 3 次，避免淹没）
const anchor = "    // ---------- (2) 链式后半段 ----------";
const diag = [
  "    // 无条件诊断：p344ok / p344close / hi / Tok[lo] / Tok[p344close+1]",
  "    IF(LT(VAR('p344dbg'), num(3)), [",
  "      chgV('p344dbg', num(1)),",
  "      callProc('log %s', [JOIN(txt('D ok='), JOIN(VAR('p344ok'), JOIN(txt(' close='), JOIN(VAR('p344close'), JOIN(txt(' hi='), argOf('hi'))))))]),",
  "      callProc('log %s', [JOIN(txt('D Tok[lo]=['), JOIN(item('Tok', argOf('lo')), txt(']')))]),",
  "      callProc('log %s', [JOIN(txt('D Tok[close+1]=['), JOIN(item('Tok', ADD(VAR('p344close'), num(1))), txt(']')))])",
  "    ]),"
].join('\n');
if (!s.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
s = s.replace(anchor, diag + '\n' + anchor);

// 3) 声明 p344dbg
const declFrom = "  newVar('p344close', 0); newVar('p344d', 0); newVar('p344i', 0); newVar('p344b', ''); newVar('p344ok', 0);";
const declTo = "  newVar('p344close', 0); newVar('p344d', 0); newVar('p344i', 0); newVar('p344b', ''); newVar('p344ok', 0); newVar('p344dbg', 0);";
if (!s.includes(declFrom)) { console.log('MISS decl'); process.exit(1); }
s = s.replace(declFrom, declTo);
s = s.replace("for (const n of ['p345fn', 'p344close', 'p344d', 'p344i', 'p344b', 'p344ok']) {",
              "for (const n of ['p345fn', 'p344close', 'p344d', 'p344i', 'p344b', 'p344ok', 'p344dbg']) {");
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('p345 updated: contains-based glyph tests + diagnostic log');
