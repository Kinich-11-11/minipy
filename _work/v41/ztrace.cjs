// stack trace through a line range
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || 'D:/编程/scratch/ai/minipython/_work/v41/p501.txt', 'utf8');
const LO = Number(process.argv[3] || 200), HI = Number(process.argv[4] || 214);
const MATCH = { ')': '(', ']': '[', '}': '{' };
let mode = 'code', line = 1;
const stack = [];
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  if (ch === '\n') { line++; if (mode === 'lc') mode = 'code'; continue; }
  if (mode === 'lc') continue;
  if (mode === 'bc') { if (ch === '*' && src[i + 1] === '/') { mode = 'code'; i++; } continue; }
  if (mode === 'str' || mode === 'tpl') {
    if (ch === '\\') { i++; continue; }
    if (mode === 'str' && (ch === "'" || ch === '"')) mode = 'code';
    else if (mode === 'tpl' && ch === '`') mode = 'code';
    continue;
  }
  if (ch === "'" || ch === '"') { mode = 'str'; continue; }
  if (ch === '`') { mode = 'tpl'; continue; }
  if (ch === '/' && src[i + 1] === '/') { mode = 'lc'; continue; }
  if (ch === '/' && src[i + 1] === '*') { mode = 'bc'; i++; continue; }
  if ('([{'.includes(ch)) { stack.push([ch, line]); if (line >= LO && line <= HI) console.log(line, 'open', ch, 'depth', stack.length); }
  if (')]}'.includes(ch)) {
    const top = stack.pop();
    if (line >= LO && line <= HI) console.log(line, 'close', ch, 'matched', top ? top[0] + '@' + top[1] : 'EMPTY');
    if (!top || top[0] !== MATCH[ch]) { console.log('MISMATCH line', line); process.exit(0); }
  }
}
