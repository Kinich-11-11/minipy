const fs = require('fs');
let s = fs.readFileSync('_work/v41/p346.txt', 'utf8');

// (a) 声明 p344end
s = s.replace(
  "  for (const n of ['p344close', 'p344ok', 'p344d', 'p344i', 'p344b', 'p345fn']) {",
  "  for (const n of ['p344close', 'p344ok', 'p344d', 'p344i', 'p344b', 'p345fn', 'p344end']) {"
);
s = s.replace(
  "  newVar('p344b', ''); newVar('p345fn', '');",
  "  newVar('p344b', ''); newVar('p345fn', ''); newVar('p344end', 0);"
);

// (b) 在链式 IF 之前算 p344end（只有"真链式调用"才收窄）
const marker = "    // 链式后半段：三层嵌套 IF（**不要**用嵌套 AND）";
if (!s.includes(marker)) { console.log('MISS marker'); process.exit(1); }
const endCalc = [
  marker,
  "    setV('p344end', argOf('hi')),",
  "    IF(EQ(VAR('p344ok'), num(1)), [",
  "      IF(LT(VAR('p344close'), argOf('hi')), [",
  "        IF(EQ(tokAtClose1(), txt('(')), [",
  "          setV('p344end', VAR('p344close'))",
  "        ])",
  "      ])",
  "    ]),"
].join('\n');
s = s.replace(marker, endCalc);

// (c) 站点第三实参改用 p344end-1
const from = "    b.inputs[keys[2]] = B.REP(SUB(VAR('p344close'), num(1)), [4, '0']);";
const to = "    b.inputs[keys[2]] = B.REP(SUB(VAR('p344end'), num(1)), [4, '0']);";
if (!s.includes(from)) { console.log('MISS third arg'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P346').join('P347');
fs.writeFileSync('_work/v41/p347.txt', s);
console.log('wrote p347.txt (p344end unification)');
