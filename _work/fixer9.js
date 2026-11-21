
const fs = require('fs');
const bp = 'D:/编程/scratch/ai/minipython/_work/build.js';
let s = fs.readFileSync(bp, 'utf8');
const start = s.indexOf('  const stepCond = ');
const end = s.indexOf('  const scrollBlock = ifB(');
if (start < 0 || end < 0 || end < start) { console.log('MARKERS NOT FOUND', start, end); process.exit(1); }
console.log('replacing region of', end - start, 'chars');
const replacement = [
  "  // one line per pointer move: any up/down movement of at least one row height scrolls",
  "  // exactly one line, then the accumulator is reset (never scrolls several lines at once).",
  "  const stepDown = [setV('macc', B.num(0)), B.callProc('Controller', 'scrollone %s', sc.argIds, [B.num(1)], true)];",
  "  const stepUp = [setV('macc', B.num(0)), B.callProc('Controller', 'scrollone %s', sc.argIds, [B.num(-1)], true)];",
  "  const step = iIfElse(cmp('gt', B.VAR('macc'), B.num(12)), stepDown, [",
  "    iIf(cmp('lt', B.VAR('macc'), B.num(-12)), stepUp)",
  "  ]);",
  ""
].join('\n');
s = s.slice(0, start) + replacement + s.slice(end);
// the movement branch now uses ifB instead of the repeat-until loop
s = s.replace("    chgV('macc', C('operator_subtract', { inputs: { NUM1: B.REP(B.VAR('mpy'), [4, '0']), NUM2: B.REP(MY(), [4, '0']) } })),\n    innerLoop",
              "    chgV('macc', C('operator_subtract', { inputs: { NUM1: B.REP(B.VAR('mpy'), [4, '0']), NUM2: B.REP(MY(), [4, '0']) } })),\n    step");
fs.writeFileSync(bp, s);
console.log('one-line-per-move logic installed');
