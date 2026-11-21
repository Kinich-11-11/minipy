const fs = require('fs');
const p = '_work/v41/p265.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "    IF(EQ(VAR('evtype'), txt('S')), [",
  "      setV('evK', txt(''),",
  "      STOPTHIS()",
  "    ])"
].join('\n');
const to = [
  "    IF(EQ(VAR('evtype'), txt('S')), [",
  "      // MiniPy 的 type(x) 返回 `<class 'int'>` 这种字符串，__name__ 要取里面的名字",
  "      IF(AND(GT(lenOf(VAR('ev')), num(10)), EQ(letterOf(num(1), VAR('ev')), txt('<'))), [",
  "        callProc('substr %s %s %s', [VAR('ev'), num(9), SUB(lenOf(VAR('ev')), num(2))])",
  "      ]),",
  "      setV('evK', txt('')),",
  "      STOPTHIS()",
  "    ])"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
