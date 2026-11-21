patch('DBGP520', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  const evd = inDef('eval %s %s');
  function hasVar(id, name, seen) {
    if (!id || !BL()[id] || seen.has(id)) return false;
    seen.add(id);
    const b = BL()[id];
    for (const v of Object.values(b.inputs || {})) {
      if (!Array.isArray(v)) continue;
      if (Array.isArray(v[1]) && v[1][0] === 12 && v[1][1] === name) return true;
      if (typeof v[1] === 'string' && hasVar(v[1], name, seen)) return true;
    }
    return false;
  }
  for (const id of evd) {
    const b = BL()[id];
    if (b.opcode !== 'control_if_else' || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') continue;
    if (!hasVar(b.inputs.CONDITION[1], 'x8nc', new Set())) continue;
    const e = b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1];
    if (e && BL()[e].opcode === 'procedures_call' && BL()[e].mutation.proccode === 'fail %s') {
      insertBeforeStmt(e, [log([t('LASTFAIL cq2='), VAR('cq2'), t(' ev=['), VAR('ev'), t('] t='), VAR('evtype'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi')])]);
      console.log('[DBGP520] instrumented');
      break;
    }
  }
  console.log('[DBGP520] ok');
});
function insertBeforeStmt2() {}
