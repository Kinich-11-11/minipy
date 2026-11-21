const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.158.sb3 (newest)', 'MiniPy_v4.159.sb3 (newest)')
     .replace(/MiniPy_v4\.158\.sb3'/g, "MiniPy_v4.159.sb3'")
     .replace('MiniPy v4.158 - built', 'MiniPy v4.159 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p158 = 'P268'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.159 = +P270 (unhashable keys/elements).  MiniPy silently accepted `d[[1]] = 2`,',
  '#           `{[1]: 2}`, `{{1: 2}: 3}` and `{[1]}`; CPython raises TypeError for all four.',
  '#           Three guards, each matching CPython 3.14 verbatim:',
  '#             * dictpair -- a dict LITERAL key (key type is dgkt right after the key is evaled);',
  '#             * indexset -- the D branch (a[..] = v really goes pathset -> tokenize',
  '#               "__pw[__pi]=__pv" -> indexset; the key type is isKeyT, the field string isKeyF);',
  '#             * setnorm -- a set element (set literals go eval -> listlit -> setnorm).',
  '#           KEY GOTCHA: the message must start with "TypeError: " -- trycatch matches the',
  '#           exception class by that "<name>: " prefix, so without it the error is raised but',
  '#           `except TypeError` never catches it (that cost one round to find).',
  '#           Guarded types are L/D/E only; tuples stay hashable, as in CPython.)',
  "$p159 = 'P270'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
