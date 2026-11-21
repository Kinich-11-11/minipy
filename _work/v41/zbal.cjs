// real-ish paren balance scan (skips strings, template literals, comments, regex-ish)
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'D:/编程/scratch/ai/minipython/_work/v41/build41.js', 'utf8');
let depth = 0, line = 1, mode = 'code';
const stack = [];
for (let i = 0; i < src.length; i++) {
  const ch = src[i], nx = src[i + 1];
  if (ch === '\n') { line++; if (mode === 'linecomment') mode = 'code'; continue; }
  if (mode === 'linecomment') continue;
  if (mode === 'blockcomment') { if (ch === '*' && nx === '/') { mode = 'code'; i++; } continue; }
  if (mode === 'str' || mode === 'tpl' || mode === 'strdq') {
    if (ch === '\\') { i++; continue; }
    if (mode === 'str' && ch === "'") mode = 'code';
    else if (mode === 'strdq' && ch === '"') mode = 'code';
    else if (mode === 'tpl' && ch === '`') mode = 'code';
    continue;
  }
  if (ch === "'" ) { mode = 'str'; continue; }
  if (ch === '"') { mode = 'strdq'; continue; }
  if (ch === '`') { mode = 'tpl'; continue; }
  if (ch === '/' && nx === '/') { mode = 'linecomment'; continue; }
  if (ch === '/' && nx === '*') { mode = 'blockcomment'; i++; continue; }
  if (ch === '(' || ch === '[' || ch === '{') { depth++; stack.push([ch, line]); continue; }
  if (ch === ')' || ch === ']' || ch === '}') {
    depth--;
    stack.pop();
    if (depth < 0) { console.log('EXTRA close at line', line, JSON.stringify(src.slice(Math.max(0, i - 40), i + 5))); depth = 0; }
  }
}
console.log('final depth:', depth);
for (const [c, l] of stack.slice(-5)) console.log('unclosed', c, 'from line', l);
