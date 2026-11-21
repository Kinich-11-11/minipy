const p = JSON.parse(require('fs').readFileSync('D:/编程/scratch/ai/minipython/_work/v41/project.json','utf8'));
const it = p.targets.find(t=>t.name==='Interpreter');
const BL = it.blocks;
const reach = (roots) => { const seen = new Set(); const st = [roots]; while (st.length) { const id = st.pop(); if (!id || seen.has(id)) continue; const b = BL[id]; if (!b) continue; seen.add(id); for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') st.push(v[1]); } if (b.next) st.push(b.next); } return seen; };
let defOf = {};
for (const [id, b] of Object.entries(BL)) if (b.opcode === 'procedures_definition' && b.inputs.custom_block) { const pr = BL[b.inputs.custom_block[1]]; if (pr && pr.mutation) defOf[id] = pr.mutation.proccode; }
const owner = (start) => { let cur = start, g = 0; while (cur && g++ < 4000) { const w = BL[cur]; if (!w) return 'DEAD'; if (w.topLevel) return defOf[cur] || 'TOP'; cur = w.parent; } return '?'; };
for (const [id, b] of Object.entries(BL)) {
  if (b.opcode !== 'control_if') continue;
  const cid = b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string' ? b.inputs.CONDITION[1] : null;
  if (!cid) continue;
  const s = [...reach(cid)].map((x) => JSON.stringify(BL[x].inputs || {}) + JSON.stringify(BL[x].fields || {})).join(' ');
  if (s.includes('"ClsName"') && s.includes('"Tok"')) {
    const o = owner(id);
    if (o === 'execute') console.log(id + ' :: ' + s.slice(0, 240));
  }
}
