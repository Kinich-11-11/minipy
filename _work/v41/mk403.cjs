// p403 = v4.186 + 探针：在 max/min 关键字路径的 ELSE 分支里打印若干状态量
const fs = require('fs');
const src = `patch('P403 probe keyword path state', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('p403n')) throw new Error('[P403] var taken');
  newVar('p403n', 0);
  const info = (v, o) => {
    if (!Array.isArray(v)) return;
    if (v[0] === 12 && typeof v[1] === 'string') { o.vars.push(v[1]); return; }
    if (typeof v[1] === 'string' && BB[v[1]]) {
      const q = BB[v[1]];
      if (q.fields && q.fields.VARIABLE) o.vars.push(q.fields.VARIABLE[0]);
      for (const k of Object.keys(q.fields || {})) { const f = q.fields[k]; if (Array.isArray(f) && typeof f[0] === 'string' && f[0] !== '') o.lits.push(f[0]); }
      for (const x of Object.values(q.inputs || {})) info(x, o);
      return;
    }
    if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { o.lits.push(String(v[1])); return; }
    if (Array.isArray(v[1])) info(v[1], o);
  };
  let evalDef = null;
  for (const id of Object.keys(BB)) {
    const b = BB[id];
    if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
    const pr = BB[b.inputs.custom_block[1]];
    if (pr && String(pr.mutation.proccode) === 'eval %s %s') { evalDef = id; break; }
  }
  const inEval = {};
  const walk = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; inEval[c] = 1; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]); c = q.next; } };
  walk(BB[evalDef].next);
  let root = null;
  for (const id of Object.keys(inEval)) {
    const q = BB[id];
    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;
    const o = { vars: [], lits: [] };
    info(q.inputs.CONDITION, o);
    if (o.vars.indexOf('narg') >= 0 && o.lits.indexOf('min') >= 0 && o.lits.indexOf('max') >= 0) { root = id; break; }
  }
  if (!root) throw new Error('[P403] root not found');
  const inRoot = {};
  const walkRoot = (id) => { let c = id; while (c) { const q = BB[c]; if (!q) break; inRoot[c] = 1; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walkRoot(v[1]); c = q.next; } };
  walkRoot(root);
  let keIf = null;
  for (const id of Object.keys(inRoot)) {
    const q = BB[id];
    if (q.opcode !== 'control_if' || !q.inputs || !q.inputs.CONDITION) continue;
    const o = { vars: [], lits: [] };
    info(q.inputs.CONDITION, o);
    if (o.vars.indexOf('mkend') >= 0 && o.lits.indexOf('0') >= 0) { keIf = id; break; }
  }
  if (!keIf) throw new Error('[P403] mkend if not found');
  const badIf = BB[keIf].inputs.SUBSTACK[1];
  const elseFirst = BB[badIf].inputs.SUBSTACK2[1];
  console.log('[P403] root=' + root + ' keIf=' + keIf + ' elseFirst=' + elseFirst);
  const log = (tag) => [
    chgV('p403n', num(1)),
    IF(LT(VAR('p403n'), num(41)), [
      LOGX(JX(txt('K['), txt(tag), txt('] mkn='), VAR('mkn'), txt(' mkpos='), VAR('mkpos'),
        txt(' mkhi='), VAR('mkhi'), txt(' ev=['), VAR('ev'), txt('] et='), VAR('evtype'),
        txt(' err=['), VAR('error'), txt(']')))
    ])
  ];
  insertBeforeStmt(elseFirst, log('S'));
  // 找 collection loop（ELSE 分支里的第一条 repeat_until），在其后打印
  let collLoop = null, last = null;
  let c = elseFirst;
  while (c) {
    const q = BB[c];
    if (!q) break;
    if (!collLoop && q.opcode === 'control_repeat_until') collLoop = c;
    last = c;
    c = q.next;
  }
  if (collLoop) spliceAfter(collLoop, chain(log('A')));
  spliceAfter(last, chain(log('Z')));
  console.log('[P403] collLoop=' + collLoop + ' last=' + last);
  console.log('[P403] probes installed');
});
`;
fs.writeFileSync('_work/v41/p403.txt', src);
console.log('wrote p403.txt');
