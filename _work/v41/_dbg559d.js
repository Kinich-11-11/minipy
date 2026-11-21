patch('DBG559d', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const cu = inDef('calluser %s %s %s');
  // 出口落账 assign 前后
  const fpopCall = find(cu, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fpop');
  insertBeforeStmt(fpopCall[0], [IF(GT(llen('DfN'), num(0)), [
    dlog([t('DF-ASSIGN name=['), item('DfN', num(1)), t('] val=['), item('DfV', num(1)), t('] pairs='), llen('AliasN'), t(' an1=['), item('AliasN', num(1)), t('] at1=['), item('AliasT', num(1)), t(']')])
  ])]);
  // P557 录制处：rrK/rrN
  const ex = inDef('execute');
  const recIfs = find(ex, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && (() => { const c = BL()[b.inputs.CONDITION[1]];
      if (c.opcode !== 'operator_and') return false;
      for (const k of ['OPERAND1', 'OPERAND2']) {
        const o = c.inputs[k];
        const blk = o && typeof o[1] === 'string' ? BL()[o[1]] : null;
        if (blk && blk.opcode === 'operator_or' && JSON.stringify(blk.inputs).includes('rrK')) return true;
      }
      return false; })());
  for (const r of recIfs) {
    const inner = BL()[r].inputs.SUBSTACK[1];
    insertBeforeStmt(inner, [dlog([t('REC rrK='), F('rrK'), t(' rrN='), F('rrN'), t(' name='), F('name')])]);
  }
  console.log('[DBG559d] rec probes: ' + recIfs.length);
});
