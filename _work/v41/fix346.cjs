const fs = require('fs');
let s = fs.readFileSync('_work/v41/p346.txt', 'utf8');
// 把"是否启用"的条件从"Tok[lo] 不是左括号"收紧为"Tok[lo] 不是左括号 且 Tok[lo+1] 是 ("
const from = "    IF(NOT(startsOpen(item('Tok', argOf('lo')))), [";
const to = [
  "    IF(NOT(startsOpen(item('Tok', argOf('lo')))), [",
  "      IF(EQ(item('Tok', ADD(argOf('lo'), num(1))), txt('(')), ["
].join('\n');
if (!s.includes(from)) { console.log('MISS open'); process.exit(1); }
s = s.replace(from, to);
// 相应地给这一段收尾再加一层 ]
const closeFrom = [
  "        chgV('p344i', num(1))",
  "      ])",
  "    ]),",
  "    // 链式后半段：三层嵌套 IF（**不要**用嵌套 AND）"
].join('\n');
const closeTo = [
  "        chgV('p344i', num(1))",
  "      ])",
  "      ])",
  "    ]),",
  "    // 链式后半段：三层嵌套 IF（**不要**用嵌套 AND）"
].join('\n');
if (!s.includes(closeFrom)) { console.log('MISS close'); process.exit(1); }
s = s.replace(closeFrom, closeTo);
fs.writeFileSync('_work/v41/p346.txt', s);
console.log('narrowed: needs Tok[lo+1] == "(" too');
