// instrR.cjs : log rightside's entry state (op / lefttype / leftval / right evtype / ev)
const fs = require('fs');
const { zipRead, zipWrite, makeBuilder } = require('../sb3lib.js');
const SRC = process.argv[2] || 'D:/编程/scratch/ai/minipython/_work/v41/_p208.sb3';
const OUT = process.argv[3] || 'D:/编程/scratch/ai/minipython/_work/v41/_instrR.sb3';
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
B.addList(IT, 'Dbg3', []);
const J = (a, b) => JOIN(a, b);
// log every atom() call: index, token text, token kind, and the resulting type
const atomDef = defIdOf('eval %s %s');
const tokAt = (list) => I('data_itemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(B.argReporter(IT, 'lo'), [4, '0']) } });
let expr = J(J(txt('lo='), B.argReporter(IT, 'lo')), J(txt(' hi='), B.argReporter(IT, 'hi')));
expr = J(expr, J(txt(' tok='), tokAt('Tok')));
expr = J(expr, J(txt(' kind='), tokAt('Kind')));
expr = J(expr, J(txt(' => '), VAR('evtype')));
expr = J(expr, J(txt(' val='), VAR('ev')));
// append at the very end of atom's top-level chain so ev/evtype hold the result
let last = BL()[atomDef].next, guard = 0;
while (last && BL()[last].next && guard++ < 5000) last = BL()[last].next;
if (!last) throw new Error('atom has no body');
const nx0 = BL()[last].next;
const dbg = chain([
  I('data_addtolist', { fields: B.LISTF('Dbg3'), inputs: { ITEM: B.REP(expr, [10, '']) } })
]);
BL()[last].next = dbg; BL()[dbg].parent = last; BL()[dbg].next = nx0; if (nx0) BL()[nx0].parent = dbg;
console.log('appended a probe at the end of eval');
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
