const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.172.sb3 (newest)', 'MiniPy_v4.173.sb3 (newest)')
     .replace(/MiniPy_v4\.172\.sb3'/g, "MiniPy_v4.173.sb3'")
     .replace('MiniPy v4.172 - built', 'MiniPy v4.173 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p172 = 'P298'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.173 = +P307 (Tier-2 item 8, part 1: a parenthesised lambda is no longer parsed as a',
  '#           tuple).  `f = (lambda a, b: a + b)` died with "SyntaxError: lambda needs a colon"',
  '#           while the BARE `g = lambda a, b: a + b` already worked -- the lambda parameter',
  '#           comma was being taken as the tuple separator.  Two pieces, both inside `tuplelit`:',
  '#             * the top-level comma scan now tracks a lambda parameter list (`tqlf`): a depth-0',
  '#               `lambda` sets it, a depth-0 `:` clears it, and only while it is clear does a',
  '#               depth-0 comma count as an element separator (so `lambda a, b: a, b` still',
  '#               splits at the comma after the body, matching CPython);',
  '#             * when NO real comma was collected (`tqnc == 0`) the parentheses were pure',
  '#               grouping, so at the END of tuplelit the inner range is evaluated again and',
  '#               ev/evtype become that single value instead of a 1-tuple.',
  '#           (An earlier attempt -- relaxing the `(...)` -> tuplelit guard -- broke every',
  '#           parenthesised expression, so the fix lives inside tuplelit.)',
  '#           Verified: _lm2 3/5 -> 5/5, _lm 2/6 -> 3/6 (l1), func 31/31, _sm 31/33 unchanged.)',
  "$p173 = 'P307'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
