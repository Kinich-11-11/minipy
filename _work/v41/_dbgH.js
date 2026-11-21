// ---- DBGH: dump GName/MName + frame-tail GSave behavior ----
patch('DBGH gname dump', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  // 列表拼接 reporter：join 前 n 项
  const joinList = (list, n) => {
    let acc = txt('');
    for (let i = 1; i <= n; i++) acc = JOIN(acc, JOIN(item(list, num(i)), txt('|')));
    return acc;
  };
  // calluser 尾部 GSave 捕获之后（anchor: clear(Names) —— 尾部那个）
  const cu = defIdOf('calluser %s %s %s');
  const cuReach = reach(cu);
  const clearNames = find(cuReach, (b) => b.opcode === 'data_deletealloflist' && b.fields.LIST && b.fields.LIST[0] === 'Names');
  console.log('[DBGH] clear(Names) sites in calluser = ' + clearNames.length);
  for (const cn of clearNames) {
    insertBeforeStmt(cn, [dlog([t('TAIL fn='), argOf('fn'), t(' GName='), joinList('GName', 6), t(' MName='), joinList('MName', 6), t(' GSaveN='), joinList('GSaveN', 8), t(' GSaveV='), joinList('GSaveV', 8)])]);
  }
  // GSave 合并后（最后一个 GSave 循环之后 = MSave 循环开始前）—— 记录恢复后 Names 的 left 值
  // 简化：在 clear(Names) 之后插一条，打印恢复后的 Names 长度
  for (const cn of clearNames) {
    spliceAfter(cn, chain([dlog([t('RESTORED nNames='), llen('Names'), t(' FN='), llen('FN'), t(' epB='), VAR('epB')])]));
  }
});
