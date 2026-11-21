const fs = require('fs');
let s = fs.readFileSync('_work/v41/p453.txt', 'utf8');
const from = `  // 找 fn == "list" 的 IF
  let listIf = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION || !q.inputs.SUBSTACK) continue;
    const o = [];
    items(q.inputs.CONDITION, o);
    if (o.indexOf('list') >= 0 && o.indexOf('fn') >= 0) { listIf = id; break; }
  }
  if (!listIf) throw new Error('[P453] list if not found');
  // 其体内第一个 evtype == "Y" 的 IF
  let yIf = null;
  let c = BB[listIf].inputs.SUBSTACK[1];
  while (c) {
    const q = BB[c];
    if (!q) break;
    if (q.opcode === 'control_if' && q.inputs && q.inputs.CONDITION) {
      const o = [];
      items(q.inputs.CONDITION, o);
      if (o.indexOf('Y') >= 0 && o.indexOf('evtype') >= 0) { yIf = c; break; }
    }
    c = q.next;
  }
  if (!yIf) throw new Error('[P453] the evtype=="Y" IF in list handler not found');
  console.log('[P453] list if=' + listIf + ' Y-if=' + yIf);`;
const to = `  // 直接找 evtype == "Y" 的 IF，再用祖先链确认它属于 list 的处理体
  let yIf = null, listIf = null;
  for (const id of Object.keys(BB)) {
    const q = BB[id];
    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION || !q.inputs.SUBSTACK) continue;
    const o = [];
    items(q.inputs.CONDITION, o);
    if (o.indexOf('Y') < 0 || o.indexOf('evtype') < 0) continue;
    // 祖先里找含字面量 list 的 IF
    let cur = q.parent, d = 0, ok = false;
    const seen = new Set();
    while (cur && !seen.has(cur) && d < 12) {
      seen.add(cur);
      const w = BB[cur];
      if (w && w.inputs && w.inputs.CONDITION) {
        const oo = [];
        items(w.inputs.CONDITION, oo);
        if (oo.indexOf('list') >= 0) { ok = true; listIf = cur; break; }
      }
      cur = w ? w.parent : null; d++;
    }
    if (ok) { yIf = id; break; }
  }
  if (!yIf) throw new Error('[P453] the evtype=="Y" IF inside the list handler not found');
  console.log('[P453] list ancestor=' + listIf + ' Y-if=' + yIf);`;
if (!s.includes(from)) { console.log('MISS'); process.exit(1); }
fs.writeFileSync('_work/v41/p453.txt', s.replace(from, to));
console.log('finder rewritten');