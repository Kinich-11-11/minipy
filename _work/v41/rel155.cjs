const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.154.sb3 (newest)', 'MiniPy_v4.155.sb3 (newest)')
     .replace(/MiniPy_v4\.154\.sb3'/g, "MiniPy_v4.155.sb3'")
     .replace('MiniPy v4.154 - built', 'MiniPy v4.155 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p154 = 'P261'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.155 = +P262 (map() / filter()).  Both were simply missing ("NameError: name \'map\'").',
  '#           The patch rides on the machinery P130 built for `sorted(key=...)`: set the globals',
  '#           `p4v`/`p4vt` (element value/type), `p4bi` (1 = builtin), `p4bin`/`p4fn` (the name) and',
  '#           call the existing `callval` proc, which renders the element as source text, tokenizes',
  '#           it, calls the function and restores the current line\'s tokens afterwards.',
  '#           Filter keeps the ORIGINAL element (not the callback result).  The branch is spliced',
  '#           right after eval\'s first statement (insertBeforeStmt on the body head trips over a',
  '#           stale predecessorOf).  Limitation: the first argument must be a single identifier',
  '#           (builtin or user function name) -- lambdas are not supported yet.)',
  "$p155 = 'P262'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
