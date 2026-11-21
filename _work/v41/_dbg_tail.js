// ---- DBG tail: log each step of calluser's return path
patch('DBG tail', () => {
  newVar('tgN', '');
  const J2 = (a, b) => JOIN(a, b);
  const cu = defIdOf('calluser %s %s %s');
  const marks = [
    ['CALL pend %s', 'procedures_call', 'pend', 'A-pend-before'],
    ['del FnStack', 'data_deleteoflist', null, 'B-delFnStack-before'],
    ['CALL fpop', 'procedures_call', 'fpop', 'C-fpop-before'],
    ['del FrRet', 'data_deleteoflist', 'FrRet', 'D-delFrRet-before'],
    ['del FrBase', 'data_deleteoflist', 'FrBase', 'E-delFrBase-before'],
  ];
  for (const [needle, op, list, tag] of marks) {
    const hits = find(reach(cu), (b) => {
      if (b.opcode !== op) return false;
      if (op === 'procedures_call') return b.mutation && b.mutation.proccode === needle.replace(' %s', '');
      return b.fields && b.fields.LIST && b.fields.LIST[0] === list;
    });
    if (hits.length !== 1) { console.log('[DBGtail] skip ' + tag + ' hits=' + hits.length); continue; }
    insertBeforeStmt(hits[0], [callProc('log %s', [txt(tag)])]);
  }
  console.log('[DBGtail] inserted');
});
