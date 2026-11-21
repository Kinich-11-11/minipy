// mkcases.cjs <in.txt> <out.json> [tag]
// Input format: cases separated by lines starting with "### "
//   "### name"          -> normal case
//   "### !name"         -> expectError: true
//   "### ~name"         -> skip CPython oracle mismatch (same as normal, but tagged)
// Code is the literal lines that follow, joined with \n (no trailing newline).
const fs = require('fs');
const inp = process.argv[2];
const out = process.argv[3];
const tag = process.argv[4] || require('path').basename(inp).replace(/\.[^.]+$/, '');
const lines = fs.readFileSync(inp, 'utf8').replace(/\r/g, '').split('\n');
const cases = [];
let cur = null;
for (const ln of lines) {
  if (ln.startsWith('### ')) {
    if (cur) cases.push(cur);
    let name = ln.slice(4).trim();
    let expectError = false;
    if (name.startsWith('!')) { expectError = true; name = name.slice(1).trim(); }
    cur = { name, tag, code: [], expectError };
  } else if (cur) {
    cur.code.push(ln);
  }
}
if (cur) cases.push(cur);
// drop a single trailing blank line artifact
for (const c of cases) {
  while (c.code.length && c.code[c.code.length - 1] === '') c.code.pop();
  c.code = c.code.join('\n');
  if (!c.expectError) delete c.expectError;
}
fs.writeFileSync(out, JSON.stringify(cases, null, 1));
console.log('wrote ' + out + '  cases=' + cases.length);
