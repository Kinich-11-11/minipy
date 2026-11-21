// temp: register P203 (v4.131) in the rebuild-old skip map
//   - define $p131
//   - prepend $p131 to every version entry (so no older rebuild picks P203 up)
//   - add the new 'v4.131' = '' entry above 'v4.130'
const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v41/rebuild-old.ps1';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('$p131')) { console.log('already registered'); process.exit(0); }
const nl = s.includes('\r\n') ? '\r\n' : '\n';

// 1) the constant
const before = s;
s = s.replace(/(\$p130 = 'P202'[^\r\n]*)/, "$1" + nl + "$p131 = 'P203'");
if (s === before) throw new Error('constant anchor not found');

// 2) prepend to every version mapping
let n = 0;
s = s.replace(/(\n(\s*)'v4\.(\d+)' = )"([^"]*)"/g, (m, pre, ind, ver, val) => {
  n++;
  const nv = val === '' ? '$p131' : '$p131,' + val;
  return pre + '"' + nv + '"';
});
if (n < 100) throw new Error('only ' + n + ' version entries found');

// 3) the new version entry (v4.130 now skips P203, so it is no longer the newest)
const anchor = /(\n)(\s*)'v4\.130' = /;
if (!anchor.test(s)) throw new Error('v4.130 entry not found');
s = s.replace(anchor, (m, br, ind) => br + ind + "'v4.131' = ''" + br + ind + "'v4.130' = ");

// 4) document the release at the top of the comment block
s = s.replace(/(#   rule: every shipped update bumps the version by one)/,
  '#   v4.131 = +P203 (raise the six hard limits: 1000 lines / 2000 chars per line /\\n' +
  '#           16384-char value / 2000 console lines / recursion 512 + expression\\n' +
  '#           depth 768 / 50000+450000*speed steps / 100000 steps per call)\\n' +
  '$1');
fs.writeFileSync(p, s);
console.log('entries updated = ' + n);
