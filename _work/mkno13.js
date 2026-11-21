
const fs = require('fs');
const dir = 'D:/编程/scratch/ai/minipython/_work/';
let s = fs.readFileSync(dir + 'build.js', 'utf8');
const i = s.indexOf('// ============ PATCH 13a');
if (i < 0) throw new Error('patch13 not found');
s = s.slice(0, i);
s = s.replace("path.join(WORK, 'build', 'project.json')", "path.join(WORK, 'tmp', 'project_no13.json')");
s = s.replace("'D:/编程/scratch/ai/minipython/MiniPy_v4.sb3'", "'D:/编程/scratch/ai/minipython/_work/tmp/no13.sb3'");
fs.mkdirSync(dir + 'tmp', { recursive: true });
const tail = [
  '// ---- write ----',
  'fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });',
  'fs.writeFileSync(OUT_JSON, JSON.stringify(project));',
  "const outEntries = entries.map(e => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);",
  'zipWrite(outEntries, OUT_SB3);',
  "console.log('wrote', OUT_SB3, JSON.stringify(project).length, 'bytes json');",
  ''
].join('\n');
fs.writeFileSync(dir + 'build_no13.js', s + tail);
console.log('no13 build written');
