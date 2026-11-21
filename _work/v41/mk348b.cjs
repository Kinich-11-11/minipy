const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
const needle = "    IF(EQ(VAR('p344ok'), num(1)), [";
const i1 = s.indexOf(needle);
const i2 = s.lastIndexOf(needle);
console.log('occurrences: first=' + i1 + ' last=' + i2);
if (i2 < 0 || i1 === i2) { console.log('MISS: only one occurrence (unexpected)'); process.exit(1); }
s = s.slice(0, i2) + "    IF(EQ(num(1), num(2)), [   // 【二分实验】链式后半段关闭" + s.slice(i2 + needle.length);
s = s.split('P347').join('P348');
fs.writeFileSync('_work/v41/p348.txt', s);
console.log('wrote p348.txt (chain disabled, last occurrence)');