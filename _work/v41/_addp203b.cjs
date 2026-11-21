// temp: finish the P203 registration -- v4.130 was written with single quotes so the
// generic pass skipped it, and the changelog comment ended up with literal \n.
const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v41/rebuild-old.ps1';
let s = fs.readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';

const a = "  'v4.130' = ''";
if (!s.includes(a)) throw new Error('v4.130 entry not found');
s = s.replace(a, '  \'v4.130\' = "$p131"');

// the comment block: turn the escaped newlines back into real ones
s = s.replace(/#   v4\.131 = \+P203 \(raise the six hard limits:[^\r\n]*/,
  ['#   v4.131 = +P203 (raise the six hard limits: 1000 lines / 2000 chars per line /',
   '#           16384-char value / 2000 console lines / recursion 512 + expression',
   '#           depth 768 / 50000+450000*speed steps / 100000 steps per call)'].join(nl));
fs.writeFileSync(p, s);
console.log('fixed');
