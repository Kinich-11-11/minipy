patch('DBGR narg entry', () => {
  B.addList(IT, 'DbgLog', []);
  const J = (a, b) => JOIN(a, b);
  const dlog = (parts) => addTo('DbgLog', parts.reduce((a, b) => J(a, b)));
  const t = (s) => txt(s);
  for (const pc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const cf = defIdOf(pc);
    const first = BL()[cf].next;
    insertBeforeStmt(first, [dlog([t('CFN-ENTRY fn='), argOf('fn'), t(' narg='), VAR('narg'), t(' lo='), argOf('lo'), t(' hi='), argOf('hi')])]);
  }
  // eval 出口也打一条（narg 状态）
  const ev = defIdOf('eval %s %s');
  let last = BL()[ev].next; let g = 0;
  while (BL()[last].next && g++ < 9000) last = BL()[last].next;
  spliceAfter(last, chain([dlog([t('EVAL-EXIT lo='), argOf('lo'), t(' narg='), VAR('narg')])]));
});
