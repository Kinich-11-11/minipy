
const patch = () => {}, J = () => {}, joinAll = () => {}, failMsg = () => {}, tokAt = () => {}, kindAt = () => {};
const STOPTHIS = () => {}, lit = '', taken = new Set(), T = () => ({}), newVar = () => {}, B = { addList: () => {}, LISTF: () => {}, REP: () => {}, VARF: () => {} };
const I = () => {}, item = () => {}, JOIN = () => {}, IF = () => {}, IFELSE = () => {}, REPEATU = () => {}, REPEAT = () => {};
const clearL = () => {}, addTo = () => {}, callProc = () => {}, setV = () => {}, chgV = () => {}, VAR = () => {}, num = () => {}, txt = () => {};
const inDef = () => {}, find = () => {}, reach = () => {}, attachBody = () => {}, newProc = () => ({ defId: 0 }), defIdOf = () => 0;
const BL = () => ({}), insertBeforeStmt = () => {}, allIds = () => [], addList = () => {}, IT = 'Interpreter', llen = () => {}, item2 = () => {};
const FLOOR = () => {}, DIV = () => {}, MUL = () => {}, ADD = () => {}, SUB = () => {}, MOD = () => {}, OR = () => {}, AND = () => {}, NOT = () => {};
const EQ = () => {}, LT = () => {}, GT = () => {}, argOf = () => {}, lenOf = () => {}, letterOf = () => {}, listHasl = () => {}, FAIL = () => {}, spliceAfter = () => {}, chain = () => {};
// ---- P161: `%c` accepts a one-character string, and says what CPython says (v4.88) ----
//
// CPython's `%c` takes an int *or* a one-character string (`'%c' % 'a'` is `'a'`), and its type error
// is `TypeError: %c requires an int or a unicode character, not str` (MiniPy said
// `%c requires int or char`, which also mis-described a list as "int or char").  For `.format` the
// wording stays `ValueError: Unknown format code 'c' for object of type 'str'` (P156).
//
// The range stays ASCII 32..126: MiniPy's character set *is* the sprite's costume table (printable
// ASCII), so `'%c' % 300` cannot produce U+012C -- CPython can, and that limitation is documented.
//
// IMPORTANT: the `conv == 'c'` branch of `pctitem` is shared by `%` and by `.format` (they differ only
// in the `pcsrc` flag, 1 = format / 0 = percent, see P156).  `.format` already handles an int and must
// keep raising `ValueError: Unknown format code 'c' ...` for a string, so the new one-character path is
// gated on `pcsrc == 0`.
patch('P161 percent c', () => {
  const J = (a, b) => JOIN(a, b);
  const joinAll = (parts) => parts.reduce((a, b) => J(a, b));
  const failMsg = (expr) => callProc('fail %s', [expr]);
  const isVarDesc = (d, name) => (Array.isArray(d) && d[0] === 12 && d[1] === name)
    || (Array.isArray(d) && Array.isArray(d[1]) && d[1][0] === 12 && d[1][1] === name);
  const litOf = (d) => (Array.isArray(d) && Array.isArray(d[1]) && (d[1][0] === 10 || d[1][0] === 4)) ? String(d[1][1]) : null;
  // conv is a custom-block argument, so its reference is a reporter block, not a variable descriptor
  const isConvRef = (d) => {
    if (isVarDesc(d, 'conv')) return true;
    const b = (Array.isArray(d) && typeof d[1] === 'string') ? BL()[d[1]] : null;
    return !!b && b.opcode === 'argument_reporter_string_number' && b.fields.VALUE && b.fields.VALUE[0] === 'conv';
  };

  const pi = inDef('pctitem %s %s %s %s');
  const cIf = find(pi, (b) => b.opcode === 'control_if' && b.inputs.CONDITION
    && typeof b.inputs.CONDITION[1] === 'string'
    && BL()[b.inputs.CONDITION[1]].opcode === 'operator_equals'
    && isConvRef(BL()[b.inputs.CONDITION[1]].inputs.OPERAND1)
    && litOf(BL()[b.inputs.CONDITION[1]].inputs.OPERAND2) === 'c');
  if (cIf.length !== 1) throw new Error('[P161] %c branch = ' + cIf.length);

  // ---------- (a) the %-side wording for the type check
  const failC = find(pi, (b) => {
    if (b.opcode !== 'procedures_call' || !b.mutation || b.mutation.proccode !== 'fail %s') return false;
    const v = Object.values(b.inputs || {})[0];
    return v && Array.isArray(v[1]) && v[1][0] === 10 && /%c requires int or char/.test(String(v[1][1]));
  });
  if (failC.length !== 1) throw new Error('[P161] %c type fail = ' + failC.length);
  {
    // P156 wrapped it as `if pcsrc == 1 then <value error> else <percent error>`
    let wrapper = null;
    for (const pid of pi) {
      const p = BL()[pid];
      if (p.opcode !== 'control_if_else') continue;
      const s2 = p.inputs.SUBSTACK2 && p.inputs.SUBSTACK2[1];
      if (typeof s2 === 'string' && (s2 === failC[0] || reach(s2).has(failC[0]))) { wrapper = pid; break; }
    }
    if (!wrapper) throw new Error('[P161] %c wrapper not found');
    setStack(wrapper, 'SUBSTACK2', [
      setV('p6v', argOf('vv')), setV('p6t', argOf('vt')), callProc('tname', []),
      failMsg(joinAll([txt('TypeError: %c requires an int or a unicode character, not '), VAR('p6msg')]))
    ]);
    console.log('[P161] %c type wording');
  }

  // ---------- (b) a one-character string passes straight through
  {
    const head = BL()[cIf[0]].inputs.SUBSTACK[1];
    const s2 = BL()[head].next;
    const s3 = s2 ? BL()[s2].next : null;
    const items = [head, s2, s3];
    if (items.some((x) => !x)) throw new Error('[P161] %c branch shape');
    const pok = BL()[items[2]].next;
    BL()[items[2]].next = null;
    setStack(cIf[0], 'SUBSTACK', [
      IFELSE(AND(EQ(VAR('pcsrc'), num(0)), AND(EQ(argOf('vt'), txt('S')), EQ(lenOf(argOf('vv')), num(1)))), [
        setV('ptx', argOf('vv'))
      ], items),
      pok
    ]);
    console.log('[P161] %c accepts a single character');
  }
});
