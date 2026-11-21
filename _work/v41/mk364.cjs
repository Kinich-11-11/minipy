// p364 = p363，但包裹方式改为 IFELSE(p344skip==0, [站点, 清0], [清0])，避免标志泄漏到后续语句/外层
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p363.txt', 'utf8');
const from = "      insertBeforeStmt(id, [IF(EQ(VAR('p344skip'), num(0)), [id])]);";
const to = "      insertBeforeStmt(id, [IFELSE(EQ(VAR('p344skip'), num(0)), [id, setV('p344skip', num(0))], [setV('p344skip', num(0))])]);";
if (!s.includes(from)) { console.log('MISS wrap'); process.exit(1); }
s = s.replace(from, to);
s = s.split('P363').join('P364');
fs.writeFileSync('_work/v41/p364.txt', s);
console.log('wrote p364.txt (flag cleared right after each site)');
