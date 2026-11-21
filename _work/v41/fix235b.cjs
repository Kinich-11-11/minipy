const fs = require('fs');
const p = '_work/v41/p235.txt';
let s = fs.readFileSync(p, 'utf8');
const from = [
  "    setV('pwrap', num(1)),",
  "    setV('pd', num(0)),",
  "    setV('pk', ADD(argOf('lo'), num(1))),",
  "    REPEATU(GT(VAR('pk'), SUB(argOf('hi'), num(1))), [",
  "      IF(isOpen(item('Tok', VAR('pk'))), [chgV('pd', num(1))]),",
  "      IF(isClose(item('Tok', VAR('pk'))), [chgV('pd', num(-1))]),",
  "      IF(LT(VAR('pd'), num(0)), [setV('pwrap', num(0))]),",
  "      IF(AND(EQ(VAR('pd'), num(0)), LT(VAR('pk'), SUB(argOf('hi'), num(1)))), [setV('pwrap', num(0))]),",
  "      chgV('pk', num(1))",
  "    ])"
].join('\n');
const to = [
  "    setV('pwrap', num(1)),",
  "    setV('pd', num(0)),",
  "    setV('pk', argOf('lo')),",
  "    REPEATU(GT(VAR('pk'), argOf('hi')), [",
  "      IF(isOpen(item('Tok', VAR('pk'))), [chgV('pd', num(1))]),",
  "      IF(isClose(item('Tok', VAR('pk'))), [chgV('pd', num(-1))]),",
  "      IF(AND(EQ(VAR('pd'), num(0)), LT(VAR('pk'), argOf('hi'))), [setV('pwrap', num(0))]),",
  "      chgV('pk', num(1))",
  "    ])"
].join('\n');
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
