patch('DBG559', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const cu = inDef('calluser %s %s %s');
  // 找 P559 的出口 IF（cond 为 GT(llen PairDep, -1)）
  const walkIf = find(cu, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && (() => { const c = BL()[b.inputs.CONDITION[1]];
      if (c.opcode !== 'operator_gt') return false;
      const o1 = c.inputs.OPERAND1 && typeof c.inputs.OPERAND1[1] === 'string' ? BL()[c.inputs.OPERAND1[1]] : null;
      const l2 = c.inputs.OPERAND2 && Array.isArray(c.inputs.OPERAND2[1]) ? String(c.inputs.OPERAND2[1][1]) : null;
      return o1 && o1.fields && o1.fields.LIST && o1.fields.LIST[0] === 'PairDep' && l2 === '-1'; })());
  if (walkIf.length !== 1) throw new Error('[DBG559] walk if = ' + walkIf.length);
  insertBeforeStmt(walkIf[0], [dlog([t('WALK-BEFORE dfn='), llen('DfN')])]);
  // REPEATU 体内
  const ru = BL()[walkIf[0]].inputs.SUBSTACK[1];
  insertBeforeStmt(BL()[ru].inputs.SUBSTACK[1], [dlog([t('WALK-ITER dfn='), llen('DfN')])]);
  // fpop 前
  const fpopCall = find(cu, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fpop');
  insertBeforeStmt(fpopCall[0], [dlog([t('PRE-FPOP dfn='), llen('DfN')])]);
  console.log('[DBG559] ok');
});
