const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
const reach = (roots) => { const seen = new Set(); const st = [roots]; while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; const b = BL[id]; if (!b) continue; seen.add(id); for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') st.push(v[1]); } if (b.next) st.push(b.next); } return seen; };
let defId = null;
for (const [id, b] of Object.entries(BL)) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL[b.inputs.custom_block[1]]; if (pr && pr.mutation && pr.mutation.proccode === 'eval %s %s') defId = id; }
const evd = reach(defId);
// 所有 set narg（值 0）块
const nargSets = [...evd].filter((id) => BL[id].opcode === 'data_setvariableto' && BL[id].fields.VARIABLE[0] === 'narg' && JSON.stringify(BL[id].inputs.VALUE) === '[1,[4,\"0\"]]');
console.log('narg=0 sets: ' + nargSets.join(','));
// 对每个，找含它的 if（SUBSTACK reach），列出条件与前 4 个 body 块
for (const ns of nargSets) {
  for (const id of evd) {
    const b = BL[id];
    if (!(b.opcode === 'control_if' || b.opcode === 'control_if_else')) continue;
    for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
      const s0 = b.inputs[slot] && b.inputs[slot][1];
      if (!s0 || !BL[s0]) continue;
      const r = reach(s0);
      if (r.has(ns)) {
        const cond = BL[b.inputs.CONDITION[1]];
        console.log('HOST ' + id + ' ' + b.opcode + ' slot=' + slot);
        console.log('  cond: ' + JSON.stringify(cond).slice(0, 150));
        let c = s0, i = 0, names = [];
        while (c && BL[c] && i++ < 5) { names.push(BL[c].opcode + (BL[c].fields && BL[c].fields.VARIABLE ? ':' + BL[c].fields.VARIABLE[0] : '')); c = BL[c].next; }
        console.log('  body0: ' + names.join(' | '));
      }
    }
  }
}
