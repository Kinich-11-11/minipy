// ---- DBG501e: dump per-line indent during the regdef scan
patch('DBG501e indent dump', () => {
  newVar('dgS', '');
  const J2 = (a, b) => JOIN(a, b);
  const vnOf = (d) => (Array.isArray(d && d[1]) && d[1][0] === 12) ? d[1][1] : ((d && typeof d[1] === 'string' && BL()[d[1]] && BL()[d[1]].opcode === 'data_variable') ? BL()[d[1]].fields.VARIABLE[0] : null);
  const litOf = (d) => (Array.isArray(d) && (d[0] === 10 || d[0] === 4) && typeof d[1] === 'string') ? String(d[1]) : (d && Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4) ? String(d[1][1]) : null);
  const rd = defIdOf('regdef %s');
  const lcPIf = find(reach(rd), (b) => b.opcode === 'control_if' && b.inputs.CONDITION && typeof b.inputs.CONDITION[1] === 'string'
    && (() => {
      const q = BL()[b.inputs.CONDITION[1]];
      if (!q || q.opcode !== 'operator_equals') return false;
      return (vnOf(q.inputs.OPERAND1) === 'lcP' && litOf(q.inputs.OPERAND2) === '0')
          || (vnOf(q.inputs.OPERAND2) === 'lcP' && litOf(q.inputs.OPERAND1) === '0');
    })());
  if (lcPIf.length !== 1) throw new Error('[DBG501e] lcP guard = ' + lcPIf.length);
  const tok = BL()[lcPIf[0]].inputs.SUBSTACK[1];
  insertBeforeStmt(tok, [
    callProc('log %s', [J2(J2(txt('LINE '), VAR('lcL')), J2(txt(' ind='), J2(VAR('lcN'), J2(txt(' di='), J2(VAR('lcDI'), J2(txt(' txt='), item('Code', VAR('lcL'))))))))])
  ]);
});
