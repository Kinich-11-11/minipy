function insertAfterStmt(targetId, ids) {
  const first = chain(ids.slice());
  const nx = BL()[targetId].next;
  BL()[targetId].next = first; BL()[first].parent = targetId;
  let tail = first; while (BL()[tail].next) tail = BL()[tail].next;
  BL()[tail].next = nx; if (nx) BL()[nx].parent = tail;
}

// ---- DBG-M14: trace filter loop values ----
patch('DBGM14', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  const evd = inDef('eval %s %s');
  const callvals = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'callval');
  console.log('[DBGM14] callval sites: ' + callvals.length);
  for (const id of callvals) {
    insertAfterStmt(id, [log([t('AFTER-CV mpel=['), VAR('mpel'), t('] ev=['), VAR('ev'), t('] t='), VAR('evtype')])]);
  }
  const truths = find(evd, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'truth %s %s');
  for (const id of truths) {
    const mut = BL()[id].mutation;
    const ids = JSON.parse(mut.argumentids);
    const vv = BL()[id].inputs[ids[0]];
    const vn = Array.isArray(vv[1]) && vv[1][0] === 12 ? vv[1][1] : (typeof vv[1] === 'string' && BL()[vv[1]] ? BL()[vv[1]].fields.VARIABLE[0] : '?');
    if (vn === 'mpel') {
      insertAfterStmt(id, [log([t('AFTER-TRUTH truthv='), VAR('truthv'), t(' mpel=['), VAR('mpel'), t('] ev=['), VAR('ev'), t(']')])]);
      console.log('[DBGM14] instrumented truth(mpel)');
    }
  }
  console.log('[DBGM14] ok');
});
