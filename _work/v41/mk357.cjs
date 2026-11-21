const fs = require('fs');
let s = fs.readFileSync('_work/v41/p347.txt', 'utf8');
const from = [
  "          callProc('callfn %s %s %s', [",
  "            VAR('p345fn'),",
  "            ADD(VAR('p344close'), num(2)),",
  "            SUB(argOf('hi'), num(1))",
  "          ]),"
].join('\n');
const to = [
  "          callProc('callfn %s %s %s', [",
  "            VAR('p345fn'),",
  "            ADD(VAR('p344close'), num(1)),",
  "            SUB(argOf('hi'), num(1))",
  "          ]),"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p357.txt', s.replace(from, to).split('P347').join('P357'));
console.log('wrote p357.txt (second call range = close+1 .. hi-1)');