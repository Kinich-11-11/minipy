// ---- DBG506z: join check values ----
patch('DBG506z', () => {
  const J = (a, b) => JOIN(a, b);
  const log = (parts) => callProc('log %s', [parts.reduce((a, b) => J(a, b))]);
  const t = (s) => txt(s);
  const mcSet = reach(defIdOf('methodcall %s %s'));
  const joinFail = find(mcSet, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && Object.values(b.inputs).some((v) => Array.isArray(v[1]) && v[1][1] === 'TypeError: join needs a list'));
  insertBeforeStmt(joinFail[0], [log([t('DBG join smt1='), VAR('smt1'), t(' sma1=['), VAR('sma1'), t('] evtype='), VAR('evtype')])]);
  console.log('[DBG506z] ok');
});
