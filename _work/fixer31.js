
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const w = s.indexOf('// ---- write ----');
if (w < 0) { console.log('NO WRITE MARKER'); process.exit(1); }
s = s.slice(0, w);
const tail = [
  '// ---- write ----',
  'fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });',
  'fs.writeFileSync(OUT_JSON, JSON.stringify(project));',
  "const outEntries = entries.map(e => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);",
  'zipWrite(outEntries, OUT_SB3);',
  "console.log('wrote', OUT_SB3, JSON.stringify(project).length, 'bytes json');",
  ''
].join('\n');
const parts = fs.readFileSync(dir + 'p12.txt', 'utf8');
fs.writeFileSync(bp, s + parts + '\n' + tail);
console.log('p12 appended cleanly, length', (s + parts + tail).length);
