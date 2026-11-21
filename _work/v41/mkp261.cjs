const fs = require('fs');
const p = '_work/v41/p260.txt';
let s = fs.readFileSync(p, 'utf8');
// 1) 把插入点从"n 分支之前"改成"最后一个转义分支（b）之后"
const from = "  insertBeforeStmt(nBranch[0], [";
const to = "  insertAfterBranch(nBranch[0], [";
if (!s.includes(from)) { console.log('MISS1'); process.exit(1); }
s = s.replace(from, to);
// 2) 不再依赖 nBranch 的定位，改为"转义链最后一个分支"的定位 + helper
const marker = "  const numOf = (list, val) => I('data_itemnumoflist', { fields: B.LISTF(list), inputs: { ITEM: B.REP(val, [10, '']) } });";
const helper = [
  "  const numOf = (list, val) => I('data_itemnumoflist', { fields: B.LISTF(list), inputs: { ITEM: B.REP(val, [10, '']) } });",
  "  // Scratch 的 `=` 不区分大小写：解出的字母若是 a/b/f/n/r/t/v/x 之一，会被后面的转义分支再次改写",
  "  // （`'A' == 'a'` 为真）。所以这段必须插在**整条转义链的最后**。",
  "  const insertAfterBranch = (firstBranch, stmts) => {",
  "    let cur = firstBranch, last = firstBranch;",
  "    for (let i = 0; i < 20 && cur; i++) {",
  "      const b = BL()[cur];",
  "      if (b.opcode === 'control_if' || b.opcode === 'control_if_else') last = cur;",
  "      const nx = b.next;",
  "      if (!nx) break;",
  "      const nb = BL()[nx];",
  "      if (nb.opcode !== 'control_if' && nb.opcode !== 'control_if_else') break;",
  "      cur = nx;",
  "    }",
  "    spliceAfter(last, chain(stmts));",
  "  };"
].join('\n');
if (!s.includes(marker)) { console.log('MISS2'); process.exit(1); }
s = s.replace(marker, helper);
fs.writeFileSync(p, s);
console.log('ok');
