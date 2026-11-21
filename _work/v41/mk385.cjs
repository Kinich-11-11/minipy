const fs = require('fs');
let s = fs.readFileSync('_work/v41/p384.txt', 'utf8');
s = s.replace("  const cond = NOT(EQ(item('Tok', argOf('hi')), txt(',')));",
  "  const cond = NOT(GT(VAR('lplo'), argOf('hi')));   // 尾段非空才求值");
s = s.replace("  console.log('[P384] wrapped the tail range in IF(Tok[hi] != \",\")');",
  "  console.log('[P384] wrapped the tail range in IF(lplo <= hi)');");
s = s.split('P384').join('P385');
fs.writeFileSync('_work/v41/p385.txt', s);
console.log('wrote p385.txt');