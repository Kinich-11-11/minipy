patch('DBG559f', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const asg = inDef('assign %s %s %s');
  const prop = find(asg, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'assign %s %s %s'
    && (() => {
      const ids = JSON.parse(b.mutation.argumentids);
      const a0 = b.inputs[ids[0]];
      return a0 && Array.isArray(a0[1]) && a0[1][0] === 12 && a0[1][1] === 'alT';
    })());
  if (prop.length !== 1) throw new Error('[DBG559f] prop assign = ' + prop.length);
  // 钩子守卫（含 ald 的 control_if）
  const guardIfs = find(asg, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && (() => {
      const c = BL()[b.inputs.CONDITION[1]];
      if (c.opcode !== 'operator_and') return false;
      for (const k of ['OPERAND1', 'OPERAND2']) {
        const o = c.inputs[k];
        const blk = o && typeof o[1] === 'string' ? BL()[o[1]] : null;
        if (blk && blk.opcode === 'operator_lt' && JSON.stringify(blk.inputs).includes('ald')) return true;
      }
      return false;
    })());
  for (const g of guardIfs) {
    insertBeforeStmt(g, [dlog([t('HOOKGUARD vn=['), argOf('vn'), t('] vt=['), argOf('vt'), t('] ald='), F('ald')])]);
  }
  insertBeforeStmt(prop[0], [dlog([t('PROP partner=['), F('alT'), t('] alS=['), F('alS'), t('] vn=['), argOf('vn'), t('] ald='), F('ald')])]);
  console.log('[DBG559f] guard probes: ' + guardIfs.length);
});
