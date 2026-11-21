// mkdbg231b.cjs -- build dbg231: trace the P720 eval-guard root pre-check, dispatch,
// objattr, and the rightside H/W hook, into the DbgL list (survives replays).
const fs = require('fs');
const dir = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/';
const asmSrc = fs.readFileSync(dir + 'assemble230.cjs', 'utf8');
const m = asmSrc.match(/const parts=\[([^\]]+)\]/);
const parts = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
const part = (p) => {
  let t = fs.readFileSync(dir + p, 'utf8').replace(/\r/g, '').trimEnd();
  if (p === 'tail.txt') { const i = t.indexOf('// ---- DEBUG'); if (i >= 0) t = t.slice(i); }
  return t;
};

const dbg = `
// ---- DBG231b: guard decision trace ----
patch('DBG231b trace', () => {
  B.addList(IT, 'DbgL', []);
  const log = (tag, xs) => addTo('DbgL', [tag, ...xs].reduce((a, x) => JOIN(a, x), txt('')));
  const prepend = (defId, ids) => {
    const first = BL()[defId].next;
    const h = chain(ids);
    BL()[defId].next = h; BL()[h].parent = defId;
    if (first) { BL()[h].next = first; BL()[first].parent = h; }
  };

  // 1. objattr entry/exit
  {
    const oa = defIdOf('objattr %s %s %s');
    prepend(defIdOf('objattr %s %s %s'), [log('OA-in t=', [argOf('zoT'), txt(' n='), argOf('zoN')])]);
    const body = reach(oa);
    let tail = oa, n = 0;
    while (BL()[tail].next && n++ < 200) tail = BL()[tail].next;
    spliceAfter(tail, chain([log('OA-out et=', [VAR('evtype'), txt(' ev='), VAR('ev')])]));
  }

  // 2. the eval guard's root pre-check + dispatch: anchor at the zddot call sites is hard;
  // instead instrument the Types-row read by wrapping: find the lookup call inside the
  // eval def whose next chain sets 'zdT2' -- simpler: instrument lookup exit for the
  // names the guard looks up (all lookups, tagged).
  {
    const lk = defIdOf('lookup %s');
    const body = BL()[lk].next;
    let tail = body, n = 0;
    while (BL()[tail].next && n++ < 400) tail = BL()[tail].next;
    spliceAfter(tail, chain([log('LK name=', [argOf('name'), txt(' found='), VAR('found'),
      txt(' T='), item('Types', VAR('found'))])]));
  }

  // 3. rightside H/W hook entry
  {
    const rs = defIdOf('rightside %s %s %s %s %s');
    const evtsave = find(reach(rs), (b) => b.opcode === 'data_setvariableto'
      && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'evtsave');
    insertBeforeStmt(evtsave[0], [log('RS lt=', [argOf('lefttype'), txt(' rt='), VAR('evtype'), txt(' op='), argOf('op')])]);
  }
  console.log('[DBG231b] instrumented; DbgL blocks now:', Object.keys(T(IT).blocks).length, 'has list:', !!T(IT).lists['DbgL'] || Object.values(T(IT).lists||{}).some(x=>x[0]==='DbgL'));
});
`;

let body = parts.map(part).join('\n\n');
const cut = body.indexOf('relinkParents();');
if (cut < 0) throw new Error('main runner not found');
body = body.slice(0, cut) + dbg + '\n' + body.slice(cut);
fs.writeFileSync(dir + '_build231b.js', body);
console.log('wrote _build231b.js');
