// rightside's membership branch used to relabel the RHS as a list. Since
// P826 that RHS contains a reference slot, not serialized list elements.
patch('project live dictionary views for membership', () => {
  const v = VAR, a = argOf, n = num, s = txt;
  const call = (proc, ...args) => callProc(proc, args);
  const kind = t => EQ(v('evtype'), s(t));
  const stop = () => I('control_stop', {
    fields: { STOP_OPTION: ['this script', null] },
    mutation: { tagName: 'mutation', children: [], hasnext: 'false' },
  });
  newVar('viewMemId', 0);
  newVar('viewMemKind', '');
  const boolResult = value => [setV('ev', value), setV('evtype', s('B')), setV('evK', s(''))];
  const hashError = () => IF(NOT(EQ(v('hc821bad'), s(''))), [
    call('fail %s', JOIN(JOIN(s("TypeError: unhashable type: '"), v('hc821bad')), s("'"))),
    stop(),
  ]);
  const anchor = 'bdatase_g7nyh5q06';
  if (BL()[anchor]?.fields.VARIABLE[0] !== 'evtype' ||
      !inDef('rightside %s %s %s %s %s').has(anchor)) throw Error('Unexpected membership anchor');
  insertBeforeStmt(anchor, [
    setV('viewMemId', v('ev')),
    setV('viewMemKind', v('evtype')),
    IF(kind('K'), [call('hashCheck821 %s %s', a('leftval'), a('lefttype')), hashError()]),
    IF(kind('I'), [
      // Non-pairs are not items. Pair membership hashes the key only, so
      // a list is permitted as the value but not as the key.
      IF(NOT(EQ(a('lefttype'), s('T'))), [
        ...boolResult(EQ(a('op'), s('notin'))), stop(),
      ]),
      call('listlen %s', a('leftval')),
      IF(NOT(EQ(v('ev'), n(2))), [
        ...boolResult(EQ(a('op'), s('notin'))), stop(),
      ]),
      call('listitem %s %s', a('leftval'), n(1)),
      call('hashCheck821 %s %s', v('ev'), v('evtype')),
      hashError(),
    ]),
    // Keep the existing membership matcher and in/not-in finalization.
    call('view826 %s %s', v('viewMemId'), v('viewMemKind')),
  ]);
});