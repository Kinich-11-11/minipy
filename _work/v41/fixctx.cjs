const fs = require('fs');
let s = fs.readFileSync('_work/v41/dbctx.cjs', 'utf8');
s = s.replace("const id = process.argv[2];", [
  "let id = process.argv[2];",
  "if (!B[id]) {",
  "  const want = String(process.argv[2]);",
  "  for (const k of Object.keys(B)) { if (JSON.stringify(B[k]).indexOf(want) >= 0) { id = k; break; } }",
  "  console.log('resolved id = ' + id);",
  "}"
].join('\n'));
fs.writeFileSync('_work/v41/dbctx.cjs', s);
console.log('patched dbctx');