// instrT.cjs : instrument the `type()` float test in callfn and dump what `contains` sees
//   node _work/v41/instrT.cjs <src.sb3> <out.sb3>
const fs = require('fs');
const { zipRead, zipWrite, makeBuilder } = require('../sb3lib.js');
const SRC = process.argv[2] || 'D:/编程/scratch/ai/minipython/MiniPy_v4.132.sb3';
const OUT = process.argv[3] || 'D:/编程/scratch/ai/minipython/_work/v41/_instrT.sb3';
const entries = zipRead(SRC);
const project = JSON.parse(entries.find((e) => e.name === 'project.json').data.toString('utf8'));
const B = makeBuilder(project);
const IT = 'Interpreter';
B.setCtx(IT);
const T = (n) => project.targets.find((t) => t.name === n);
const BL = () => T(IT).blocks;
const I = (op, opts) => B.B(IT, op, opts);
const txt = (v) => B.txt(v);
const num = (v) => B.num(v);
const VAR = (n) => B.VAR(n);
const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
const lenOf = (x) => I('operator_length', { inputs: { STRING: B.REP(x, [10, '']) } });
const letterOf = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
const chain = (ids) => B.chain(IT, ids);
const allIds = () => Object.keys(BL());
function defIdOf(pc) {
  for (const id of allIds()) {
    const b = BL()[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const q = BL()[b.inputs.custom_block[1]];
      if (q && q.mutation && q.mutation.proccode === pc) return id;
    }
  }
  throw new Error('no def ' + pc);
}
function reach(roots) {
  const seen = new Set(); const st = (Array.isArray(roots) ? roots : [roots]).slice();
  while (st.length) {
    const id = st.pop(); if (!id || seen.has(id)) continue;
    const b = BL()[id]; if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string') st.push(v[1]);
    if (b.next) st.push(b.next);
  }
  return seen;
}
const find = (set, pred) => { const o = []; for (const id of set) if (pred(BL()[id], id)) o.push(id); return o; };
function refOf(id) {
  for (const pid of allIds()) {
    const p = BL()[pid];
    for (const [slot, v] of Object.entries(p.inputs || {})) if (v && v[1] === id) return { pid, slot, v };
  }
  return null;
}
function predecessorOf(id) { for (const pid of allIds()) if (BL()[pid].next === id) return pid; return null; }
function insertBeforeStmt(targetId, ids) {
  const first = chain(ids.slice());
  const pred = predecessorOf(targetId);
  if (pred) {
    const a = BL()[pred]; const nx = a.next;
    a.next = first; BL()[first].parent = pred;
    let t = first; while (BL()[t].next) t = BL()[t].next;
    BL()[t].next = nx; if (nx) BL()[nx].parent = t;
  } else {
    const ref = refOf(targetId);
    if (!ref) throw new Error('cannot insert before ' + targetId);
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], first, ref.v[2]] : [ref.v[0], first];
    BL()[first].parent = ref.pid;
    let t = first; while (BL()[t].next) t = BL()[t].next;
    BL()[t].next = targetId; BL()[targetId].parent = t;
  }
  return first;
}
const asRef = (d) => {
  if (!Array.isArray(d)) return null;
  if (d[0] === 12) return { kind: 'var', name: d[1] };
  if ((d[0] === 4 || d[0] === 10) && typeof d[1] !== 'object') return { kind: 'lit', val: String(d[1]) };
  if (d[0] === 1 || d[0] === 2 || d[0] === 3) return asRef(d[1]);
  return null;
};
B.addList(IT, 'Dbg2', []);
const nameOf = (d) => {
  const r = asRef(d);
  if (r && r.kind === 'var') return r.name;
  const id = typeof d === 'string' ? d : (Array.isArray(d) && typeof d[1] === 'string' ? d[1] : null);
  const b = id ? BL()[id] : null;
  if (b && b.opcode === 'argument_reporter_string_number') return b.fields.VALUE[0];
  return null;
};
const inside = reach(defIdOf('callfn %s %s %s'));
// locate the `fn == "type"` branch, then the contains(ev,".") test inside it
const typeIfs = find(inside, (b) => b.opcode === 'control_if' && b.inputs.CONDITION
  && BL()[b.inputs.CONDITION[1]] && BL()[b.inputs.CONDITION[1]].opcode === 'operator_equals'
  && nameOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1) === 'fn'
  && asRef(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2) && asRef(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2).val === 'type');
if (typeIfs.length !== 1) throw new Error('fn=="type" sites = ' + typeIfs.length);
const J = (a, b) => JOIN(a, b);
const letter3 = () => I('operator_equals', { inputs: { OPERAND1: B.REP(letterOf(num(3), VAR('ev')), [10, '']), OPERAND2: B.REP(txt('5'), [10, '']) } });
let injected = 0;
for (const proc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
  const inProc = reach(defIdOf(proc));
  const tifs = find(inProc, (b) => b.opcode === 'control_if' && b.inputs.CONDITION
    && BL()[b.inputs.CONDITION[1]] && BL()[b.inputs.CONDITION[1]].opcode === 'operator_equals'
    && nameOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1) === 'fn'
    && asRef(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2) && asRef(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2).val === 'type');
  if (tifs.length !== 1) { console.log('  ' + proc + ': type branch sites = ' + tifs.length); continue; }
  const dotAny = I('operator_contains', { inputs: { STRING1: B.REP(VAR('ev'), [10, '']), STRING2: B.REP(txt('.'), [10, '']) } });
  let expr = J(J(J(txt('evtype='), VAR('evtype')), J(txt(' ev='), VAR('ev'))), J(J(txt(' len='), lenOf(VAR('ev'))), J(txt(' hasdot='), dotAny)));
  expr = J(expr, J(txt(' ch3is5='), letter3()));
  insertBeforeStmt(BL()[tifs[0]].inputs.SUBSTACK[1], [
    I('data_addtolist', { fields: B.LISTF('Dbg2'), inputs: { ITEM: B.REP(expr, [10, '']) } })
  ]);
  injected++;
  console.log('  injected into ' + proc);
}
if (!injected) throw new Error('no type branch instrumented');
const branch = reach(BL()[typeIfs[0]].inputs.SUBSTACK[1]);
for (const id of Object.keys(BL())) BL()[id].parent = null;
for (const id of Object.keys(BL())) {
  const b = BL()[id];
  if (b.next && BL()[b.next]) BL()[b.next].parent = id;
  for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string' && BL()[v[1]]) BL()[v[1]].parent = id;
}
let orphans = 0;
for (const id of allIds()) { const b = BL()[id]; if (!b.topLevel && !b.parent) orphans++; }
const out = entries.map((e) => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);
zipWrite(out, OUT);
console.log('instrumented -> ' + OUT + '  orphans=' + orphans);
