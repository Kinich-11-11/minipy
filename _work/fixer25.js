
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const idx = s.indexOf('// ============ PATCH 10a');
if (idx >= 0) s = s.slice(0, idx);
const parts = ['p10a.txt', 'p10b.txt', 'p10c.txt', 'p10d.txt'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n');
const tail = [
  '',
  '// ---- write ----',
  'fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });',
  'fs.writeFileSync(OUT_JSON, JSON.stringify(project));',
  "const outEntries = entries.map(e => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);",
  'zipWrite(outEntries, OUT_SB3);',
  "console.log('wrote', OUT_SB3, JSON.stringify(project).length, 'bytes json');",
  ''
].join('\n');
fs.writeFileSync(bp, s + parts + '\n' + tail);
console.log('patch10 (fixed) re-applied');
