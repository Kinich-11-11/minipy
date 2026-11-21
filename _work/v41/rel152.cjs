const fs = require('fs');
// head.txt
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.151.sb3 (newest)', 'MiniPy_v4.152.sb3 (newest)')
     .replace(/MiniPy_v4\.151\.sb3'/g, "MiniPy_v4.152.sb3'")
     .replace('MiniPy v4.151 - built', 'MiniPy v4.152 - built');
fs.writeFileSync('_work/v41/head.txt', h);
// rebuild-old.ps1
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p151 = 'P244'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.152 = +P245 (triple-quoted strings).  tokenize only understood a single quote, so',
  '#           `"""doc"""` was chopped into empty-string + identifier + empty-string pieces',
  '#           (single-line case: "SyntaxError: expression") and any multi-line string died with',
  '#           "SyntaxError: unclosed string".  The quote branch is now wrapped in a triple-quote',
  '#           test that swallows everything up to the closing triple quote.',
  '#           Effect: one-line docstrings work, and the user\'s original shopping-cart program',
  '#           (dict-of-dicts + docstrings) now runs correctly.  Multi-line strings still fail --',
  '#           programs are split into lines in `prepare` before tokenizing, so that needs a',
  '#           line-joining pre-pass (next round).)',
  "$p152 = 'P245'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
