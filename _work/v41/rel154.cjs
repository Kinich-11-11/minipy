const fs = require('fs');
// 补丁名与文件统一为 P261
let s = fs.readFileSync('_work/v41/p261.txt', 'utf8');
s = s.replace("patch('P260 hex escapes (printable range only)'", "patch('P261 hex escapes (printable range only)'");
s = s.replace(/\[P260\]/g, '[P261]');
fs.writeFileSync('_work/v41/p261.txt', s);
// head.txt
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.153.sb3 (newest)', 'MiniPy_v4.154.sb3 (newest)')
     .replace(/MiniPy_v4\.153\.sb3'/g, "MiniPy_v4.154.sb3'")
     .replace('MiniPy v4.153 - built', 'MiniPy v4.154 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p153 = 'P246'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.154 = +P261 (hex escapes in string literals).  tokenize only decoded n/t/r/v/f/a/b, so',
  '#           `\\x41` stayed as the literal text `x41` (and repr showed `\'x41\'`).  The escape',
  '#           chain now decodes `\\xHH` for the printable range 32..126 using two lookup lists',
  '#           (`HexD` for the digit values, `Asc95` = the 95 printable chars -- deliberately no',
  '#           control chars, since scratch-vm drops some of them and shifts the table).',
  '#           KEY gotcha: the new branch MUST be the LAST in the escape chain -- Scratch `=` is',
  '#           case-insensitive, so a decoded `A`/`a`/`N`/… would otherwise be re-escaped by the',
  '#           later `if ec == "a"` / `"n"` branches (that is exactly why `\\x41` first came out as',
  '#           BEL, i.e. `\\a`).  Codes below 32 / above 126 keep the old literal behaviour.)',
  "$p154 = 'P261'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
