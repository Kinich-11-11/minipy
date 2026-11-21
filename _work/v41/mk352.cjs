// p352 = p351（已去探针、关 (D)）+ 第二段函数值改回 FnName[ev] + 第二段区间改成 (close+1, hi)
const fs = require('fs');
let s = fs.readFileSync('_work/v41/p351.txt', 'utf8');
// 1) 函数值用 FnName[ev]
const f1 = "          setV('p345fn', VAR('ev')),";
if (!s.includes(f1)) { console.log('MISS ev line'); process.exit(1); }
s = s.replace(f1, "          setV('p345fn', item('FnName', VAR('ev'))),");
// 2) 第二段区间：close+2,hi-1  ->  close+1,hi
const f2 = [
  "          callProc('callfn %s %s %s', [",
  "            VAR('p345fn'),",
  "            ADD(VAR('p344close'), num(2)),",
  "            SUB(argOf('hi'), num(1))",
  "          ]),"
].join('\n');
const t2 = [
  "          callProc('callfn %s %s %s', [",
  "            VAR('p345fn'),",
  "            ADD(VAR('p344close'), num(1)),",
  "            argOf('hi')",
  "          ]),"
].join('\n');
if (!s.includes(f2)) { console.log('MISS range'); process.exit(1); }
s = s.replace(f2, t2);
s = s.split('P351').join('P352');
fs.writeFileSync('_work/v41/p352.txt', s);
console.log('wrote p352.txt (second call range = close+1 .. hi)');
