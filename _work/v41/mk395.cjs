// p395 = v4.185 + 探针：在 eval 的 "narg==0" 与 "narg==1" 两条内建分支之前打印 Tok[lo]/narg/pwk
const fs = require('fs');
const src = `patch('P395 probe narg branches', () => {
  const BB = T(IT).blocks;
  const LOGX = (expr) => callProc('log %s', [expr]);
  const JX = (...parts) => parts.reduce((a, b) => (a ? JOIN(a, b) : b), null);
  const taken = new Set(Object.values(T(IT).variables).map((x) => x[0]));
  if (taken.has('p395n')) throw new Error('[P395] var taken');
  newVar('p395n', 0);
  const collect = (v, out) => {
    if (!Array.isArray(v)) return;
    if (v[0] === 12 && typeof v[1] === 'string') { out.vars.push(v[1]); return; }
    if (typeof v[1] === 'string' && BB[v[1]]) {
      const q = BB[v[1]];
      if (q.fields && q.fields.VARIABLE) out.vars.push(q.fields.VARIABLE[0]);
      for (const k of Object.keys(q.fields || {})) { const f = q.fields[k]; if (Array.isArray(f) && typeof f[0] === 'string' && f[0] !== '') out.lits.push(f[0]); }
      for (const x of Object.values(q.inputs || {})) collect(x, out);
      return;
    }
    if ((v[0] === 10 || v[0] === 4) && typeof v[1] !== 'object') { out.lits.push(String(v[1])); return; }
    if (Array.isArray(v[1])) collect(v[1], out);
  };
  // 只在 eval 内找
  let evalDef = null;
  for (const id of Object.keys(BB)) {
    const b = BB[id];
    if (b.opcode !== 'procedures_definition' || !b.inputs) continue;
    const pr = BB[b.inputs.custom_block[1]];
    if (pr && String(pr.mutation.proccode) === 'eval %s %s') { evalDef = id; break; }
  }
  if (!evalDef) throw new Error('[P395] eval not found');
  const inEval = {};
  const walk = (id) => { let c = id; while (c) { const q = BB[c]; inEval[c] = 1; for (const [k, v] of Object.entries(q.inputs || {})) if ((k === 'SUBSTACK' || k === 'SUBSTACK2') && typeof v[1] === 'string') walk(v[1]); c = q.next; } };
  walk(BB[evalDef].next);
  const found = [];
  for (const id of Object.keys(inEval)) {
    const q = BB[id];
    if (q.opcode !== 'control_if_else' || !q.inputs || !q.inputs.CONDITION) continue;
    const o = { vars: [], lits: [] };
    collect(q.inputs.CONDITION, o);
    const isNarg0 = o.vars.indexOf('narg') >= 0 && o.lits.indexOf('0') >= 0 && o.lits.length <= 2;
    const isNarg1 = o.vars.indexOf('narg') >= 0 && o.lits.indexOf('pow') >= 0;
    if (isNarg0) found.push([id, 'N0']);
    if (isNarg1) found.push([id, 'N1']);
  }
  console.log('[P395] candidates=' + JSON.stringify(found));
  for (const [id, tag] of found) {
    insertBeforeStmt(id, [
      chgV('p395n', num(1)),
      IF(LT(VAR('p395n'), num(31)), [
        LOGX(JX(txt('B['), txt(tag), txt('] lo='), argOf('lo'), txt(' hi='), argOf('hi'),
          txt(' tok='), item('Tok', argOf('lo')), txt(' narg='), VAR('narg'), txt(' pwk='), VAR('pwk')))
      ])
    ]);
  }
  console.log('[P395] probes installed on ' + found.length + ' branches');
});
`;
fs.writeFileSync('_work/v41/p395.txt', src);
console.log('wrote p395.txt');
