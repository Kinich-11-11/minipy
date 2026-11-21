// ---- DBG553c: emit 探针 ----
patch('DBG553c', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const pa = inDef('printargs');
  // emit: log(JOIN(JOIN(pmbuf, printbuf), pendtxt))
  const emits = find(pa, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'log %s'
    && (() => {
      const ids = JSON.parse(b.mutation.argumentids);
      const j = b.inputs[ids[0]] && typeof b.inputs[ids[0]][1] === 'string' ? BL()[b.inputs[ids[0]][1]] : null;
      return j && JSON.stringify(j.inputs).includes('pmbuf');
    })());
  for (const e of emits) {
    insertBeforeStmt(e, [dlog([t('EMIT pass='), F('prpass'), t(' pi='), F('pi'), t(' pmbuf=['), F('pmbuf'), t('] printbuf=['), F('printbuf'), t('] pendtxt=['), F('pendtxt'), t('] nl='), F('pendnl')])]);
  }
  console.log('[DBG553c] emit probes: ' + emits.length);
});
