const fs = require('fs');
let s = fs.readFileSync('_work/v41/p401.txt', 'utf8');
// 在 (A) 之前插入"先定位区域根 root，再只在 root 子树里找"的逻辑
const from = "  // (A) 扫描处：cond 含 mkdep 且含 '='";
const to = `  // 先定位 max/min 关键字区根：cond 含 narg 且字面量含 min/max
  let root = null;
  for (const id of Object.keys(inEval)) {
    const q = BB[id];
    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;
    const o = { vars: [], lits: [] };
    info(q.inputs.CONDITION, o);
    if (o.vars.indexOf('narg') >= 0 && o.lits.indexOf('min') >= 0 && o.lits.indexOf('max') >= 0) { root = id; break; }
  }
  if (!root) throw new Error('[P401] max/min keyword root not found');
  const inRoot = {};
  const walkRoot = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; inRoot[c] = 1; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walkRoot(v[1]); c = q.next; } };
  walkRoot(root);
  console.log('[P401] root=' + root + ' nodes=' + Object.keys(inRoot).length);
  // (A) 扫描处：cond 含 mkdep 且含 '='`;
if (!s.includes(from)) { console.log('MISS A'); process.exit(1); }
s = s.replace(from, to);
// 把 (A)(B) 的遍历对象从 inEval 换成 inRoot
s = s.replace("  for (const id of Object.keys(inEval)) {\n    const q = BB[id];\n    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;\n    const o = { vars: [], lits: [] };\n    info(q.inputs.CONDITION, o);\n    if (o.vars.indexOf('mkdep') >= 0 && o.lits.indexOf('=') >= 0) { scanIf = id; break; }",
              "  for (const id of Object.keys(inRoot)) {\n    const q = BB[id];\n    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;\n    const o = { vars: [], lits: [] };\n    info(q.inputs.CONDITION, o);\n    if (o.vars.indexOf('mkdep') >= 0 && o.lits.indexOf('=') >= 0) { scanIf = id; break; }");
s = s.replace("  for (const id of Object.keys(inEval)) {\n    const q = BB[id];\n    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;\n    const o = { vars: [], lits: [] };\n    info(q.inputs.CONDITION, o);\n    if (o.vars.indexOf('mkend') >= 0 && o.lits.indexOf('0') >= 0) { keIf = id; break; }",
              "  for (const id of Object.keys(inRoot)) {\n    const q = BB[id];\n    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;\n    const o = { vars: [], lits: [] };\n    info(q.inputs.CONDITION, o);\n    if (o.vars.indexOf('mkend') >= 0 && o.lits.indexOf('0') >= 0) { keIf = id; break; }");
s = s.split('P401').join('P402');
fs.writeFileSync('_work/v41/p402.txt', s);
console.log('wrote p402.txt');