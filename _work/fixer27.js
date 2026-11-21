
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
const i = s.indexOf('// ============ PATCH 11a');
if (i >= 0) s = s.slice(0, i);
const parts = ['p11a.txt', 'p11b.txt'].map(f => fs.readFileSync(dir + f, 'utf8')).join('\n');
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
console.log('patch11 + write tail restored, length', (s + parts + tail).length);
