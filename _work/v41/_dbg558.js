patch('DBG558', () => {
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  const cu = inDef('calluser %s %s %s');
  const frPush = find(cu, (b) => b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'FrRBase');
  spliceAfter(frPush[0], chain([dlog([t('CU-ENTRY pd='), llen('PairDep'), t(' pp='), llen('PairPile')])]));
  const fpopCall = find(cu, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fpop');
  insertBeforeStmt(fpopCall[0], [dlog([t('CU-EXIT pd='), llen('PairDep'), t(' pp='), llen('PairPile')])]);
  console.log('[DBG558] ok');
});
