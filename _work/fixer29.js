
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
let i = s.indexOf('// ============ PATCH 12');
if (i >= 0) s = s.slice(0, i);
else { const w = s.indexOf('// ---- write ----'); if (w >= 0) s = s.slice(0, w); }
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
fs.writeFileSync(bp, s + fs.readFileSync(dir + 'p12.txt', 'utf8') + '\n' + tail);
console.log('build.js rebuilt with a single write tail, length', (s + tail).length);
