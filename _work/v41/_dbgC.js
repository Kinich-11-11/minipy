// ---- DBGC: log at the two UnboundLocalError raise sites in atom ----
patch('DBGC ule raise sites', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  const atomSet = inDef('atom %s');
  // 两个抛点都是 FAILB(UnboundLocalError...) —— procedures_call 'fail %s'，
  // 其实参树的字符串里含 "UnboundLocalError"
  const fails = find(atomSet, (b) => b.opcode === 'procedures_call' && b.mutation && b.mutation.proccode === 'fail %s'
    && [...reach(Object.values(b.inputs)[0][1])].some((x) => {
      const w = BL()[x];
      return w.fields && w.fields.STRING1 && w.fields.STRING1[0] === 'UnboundLocalError';
    }));
  console.log('[DBGC] ULE fail sites = ' + fails.length);
  for (const f of fails) {
    insertBeforeStmt(f, [dlog([t('ULE-RAISE ev='), VAR('ev'), t(' ubR='), VAR('ubR'), t(' found='), VAR('found'), t(' ubO='), VAR('ubO'), t(' dep='), llen('FnStack')])]);
  }
  // 同时记录 calluser 的窗口：参数绑定开始/结束
  const cu = defIdOf('calluser %s %s %s');
  const pushFi = find(reach(cu), (b) => b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'VStack');
  console.log('[DBGC] calluser VStack pushes = ' + pushFi.length);
  if (pushFi.length >= 1) {
    insertBeforeStmt(pushFi[0], [dlog([t('CU-ARGS-BEGIN fn='), argOf('fn'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi')])]);
  }
  // calluser 尾部 FrBndC pop 前 = 函数体结束
  const frPop = find(reach(cu), (b) => b.opcode === 'data_deleteoflist' && b.fields.LIST && b.fields.LIST[0] === 'FrBase');
  if (frPop.length === 1) {
    insertBeforeStmt(frPop[0], [dlog([t('CU-END fn='), argOf('fn')])]);
  }
});
