// count selected numeric literals per target (audit of a build)
// node _work/v41/auditlits.cjs <project.json> [v1,v2,...]
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = (process.argv[3] || '5.1,5.87,49,44,30,26,27,23,48,57,58,13,14,99,102,105,-224,-228,-201,201').split(',');
const rows = [];
for (const t of p.targets) {
  const c = {};
  for (const b of Object.values(t.blocks || {})) {
    for (const [k, v] of Object.entries(b.inputs || {})) {
      if (Array.isArray(v) && v.length === 2 && Array.isArray(v[1]) && v[1][0] === 4) {
        const s = String(v[1][1]);
        if (want.includes(s)) {
          const key = s;
          (c[key] = c[key] || []).push(b.opcode + '.' + k);
        }
      }
    }
  }
  for (const [k, v] of Object.entries(c)) rows.push(t.name.padEnd(14) + k.padEnd(8) + String(v.length).padEnd(4) + v.join(' '));
}
rows.sort();
console.log(rows.join('\n'));
