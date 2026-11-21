// bracket TYPE matching with string/comment awareness
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'D:/编程/scratch/ai/minipython/_work/v41/p501.txt', 'utf8');
const MATCH = { ')': '(', ']': '[', '}': '{' };
let mode = 'code', line = 1, q = null;
const stack = [];
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  if (ch === '\n') { line++; if (mode === 'lc') mode = 'code'; continue; }
  if (mode === 'lc') continue;
  if (mode === 'bc') { if (ch === '*' && src[i + 1] === '/') { mode = 'code'; i++; } continue; }
  if (mode === 'str' || mode === 'tpl') {
    if (ch === '\\') { i++; continue; }
    if (mode === 'str' && ch === q) mode = 'code';
    else if (mode === 'tpl' && ch === '`') mode = 'code';
    continue;
  }
  if (ch === "'" || ch === '"') { mode = 'str'; q = ch; continue; }
  if (ch === '`') { mode = 'tpl'; continue; }
  if (ch === '/' && src[i + 1] === '/') { mode = 'lc'; continue; }
  if (ch === '/' && src[i + 1] === '*') { mode = 'bc'; i++; continue; }
  if ('([{'.includes(ch)) { stack.push([ch, line]); continue; }
  if (')]}'.includes(ch)) {
    const top = stack.pop();
    if (!top || top[0] !== MATCH[ch]) { console.log('MISMATCH at line', line, 'closing', ch, 'opened by', top); process.exit(0); }
  }
}
console.log('consistent; unclosed:', stack.slice(-3));
