const fs = require('fs');
const p = '_work/v41/p290.txt';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  spliceAfter(bindCall, chain([\n    IFELSE(GT(llen('ErrV'), num(0)), [";
const diag = "  spliceAfter(bindCall, chain([\n" +
  "    FAIL(JOIN(JOIN(JOIN(JOIN(JOIN(txt('PZ67 asnm='), VAR('asnm')), txt(' ascp=')), VAR('ascp')), txt(' err=')), VAR('error'))),\n" +
  "    IFELSE(GT(llen('ErrV'), num(0)), [";
if (!s.includes(anchor)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(anchor, diag));
console.log('diag added');
