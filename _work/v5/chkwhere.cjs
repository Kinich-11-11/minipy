const { zipRead } = require('D:/编程/scratch/ai/minipython/_work/sb3lib.js');
const proj = JSON.parse(zipRead(process.argv[2]).find(e=>e.name==='project.json').data.toString('utf8'));
const t = proj.targets.find(x=>x.name==='Interpreter');
const byId = t.blocks;
function litOf(v) { if (v && Array.isArray(v) && v.length === 2 && v[0] === 10) return v[1]; return null; }
function condLit(ifId) {
  const b = byId[ifId];
  const c = b.inputs.CONDITION; if (!c) return null;
  const cb = byId[c[1]]; if (!cb || cb.opcode !== 'operator_equals') return cb ? cb.opcode : null;
  const o2 = cb.inputs.OPERAND2; if (!o2) return null;
  return litOf(o2[1]);
}
for (const id in byId) {
  const b = byId[id];
  if (b.opcode !== 'data_replaceitemoflist' || !b.fields.LIST || b.fields.LIST[0] !== 'FnFlags') continue;
  const it = b.inputs.ITEM; const val = it ? (litOf(it[1]) !== null ? litOf(it[1]) : JSON.stringify(it[1])) : '?';
  const chain = [];
  let cur = b.parent; let guard = 0;
  while (cur && guard++ < 200) { const pb = byId[cur]; if (!pb) break; if (pb.opcode === 'control_if' || pb.opcode === 'control_if_else') { const cl = condLit(cur); if (cl) chain.push(cl); } cur = pb.parent; }
  console.log('FnFlags write value=' + JSON.stringify(val) + ' under: ' + chain.join(' > '));
}