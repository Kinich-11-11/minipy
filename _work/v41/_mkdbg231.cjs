// mkdbg231.cjs -- build a debug variant of v4.230: instrument zddot + the eval guard's
// dispatch decision points, writing T: lines to Output.
const fs = require('fs');
const dir = 'C:/Personal/个人/编程/scratch/ai/minipython/_work/v41/';
const asmSrc = fs.readFileSync(dir + 'assemble230.cjs', 'utf8');
const m = asmSrc.match(/const parts=\[([^\]]+)\]/);
if (!m) throw new Error('parts not found');
const parts = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
const part = (p) => {
  let t = fs.readFileSync(dir + p, 'utf8').replace(/\r/g, '').trimEnd();
  if (p === 'tail.txt') { const i = t.indexOf('// ---- DEBUG'); if (i >= 0) t = t.slice(i); }
  return t;
};

const dbg = `
// ---- DBG231: trace zddot + guard decisions ----
patch('DBG231 trace', () => {
  const zd = defIdOf('zddot %s %s');
  const oldIds = [];
  let c = BL()[zd].next;
  while (c) { oldIds.push(c); c = BL()[c].next; }
  const pre = addTo('Output', JOIN(txt('T:zddot lo='), JOIN(VAR('zddlo'), JOIN(txt(' hi='), JOIN(VAR('zddhi'), JOIN(txt(' t1='), item('Tok', argOf('zddlo'))))))));
  const post = addTo('Output', JOIN(txt('T:zddot->'), VAR('zdFound')));
  attachBody(zd, [pre, ...oldIds, post]);
  console.log('[DBG231] zddot instrumented, body blocks:', oldIds.length);
});
`;

const out = parts.map(part).join('\n\n') + '\n\n' + dbg;
fs.writeFileSync(dir + '_build231dbg.js', out);
console.log('wrote _build231dbg.js, lines:', out.split('\n').length);
