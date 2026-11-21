const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(p, 'utf8');
const ins = '    if (node === undefined) { console.log("UNDEF node; parent opcode = " + ((t.blocks[parentId] || {}).opcode) + " parentId=" + parentId + " kind=" + kind); }';
const a = '  input(t, node, parentId, kind) {';
if (s.indexOf(a) < 0) { console.log('MISS input'); process.exit(1); }
s = s.replace(a, a + String.fromCharCode(10) + ins);
fs.writeFileSync(p, s);
console.log('instrumented input');