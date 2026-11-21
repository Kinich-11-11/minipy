// ---- DBG501: dump the static local sets after each regdef
patch('DBG501 dump locals', () => {
  newVar('dgI', 0); newVar('dgS', '');
  const J2 = (a, b) => JOIN(a, b);
  const rd = defIdOf('regdef %s');
  let lastRd = BL()[rd].next; while (BL()[lastRd].next) lastRd = BL()[lastRd].next;
  const mk = (a, b) => J2(txt(a), b);
  spliceAfter(lastRd, chain([
    setV('dgS', txt('')),
    setV('dgI', item('FnLocB', llen('FnName'))),
    REPEATU(GT(VAR('dgI'), ADD(item('FnLocB', llen('FnName')), SUB(item('FnLocL', llen('FnName')), num(1)))), [
      setV('dgS', J2(VAR('dgS'), J2(item('FnLocN', VAR('dgI')), txt(' ')))),
      chgV('dgI', num(1))
    ]),
    callProc('log %s', [mk('LOC ', J2(item('FnName', llen('FnName'))))]),
    callProc('log %s', [J2(txt('lines '), J2(item('FnStart', llen('FnName')), J2(txt('..'), item('FnEnd', llen('FnName')))))]),
    callProc('log %s', [J2(txt('locB/L '), J2(item('FnLocB', llen('FnName')), J2(txt('/'), item('FnLocL', llen('FnName')))))]),
    callProc('log %s', [J2(txt('locals: '), VAR('dgS'))]),
    setV('dgS', txt('')),
    setV('dgI', item('FnXcB', llen('FnName'))),
    REPEATU(GT(VAR('dgI'), ADD(item('FnXcB', llen('FnName')), SUB(item('FnXcL', llen('FnName')), num(1)))), [
      setV('dgS', J2(VAR('dgS'), J2(item('FnXcN', VAR('dgI')), txt(' ')))),
      chgV('dgI', num(1))
    ]),
    callProc('log %s', [J2(txt('excl: '), VAR('dgS'))])
  ]));
});
