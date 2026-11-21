const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = () => it.blocks;
const reach = (roots) => { const seen = new Set(); const st = [roots]; while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; const b = BL()[id]; if (!b) continue; seen.add(id); for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') st.push(v[1]); } if (b.next) st.push(b.next); } return seen; };
let defId = null;
for (const [id, b] of Object.entries(BL())) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL()[b.inputs.custom_block[1]]; if (pr && pr.mutation && pr.mutation.proccode === 'eval %s %s') defId = id; }
const evd = reach(defId);
const isItemTokCmp = (cond, lit) => {
  const isItem = (d) => typeof d === 'string' && BL()[d] && BL()[d].opcode === 'data_itemoflist' && BL()[d].fields.LIST && BL()[d].fields.LIST[0] === 'Tok';
  const isLit = (d) => Array.isArray(d) && ((d[0] === 10 && String(d[1]) === lit) || (Array.isArray(d[1]) && d[1][0] === 10 && String(d[1][1]) === lit));
  const o1 = cond.inputs.OPERAND1, o2 = cond.inputs.OPERAND2;
  return (isItem(o1 && o1[1]) && isLit(o2)) || (isItem(o2 && o2[1]) && isLit(o1));
};
const tokRefOf = (cond) => {
  const o1 = cond.inputs.OPERAND1, o2 = cond.inputs.OPERAND2;
  const pick = (d) => (typeof d === 'string' && BL()[d] && BL()[d].opcode === 'data_itemoflist') ? BL()[d].inputs.INDEX[1] : null;
  return pick(o1) || pick(o2);
};
const reachArg = (exprId, argName) => {
  if (typeof exprId !== 'string') return false;
  const seen = new Set();
  const st = [exprId];
  while (st.length) {
    const id = st.pop();
    if (!id || seen.has(id) || !BL()[id]) continue;
    seen.add(id);
    const w = BL()[id];
    if (w.opcode === 'argument_reporter_string_number' && w.fields.VALUE[0] === argName) return true;
    for (const v of Object.values(w.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
  }
  return false;
};
const found = [];
for (const id of evd) {
  const b = BL()[id];
  if (!(b.opcode === 'control_if' || b.opcode === 'control_if_else')) continue;
  const cid = b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string' ? b.inputs.CONDITION[1] : null;
  if (!cid) continue;
  const eqs = [...reach(cid)].map((x) => BL()[x]).filter((w) => w && w.opcode === 'operator_equals');
  const hasOpen = eqs.some((e) => isItemTokCmp(e, '(') && reachArg(tokRefOf(e), 'lo'));
  const hasClose = eqs.some((e) => isItemTokCmp(e, ')') && reachArg(tokRefOf(e), 'hi'));
  if (hasOpen && hasClose) found.push(id);
}
console.log('matched gates: ' + found.length + ' -> ' + found.join(','));
