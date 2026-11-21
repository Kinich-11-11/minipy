// Render the code editor's row geometry as an ASCII cross-section, read straight
// from a built project.json (so it checks the artifact, not the intent).
//   node _work/v41/uigeom.cjs <project.json> [firstRow] [nRows]
//
// Glyph metrics come from the costume SVG: the path transform is
//   translate(0, 8.3) scale(0.0041504, -0.0041504)
// so in the 6x11 costume box   cap top = 8.3 - 1493*s  ,  baseline = 8.3 ,  descender = 8.3 + 440*s
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const first = Number(process.argv[3] || 0);
const n = Number(process.argv[4] || 2);
const T = p.targets.find((t) => t.name === 'TextRenderer');
const B = T.blocks;
const S = T.size / 100;
const UNIT = 0.0041504, BASE = 8.3;
const CAP = BASE - 1493 * UNIT, DESC = BASE + 440 * UNIT;   // in costume px

const defId = (pc) => {
  for (const id of Object.keys(B)) {
    const b = B[id];
    if (b.opcode !== 'procedures_definition' || !b.inputs || !b.inputs.custom_block) continue;
    const q = B[b.inputs.custom_block[1]];
    if (q && q.mutation && q.mutation.proccode === pc) return id;
  }
  throw new Error('no def ' + pc);
};
const reach = (root) => {
  const seen = new Set(); const st = [root];
  while (st.length) {
    const id = st.pop(); if (!id || seen.has(id)) continue;
    const b = B[id]; if (!b) continue; seen.add(id);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
  return seen;
};
const draw = reach(defId('draw'));
// evaluate `(A +/- (ri * B))` style y expressions used by the row geometry
const evalY = (id, ri, v) => {
  const b = B[id];
  if (!b) return null;
  const num = (slot) => {
    const x = b.inputs[slot];
    if (Array.isArray(x) && Array.isArray(x[1]) && x[1][0] === 4) return Number(x[1][1]);
    const cid = Array.isArray(x) ? x[1] : null;
    if (typeof cid === 'string' && B[cid] && B[cid].opcode === 'data_variable') {
      const nm = B[cid].fields.VARIABLE[0];
      if (nm === 'ri') return ri;
      return v[nm] === undefined ? 0 : v[nm];
    }
    if (typeof cid === 'string') return evalY(cid, ri, v);
    return null;
  };
  if (b.opcode === 'operator_add') return num('NUM1') + num('NUM2');
  if (b.opcode === 'operator_subtract') return num('NUM1') - num('NUM2');
  if (b.opcode === 'operator_multiply') return num('NUM1') * num('NUM2');
  if (b.opcode === 'operator_divide') return num('NUM1') / num('NUM2');
  if (b.opcode === 'data_variable') {
    const nm = b.fields.VARIABLE[0];
    return nm === 'ri' ? ri : (v[nm] === undefined ? 0 : v[nm]);
  }
  return null;
};
const numLit = (id, slot) => {
  const x = B[id].inputs[slot];
  return Array.isArray(x) && Array.isArray(x[1]) && x[1][0] === 4 ? Number(x[1][1]) : null;
};
// find the row geometry blocks
const gotos = Object.keys(B).filter((id) => draw.has(id) && B[id].opcode === 'motion_gotoxy');
const litX = gotos.filter((id) => { const x = B[id].inputs.X; return Array.isArray(x) && Array.isArray(x[1]) && x[1][0] === 4; });
const barXs = litX.map((id) => numLit(id, 'X')).sort((a, b) => a - b);
const barX0 = barXs[0], barX1 = barXs[barXs.length - 1];
const bar = litX.filter((id) => numLit(id, 'X') === barX0);
const sizes = Object.keys(B).filter((id) => draw.has(id) && B[id].opcode === 'pen_setPenSizeTo').map((id) => ({ id, v: numLit(id, 'SIZE') }));
const barPen = sizes.find((s) => s.v > 5);
const caretPen = sizes.find((s) => s.v <= 5);
// the caret's two gotoxy blocks: x is `-201 + (cursor-hscroll)*pitch`
const caretGotos = gotos.filter((id) => { const x = B[id].inputs.X; return typeof x[1] === 'string' && JSON.stringify(B[x[1]]).includes('-201'); });
const caretYs = caretGotos.map((id) => evalY(B[id].inputs.Y[1], first, {})).sort((a, b) => a - b);
// text anchor: the code-text call uses x = -201
let codeCall = null;
for (const id of draw) {
  const b = B[id];
  if (b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode.startsWith('text') && b.inputs) {
    const vals = Object.values(b.inputs);
    if (vals.some((v) => Array.isArray(v[1]) && v[1][0] === 4 && String(v[1][1]) === '-201')) codeCall = id;
  }
}
const codeVals = Object.values(B[codeCall].inputs);
const xIdx = codeVals.findIndex((v) => Array.isArray(v[1]) && v[1][0] === 4 && String(v[1][1]) === '-201');
const yIdx = codeVals.findIndex((v) => typeof v[1] === 'string' && B[v[1]] && B[v[1]].opcode === 'operator_subtract' && numLit(v[1], 'NUM1') !== null);
const ty0 = evalY(codeVals[yIdx][1], 0, {});
const barY0 = evalY(B[bar[0]].inputs.Y[1], 0, {});

console.log('TextRenderer size=' + T.size + ' (scale ' + S + ')');
console.log('bar  x ' + barX0 + '..' + barX1 + '  centre y ' + barY0 + '  thickness ' + barPen.v);
console.log('text anchor ty ' + ty0 + '   caret pen ' + caretPen.v + '  caret y span ' + JSON.stringify(caretYs));
const inkTop = ty0 - CAP * S ? 0 : 0;
const capTop = ty0 - CAP * S, baseline = ty0 - BASE * S, desc = ty0 - DESC * S;
console.log('row cell (click) = (' + (barY0 - 7) + ', ' + (barY0 + 7) + ']');
console.log('');
console.log('        y   bar ink caret   (ink = cap top ' + capTop.toFixed(2) + ' .. baseline ' + baseline.toFixed(2) + ', descender ' + desc.toFixed(2) + ')');
for (let y = Math.ceil(barY0 + 7) + 1; y >= Math.floor(barY0 - 7 - 14) - 1; y--) {
  const inBar = y >= barY0 - barPen.v / 2 && y <= barY0 + barPen.v / 2;
  const inInk = y >= desc && y <= capTop;
  const inCap = y <= capTop && y >= baseline;
  const inCare = y >= caretYs[0] && y <= caretYs[1];
  const cellTop = y === Math.ceil(barY0 + 7), cellBot = y === Math.floor(barY0 - 7);
  console.log('  ' + String(y).padStart(5) + '   ' + (inBar ? ' # ' : ' . ') + (inInk ? (inCap ? '##' : '--') : ' .') + (inCare ? '  |' : '  .') + (cellTop ? '   <- cell top' : cellBot ? '   <- cell bottom' : ''));
}
