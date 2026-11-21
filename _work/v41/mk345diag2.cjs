const fs = require('fs');
let s = fs.readFileSync('_work/v41/p345.txt', 'utf8');
const marker = "    // ---------- (2) 链式后半段 ----------";
if (!s.includes(marker)) { console.log('MISS'); process.exit(1); }
const tok = "item('Tok', ADD(VAR('p344close'), num(1)))";
const diag = [
  marker,
  "    LOGX(JX(txt('E1 eqparen='), EQ(" + tok + ", txt('(')))),",
  "    LOGX(JX(txt('E2 eqclose='), EQ(item('Tok', VAR('p344close')), txt(')')))),",
  "    LOGX(JX(txt('E3 len='), lenOf(" + tok + "))),",
  "    LOGX(JX(txt('E4 letter1=['), letterOf(num(1), " + tok + "), txt(']'))),"
].join('\n');
s = s.replace(marker, diag);
fs.writeFileSync('_work/v41/p345.txt', s);
console.log('E1-E4 diagnostics inserted');