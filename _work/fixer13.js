
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const oldBlock = [
  "  const inVars = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),",
  "                     AND(cmp('gt', MY(), B.num(29)), cmp('lt', MY(), B.num(118))));",
  "  const inConsole = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),",
  "                        AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(29))));",
  "  const inGutter = AND(AND(cmp('gt', MX(), B.num(-230)), cmp('lt', MX(), B.num(-206))),",
  "                       AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(118))));",
  "  const zoneBlocks = () => [",
  "    setV('mzone', B.num(0)),",
  "    ifB(inConsole, [setV('mzone', B.num(2))]),",
  "    ifB(inVars, [setV('mzone', B.num(1))]),",
  "    ifB(inGutter, [setV('mzone', B.num(3))])",
  "  ];"
].join('\n');
const newBlock = [
  "  // one fresh set of region tests per key hat (a Scratch block may only have one parent)",
  "  const zoneBlocks = () => {",
  "    const inConsole = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),",
  "                          AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(29))));",
  "    const inVars = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),",
  "                       AND(cmp('gt', MY(), B.num(29)), cmp('lt', MY(), B.num(118))));",
  "    const inGutter = AND(AND(cmp('gt', MX(), B.num(-230)), cmp('lt', MX(), B.num(-206))),",
  "                         AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(118))));",
  "    return [",
  "      setV('mzone', B.num(0)),",
  "      ifB(inConsole, [setV('mzone', B.num(2))]),",
  "      ifB(inVars, [setV('mzone', B.num(1))]),",
  "      ifB(inGutter, [setV('mzone', B.num(3))])",
  "    ];",
  "  };"
].join('\n');
if (!s.includes(oldBlock)) { console.log('PATTERN NOT FOUND'); process.exit(1); }
s = s.replace(oldBlock, newBlock);
fs.writeFileSync(bp, s);
console.log('per-hat region tests installed');
