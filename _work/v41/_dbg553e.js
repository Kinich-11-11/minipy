// ---- DBG553e: 找 print 实参的渲染点 ----
patch('DBG553e', () => {
  newVar('p420n', 0);
  const F = (v) => VAR(v);
  const t = (s) => txt(s);
  const dlog = (parts) => callProc('log %s', [parts.reduce((a, b) => JOIN(a, b))]);
  // (1) strval 入口：vt/vv
  {
    const sv = defIdOf('strval %s %s');
    insertBeforeStmt(BL()[sv].next, [IF(LT(F('p420n'), num(40)), [
      chgV('p420n', num(1)),
      dlog([t('SVAL vt='), argOf('vt'), t(' head='), F('head'), t(' pi='), F('pi'), t(' prpass='), F('prpass'), t(' plo='), F('plo'), t(' phi='), F('phi'), t(' vv=['), argOf('vv'), t(']')])
    ])]);
  }
  // (1b) callfn 入口
  {
    const cf = defIdOf('callfn %s %s %s');
    insertBeforeStmt(BL()[cf].next, [IF(LT(F('p420n'), num(60)), [
      dlog([t('CALLFN fn='), argOf('fn'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi')])
    ])]);
  }
  // (2) eval 结尾：容器值
  {
    const ev2 = defIdOf('eval %s %s');
    let tail = BL()[ev2].next;
    while (BL()[tail].next) tail = BL()[tail].next;
    spliceAfter(tail, chain([
      IF(EQ(F('evtype'), txt('L')), [dlog([t('EVALEND-L lo='), argOf('lo'), t(' hi='), argOf('hi'), t(' ev=['), F('ev'), t(']')])])
    ]));
  }
  console.log('[DBG553e] ok');
});
