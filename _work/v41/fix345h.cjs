const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');

// 1) 去掉 C1–C6 诊断行
const lines = s.split('\n').filter((l) => !/LOGX\(JX\(txt\('C[0-9]/.test(l));
s = lines.join('\n');

// 2) 字形判定改回 EQ（C4 实验证明：contains 拼法在这里恒为 false，而 EQ 才是可用的那个）
const from = [
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
const to = [
  "  // 字形判定用 EQ（第 110 轮实验：contains 拼法在这里恒为 false；EQ 才可用）",
  "  const isOpen = (e) => OR(OR(EQ(e, txt('(')), EQ(e, txt('['))), EQ(e, txt('{')));",
  "  const isClose = (e) => OR(OR(EQ(e, txt(')')), EQ(e, txt(']'))), EQ(e, txt('}')));",
  "  const startsOpen = (e) => OR(EQ(e, txt('(')), EQ(e, txt('[')));"
].join('\n');
if (!s.includes(from)) { console.log('MISS hasAny'); process.exit(1); }
s = s.replace(from, to);
if (s.includes('hasAny')) { console.log('WARN: hasAny still referenced'); }
if (s.includes("txt('C1")) { console.log('WARN: diagnostics left'); }
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('glyph tests back to EQ; diagnostics removed');
