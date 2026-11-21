const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.157.sb3 (newest)', 'MiniPy_v4.158.sb3 (newest)')
     .replace(/MiniPy_v4\.157\.sb3'/g, "MiniPy_v4.158.sb3'")
     .replace('MiniPy v4.157 - built', 'MiniPy v4.158 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p157 = 'P265'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.158 = +P268 (builtin pow()).  Two defects in one place:',
  '#     * `builtin2b`\'s pow branch hand-rolled repeated multiplication and demanded an integer',
  '#       exponent, so `pow(2, 0.5)` died with "ValueError: pow() needs an integer exponent";',
  '#       the branch body is now just `powval(a1v, ev)` -- the very proc `**` uses (float and',
  '#       negative exponents both work, and powval fills in ev/evK/evtype itself).',
  '#     * `eval`\'s multi-argument dispatch only knew 0/1/2 arguments, so `pow(2, 3, 5)` fell',
  '#       through to the user-function path and reported "NameError: name \'pow\'".  A new branch',
  '#       counts top-level arguments and, for pow with exactly 3, evaluates a/b/m and answers',
  '#       `powval(a, b) % m` (0 modulus -> ValueError, as in CPython).',
  '#   `pow(2)` (one argument) still reports NameError instead of TypeError -- noted, not fixed.)',
  "$p158 = 'P268'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
