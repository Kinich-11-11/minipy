const fs = require('fs');
const p = 'D:/编程/scratch/ai/minipython/_work/v5/dsl.js';
let s = fs.readFileSync(p, 'utf8');
const a = '  block(t, node, parentId) {', NL = String.fromCharCode(10);
const ins = '    if (!node || node.op === undefined) { console.log("UNDEF NODE " + JSON.stringify(node) + " | parent=" + ((t.blocks[parentId] || {}).opcode) + " script=" + t.name + " top=" + ((t.blocks[parentId]||{}).topLevel)); }';
if (s.indexOf(a) < 0) { console.log('MISS block'); process.exit(1); }
s = s.replace(a, a + NL + ins);
fs.writeFileSync(p, s);
console.log('instrumented block');