// ---- DBG501d: extended lookup dump
patch('DBG501d lookup dump2', () => {
  newVar('dgS', '');
  const lk = defIdOf('lookup %s');
  let lastLk = BL()[lk].next; while (BL()[lastLk].next) lastLk = BL()[lastLk].next;
  const J2 = (a, b) => JOIN(a, b);
  spliceAfter(lastLk, chain([
    setV('dgS', J2(txt('vn='), argOf('vn'))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' fnd='), VAR('found')))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' fi='), VAR('cloFi')))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' nLL='), llen('FnLocL')))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' B='), item('FnLocB', VAR('cloFi'))))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' L='), item('FnLocL', VAR('cloFi'))))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' ubJ='), VAR('ubJ')))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' ubF='), VAR('ubF')))),
    setV('dgS', J2(VAR('dgS'), J2(txt(' N1='), item('FnLocN', num(1))))),
    callProc('log %s', [VAR('dgS')])
  ]));
});
