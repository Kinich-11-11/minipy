const fs = require('fs');
const p = '_work/v41/p259.txt';
let s = fs.readFileSync(p, 'utf8');
const helper = [
  "  const numOf = (list, val) => I('data_itemnumoflist', { fields: B.LISTF(list), inputs: { ITEM: B.REP(val, [10, '']) } });",
  "  ['h1', 'h2', 'hv'].forEach((n) => newVar(n, 0));"
].join('\n');
const oldDecl = "  ['h1', 'h2', 'hv'].forEach((n) => newVar(n, 0));";
if (!s.includes(oldDecl)) { console.log('MISS1'); process.exit(1); }
s = s.replace(oldDecl, helper);
const from = "      setV('hv', ADD(MUL(SUB(itemNum('HexD', VAR('h1')), num(1)), num(16)), SUB(itemNum('HexD', VAR('h2')), num(1)))),";
const to = "      setV('hv', ADD(MUL(SUB(numOf('HexD', VAR('h1')), num(1)), num(16)), SUB(numOf('HexD', VAR('h2')), num(1)))),";
if (!s.includes(from)) { console.log('MISS2'); process.exit(1); }
fs.writeFileSync(p, s.replace(from, to));
console.log('ok');
