// ---- DBG501c: dump lookup internals
patch('DBG501c lookup dump', () => {
  newVar('dgF', 0); newVar('dgN', 0); newVar('dgC', 0); newVar('dgS', '');
  const lk = defIdOf('lookup %s');
  let lastLk = BL()[lk].next; while (BL()[lastLk].next) lastLk = BL()[lastLk].next;
  spliceAfter(lastLk, chain([
    setV('dgS', JOIN(txt('vn='), argOf('vn'))),
    setV('dgS', JOIN(VAR('dgS'), JOIN(txt(' found='), VAR('found')))),
    setV('dgS', JOIN(VAR('dgS'), JOIN(txt(' fnstk='), llen('FnStack')))),
    setV('dgS', JOIN(VAR('dgS'), JOIN(txt(' ubF='), VAR('ubF')))),
    setV('dgS', JOIN(VAR('dgS'), JOIN(txt(' nNames='), llen('Names')))),
    callProc('log %s', [VAR('dgS')])
  ]));
});
