const fs = require('fs');
let h = fs.readFileSync('_work/v41/head.txt', 'utf8');
h = h.replace('MiniPy_v4.152.sb3 (newest)', 'MiniPy_v4.153.sb3 (newest)')
     .replace(/MiniPy_v4\.152\.sb3'/g, "MiniPy_v4.153.sb3'")
     .replace('MiniPy v4.152 - built', 'MiniPy v4.153 - built');
fs.writeFileSync('_work/v41/head.txt', h);
let r = fs.readFileSync('_work/v41/rebuild-old.ps1', 'utf8');
const anchor = "$p152 = 'P245'";
if (!r.includes(anchor)) { console.log('MISS anchor'); process.exit(1); }
const ins = [
  '#   v4.153 = +P246 (multi-line triple-quoted strings).  `joinlines` deliberately cancelled the',
  '#           line continuation whenever a line ended inside a string (`if NOT(xgs == ""): xgb = 0`),',
  '#           so a docstring spanning lines was never merged and `tokenize` (which only sees one',
  '#           line at a time) always raised "SyntaxError: unclosed string".  The scan now tracks',
  '#           whether the open string is a triple quote (`xgt`), requires three matching quotes to',
  '#           close it, keeps the continuation for triple quotes, and only strips a trailing',
  '#           backslash when there really is one.  NOTE: the merge joins with a SPACE (the line',
  '#           text may not contain a raw newline -- `checkASCII` rejects it), so the *content* of a',
  '#           multi-line string differs from CPython (`a b` instead of `a\\nb`); harmless for',
  '#           docstrings.  Effect: the user\'s original `make_student(...)` program now runs.)',
  "$p153 = 'P246'",
  anchor
].join('\n');
fs.writeFileSync('_work/v41/rebuild-old.ps1', r.replace(anchor, ins));
console.log('ok');
