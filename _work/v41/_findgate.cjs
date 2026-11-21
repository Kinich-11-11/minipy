const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
const reach = (roots) => { const seen = new Set(); const st = [roots]; while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; const b = BL[id]; if (!b) continue; seen.add(id); for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') st.push(v[1]); } if (b.next) st.push(b.next); } return seen; };
let defId = null;
for (const [id, b] of Object.entries(BL)) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL[b.inputs.custom_block[1]]; if (pr && pr.mutation && pr.mutation.proccode === 'eval %s %s') defId = id; }
const evd = reach(defId);
let n = 0;
for (const id of evd) {
  const b = BL[id];
  if (!(b.opcode === 'control_if' || b.opcode === 'control_if_else')) continue;
  const cid = b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string' ? b.inputs.CONDITION[1] : null;
  if (!cid || !BL[cid]) continue;
  const r = [...reach(cid)].map(x => JSON.stringify(BL[x].inputs || {})).join(' ');
  if (r.includes('paren')) continue;
  const hasOpen = r.includes('"("');
  const hasClose = r.includes('")"');
  const hasTok = r.includes('"Tok"');
  if (hasOpen && hasClose && hasTok) {
    console.log('CAND ' + id + ' ' + b.opcode);
    console.log('   ' + r.slice(0, 340));
    n++;
    if (n >= 6) break;
  }
}
console.log('n=' + n);
