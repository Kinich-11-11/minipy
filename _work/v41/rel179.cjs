const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.178.sb3 (newest)', 'MiniPy_v4.179.sb3 (newest)')
     .replace(/MiniPy_v4\.178\.sb3'/g, "MiniPy_v4.179.sb3'")
     .replace('MiniPy v4.178 - built', 'MiniPy v4.179 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p178 = 'P317'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.179 = +P318 (Tier-3 item 11, second dunder: A()[i] honours __getitem__).',
  '#           `class A: def __getitem__(self, i): return i*2` then `A()[3]` died with',
  '#           "TypeError: string index required".  Three iterations to get the site AND the',
  '#           argument range right, both worth remembering:',
  '#             * the failing statement lives INSIDE `indexget %s %s`, but mid-body (after the',
  '#               target is evaluated); inserting at the body head did nothing because evtype',
  '#               was not "O" yet;',
  '#             * `indexget` has exactly two callers, both in `eval`, and they pass eval\'s own',
  '#               lo/hi -- i.e. the WHOLE subscript expression including the target.  So the',
  '#               argument range is neither `lo+1..hi-1` (SyntaxError: parentheses) nor `lo..hi`',
  '#               (RecursionError: it re-dispatches on itself): P318 scans forward from lo for',
  '#               the first "[", backward from hi for the "]", and takes what is between.',
  '#             * and, per the P315 lesson, the receiver is saved into `igev` FIRST, because',
  '#               evaluating anything writes through `ev`.',
  '#           Verified: _oo 23/30 -> 24/30 (o26), func 31/31, _dictset 30/30 unchanged.)',
  "$p179 = 'P318'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
