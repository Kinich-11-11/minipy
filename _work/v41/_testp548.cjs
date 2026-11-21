const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = () => it.blocks;
const reach = (roots) => { const seen = new Set(); const st = [roots]; while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; const b = BL()[id]; if (!b) continue; seen.add(id); for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') st.push(v[1]); } if (b.next) st.push(b.next); } return seen; };
for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
  let defId = null;
  for (const [id, b] of Object.entries(BL())) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL()[b.inputs.custom_block[1]]; if (pr && pr.mutation && pr.mutation.proccode === pc) defId = id; }
  const cf = reach(defId);
  const listGate = [...cf].filter((id) => {
    const b = BL()[id];
    if (b.opcode !== 'control_if') return false;
    const c = BL()[b.inputs.CONDITION[1]];
    if (!c || c.opcode !== 'operator_equals') return false;
    const isFnArg = (d) => typeof d === 'string' && BL()[d] && BL()[d].opcode === 'argument_reporter_string_number' && BL()[d].fields.VALUE[0] === 'fn';
    const isLit = (d) => Array.isArray(d) && ((d[0] === 10 && String(d[1]) === 'list') || (Array.isArray(d[1]) && d[1][0] === 10 && String(d[1][1]) === 'list'));
    const o1 = c.inputs.OPERAND1, o2 = c.inputs.OPERAND2;
    return (isFnArg(o1 && o1[1]) && isLit(o2)) || (isFnArg(o2 && o2[1]) && isLit(o1));
  });
  const sub = reach(BL()[listGate[0]].inputs.SUBSTACK[1]);
  const fails = [...sub].filter((x) => {
    const w = BL()[x];
    if (!(w.opcode === 'procedures_call' && w.mutation && w.mutation.proccode === 'fail %s')) return false;
    const mid = Object.values(w.inputs)[0][1];
    return [...reach(mid)].some((y) => JSON.stringify(BL()[y].inputs || {}).includes('not iterable'));
  });
  let pv = null, g = 0, c2 = fails[0];
  while (c2 && g++ < 60) { c2 = BL()[c2].parent; if (c2 && BL()[c2].opcode === 'data_setvariableto' && BL()[c2].fields.VARIABLE[0] === 'p6v') { pv = c2; break; } }
  const errBody = [];
  let c = pv, g2 = 0;
  while (c && g2++ < 40) { errBody.push(c); if (c === fails[0]) break; c = BL()[c].next; }
  console.log(pc + ': gate=' + listGate.length + ' fails=' + fails.length + ' pv=' + pv + ' errBody=' + errBody.length + ' lastOK=' + (errBody[errBody.length-1] === fails[0]));
  // 检查 errBody 中每个块存在
  for (const id of errBody) if (!BL()[id]) console.log('  MISSING BLOCK: ' + id);
}
