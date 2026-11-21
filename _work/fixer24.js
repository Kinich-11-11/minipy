
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
const bp = dir + 'build.js';
let s = fs.readFileSync(bp, 'utf8');
if (s.includes('// ---- write ----')) { console.log('write section already present'); process.exit(0); }
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
s = s + parts + '\n' + tail;
fs.writeFileSync(bp, s);
console.log('restored write section and appended patch10');
