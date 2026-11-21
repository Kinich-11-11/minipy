const fs = require('fs');
let s = fs.readFileSync('_work/v41/p433.txt', 'utf8');
const from = "      IF(AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf(pLo), argOf(pHi)))), [";
const to = "      IF(AND(NOT(EQ(VAR('iid'), txt(''))), AND(EQ(VAR('narg'), num('0')), NOT(GT(argOf(pLo), argOf(pHi))))), [";
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
s = s.replace(from, to).split('P433').join('P434');
fs.writeFileSync('_work/v41/p434.txt', s);
console.log('gate on iid<>"" added');