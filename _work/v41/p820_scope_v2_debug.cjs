// P820 narrow experiment: make dict.keys()/values()/items() lazy views.
// This is intentionally a patch fragment, not a release build.
patch('P820 lazy dict view experiment', () => {
  const F = (n) => VAR(n);
  const one = (xs, label) => {
    if (xs.length !== 1) throw new Error('[P820] ' + label + ' = ' + xs.length);
    return xs[0];
  };
  const litOf = (v) => {
    if (!Array.isArray(v)) return null;
    if ((v[0] === 4 || v[0] === 10) && typeof v[1] !== 'object') return String(v[1]);
    if (Array.isArray(v[1]) && (v[1][0] === 4 || v[1][0] === 10)) return String(v[1][1]);
    return null;
  };
  const vnOf = (v) => {
    if (!Array.isArray(v)) return null;
    if (Array.isArray(v[1]) && v[1][0] === 12) return v[1][1];
    if (typeof v[1] === 'string' && BL()[v[1]]) {
      const b = BL()[v[1]];
      if (b.opcode === 'argument_reporter_string_number') return b.fields.VALUE[0];
      if (b.opcode === 'data_variable') return b.fields.VARIABLE[0];
    }
    return null;
  };
  const hasEq = (ids, variable, literal) => [...ids].some((id) => {
    const b = BL()[id];
    if (!b || b.opcode !== 'operator_equals') return false;
    return (vnOf(b.inputs.OPERAND1) === variable && litOf(b.inputs.OPERAND2) === literal)
      || (vnOf(b.inputs.OPERAND2) === variable && litOf(b.inputs.OPERAND1) === literal);
  });

  // dictmeth arguments are (rec, nm, meth, lo, hi). Keep the receiver record
  // in ev and use the existing K/V/I tags as the view kind.
  const dm = inDef('dictmeth %s %s %s %s %s');
  const k = one(find(dm, b => b.opcode === 'procedures_call' && b.mutation?.proccode === 'dictkeys %s'), 'dictkeys call');
  const v = one(find(dm, b => b.opcode === 'procedures_call' && b.mutation?.proccode === 'dictvals %s'), 'dictvals call');
  const i = one(find(dm, b => b.opcode === 'procedures_call' && b.mutation?.proccode === 'dictitems %s'), 'dictitems call');
  replaceStmt(k, setV('ev', argOf('rec')));
  replaceStmt(v, setV('ev', argOf('rec')));
  replaceStmt(i, setV('ev', argOf('rec')));

  // callfn's iterable conversion branch recognizes K/V/I, but previously
  // relabeled the value as L without rebuilding it. Materialize the receiver
  // record at list(view) time, so mutations made after view creation are seen.
  for (const proc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const guards = find(inDef(proc), b => {
      if ((b.opcode !== 'control_if' && b.opcode !== 'control_if_else') || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') return false;
      const ids = reach(b.inputs.CONDITION[1]);
      return hasEq(ids, 'evtype', 'D') && hasEq(ids, 'evtype', 'K')
        && hasEq(ids, 'evtype', 'V') && hasEq(ids, 'evtype', 'I')
        && hasEq(ids, 'fn', 'list');
    });
    const guard = one(guards, proc + ' list iterable guard');
    const first = BL()[guard].inputs.SUBSTACK && BL()[guard].inputs.SUBSTACK[1];
    if (typeof first !== 'string') throw new Error('[P820] ' + proc + ' list guard has no substack');
    insertBeforeStmt(first, [
      IF(EQ(F('evtype'), txt('K')), [callProc('dictkeys %s', [F('ev')])]),
      IF(EQ(F('evtype'), txt('V')), [callProc('dictvals %s', [F('ev')])]),
      IF(EQ(F('evtype'), txt('I')), [callProc('dictitems %s', [F('ev')])])
    ]);
  }


  // Scope experiment v2: when a view carries the original dict record, len(view)
  // and for view must materialize from that record. This is intentionally a
  // candidate only: the record is a value snapshot, so post-creation dict
  // mutation is expected to expose the identity limitation.
  const makeViewKinds = () => [
    IF(EQ(F('evtype'), txt('K')), [callProc('dictkeys %s', [F('ev')])]),
    IF(EQ(F('evtype'), txt('V')), [callProc('dictvals %s', [F('ev')])]),
    IF(EQ(F('evtype'), txt('I')), [callProc('dictitems %s', [F('ev')])])
  ];
  for (const proc of ['callfn %s %s %s', 'callfnW %s %s %s']) {
    const defs = find(inDef(proc), b => {
      if ((b.opcode !== 'control_if' && b.opcode !== 'control_if_else') || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') return false;
      const ids = reach(b.inputs.CONDITION[1]);
      return hasEq(ids, 'evtype', 'L') && hasEq(ids, 'evtype', 'T') && hasEq(ids, 'evtype', 'G')
        && [...reach(b.inputs.SUBSTACK?.[1] || '')].some(id => BL()[id]?.opcode === 'procedures_call' && BL()[id].mutation?.proccode === 'listlen %s');
    });
    if (defs.length !== 1) { console.log('[P820-v2-debug] '+proc+' len base guard='+defs.length, defs); continue; }
    const guard = defs[0];
    const oldCond = BL()[guard].inputs.CONDITION[1];
    BL()[guard].inputs.CONDITION = B.BOOL(OR(oldCond, OR(EQ(F('evtype'), txt('K')), OR(EQ(F('evtype'), txt('V')), EQ(F('evtype'), txt('I'))))));
    const first = BL()[guard].inputs.SUBSTACK?.[1];
    if (typeof first !== 'string') throw new Error('[P820-v2] ' + proc + ' len guard has no substack');
    insertBeforeStmt(first, makeViewKinds());
  }

  for (const proc of ['forloop']) {
    const defs = find(inDef(proc), b => {
      if ((b.opcode !== 'control_if' && b.opcode !== 'control_if_else') || !b.inputs.CONDITION || typeof b.inputs.CONDITION[1] !== 'string') return false;
      const ids = reach(b.inputs.CONDITION[1]);
      return hasEq(ids, 'evtype', 'K') && hasEq(ids, 'evtype', 'V') && hasEq(ids, 'evtype', 'I')
        && b.inputs.SUBSTACK && typeof b.inputs.SUBSTACK[1] === 'string';
    });
    if (defs.length !== 2) { console.log('[P820-v2-debug] '+proc+' view branches='+defs.length); continue; }
    for (const d of defs) insertBeforeStmt(BL()[d].inputs.SUBSTACK[1], makeViewKinds());
  }
  console.log('[P820-v2] receiver-record view candidate installed; len/for materialize snapshot');
});











