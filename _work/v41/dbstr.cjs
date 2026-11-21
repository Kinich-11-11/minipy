// 在整份 project.json 里找包含某子串的**积木块**（含 procedures_call 的内联字面量），并打印其所属过程
// 用法: node _work/v41/dbstr.cjs "parentheses"
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('_work/v41/project.json', 'utf8'));
const want = process.argv[2] || '';
const ownerOf = (B, id) => {
  let c = id;
  for (let i = 0; i < 400 && c; i++) {
    const q = B[c];
    if (!q) return '?';
    if (q.opcode === 'procedures_definition') {
      const pr = B[q.inputs.custom_block[1]];
      return pr && pr.mutation ? String(pr.mutation.proccode) : '?';
    }
    c = q.parent;
  }
  return '(toplevel)';
};
let total = 0;
for (const t of p.targets) {
  const B = t.blocks || {};
  for (const id of Object.keys(B)) {
    const j = JSON.stringify(B[id]);
    if (j.indexOf(want) < 0) continue;
    if (B[id].opcode === 'text' || (B[id].fields && B[id].fields.TEXT)) continue; // 纯文本块跳过
    total++;
    console.log('[' + t.name + '] @' + id + ' ' + B[id].opcode + '  in [' + ownerOf(B, id) + ']');
    const k = j.indexOf(want);
    console.log('    ...' + j.slice(Math.max(0, k - 120), k + 80).replace(/\s+/g, ' ') + '...');
  }
}
console.log('total blocks containing ' + JSON.stringify(want) + ' = ' + total);
