patch('Separate value selection and branch testing', () => {
  // The same parser is used in all contexts. An explicit frame-local argument prevents
  // condition mode from leaking into nested calls (bool(x and y) is NOT `if x and y`).
  const plain = 'eval %s %s', ctx = 'evalCtx828 %s %s %s', mode = 'context828';
  const def = defIdOf(plain), protoId = BL()[def].inputs.custom_block[1], proto = BL()[protoId];
  const aid = B.nid('arg'), reporter = a(mode); BL()[reporter].shadow = true;
  proto.inputs[aid] = [1, reporter];
  for (const [field, value] of Object.entries({argumentids: aid, argumentnames: mode, argumentdefaults: '0'})) {
    proto.mutation[field] = JSON.stringify([...JSON.parse(proto.mutation[field]), value]);
  }
  proto.mutation.proccode = ctx;
  const predicates = new Set(['g^bIkm4U?#:Q1oa5oLB+', 'bproced_5hz688go', 'c42c9c50a7e04c0dbeca',
    'bproced_qfnnjenpp', 'bproced_qfoskwhcd', 'bproced_av03xxlad', 'bproced_vxg9we5ak', 'bproced_vl5n15ros']);
  const forward = new Set(['bproced_3rghrggh5', 'bproced_5mubvg7b', 'bproced_5pk4a1w3']); // grouping, conditional arms
  for (const [id, b] of Object.entries(BL())) if (b.opcode === 'procedures_call' && b.mutation.proccode === plain) {
    b.mutation.proccode = ctx; b.mutation.argumentids = proto.mutation.argumentids;
    b.inputs[aid] = B.REP(forward.has(id) ? a(mode) : n(predicates.has(id) ? 1 : 0), [4, '0']);
  }
  const evaluate = (lo, hi, how) => c('evalCtx828', lo, hi, how);
  proc('eval', ['lo','hi'], [evaluate(a('lo'), a('hi'), n(0))]); // public value-evaluation entry
  const isBoolOp = op => OR(EQ(op(), s('and')), EQ(op(), s('or')));
  const tested = () => EQ(a(mode), n(1)), selected = () => EQ(a(mode), n(2));
  const metadata = ['ev', 'evtype', 'evK', 'valueRef827', 'builtin827'];
  const takeLeft = () => OR(AND(EQ(a('op'), s('and')), is('truthv', '0')),
                            AND(EQ(a('op'), s('or')), is('truthv', '1')));
  proc('choose828', ['op', 'lo', 'hi', mode, ...metadata], [
    c('truth', a('ev'), a('evtype')), IF(NOT(ok()), [stop()]),
    IFELSE(takeLeft(), [IFELSE(tested(), result(v('truthv'), 'B'), metadata.map(k => sv(k, a(k))))],
      [evaluate(a('lo'), a('hi'), a(mode))])
  ]);
  proc('boolPair828', ['lo', 'hi', 'cut', 'op', mode], [
    evaluate(a('lo'), SUB(a('cut'), n(1)), a(mode)), IF(NOT(ok()), [stop()]),
    c('choose828', a('op'), ADD(a('cut'), n(1)), a('hi'), a(mode), ...metadata.map(v))
  ]);
  const alt = (id, cond, body) => {
    const choice = IFELSE(cond, body, []); replaceStmt(id, choice);
    BL()[choice].inputs.SUBSTACK2 = [2, id]; BL()[id].next = null;
  };
  const op = () => item('Tok', v('ecut'));
  alt('KTZISJ.y4VkR]^/@DLnz', isBoolOp(op), [c('boolPair828', a('lo'), a('hi'), v('ecut'), op(), a(mode))]);
  proc('condNot828', ['lo','hi'], [evaluate(a('lo'), a('hi'), n(1)), IF(NOT(ok()), [stop()]),
    c('truth', v('ev'), v('evtype')), ...result(is('truthv', '0'), 'B')]);
  for (const id of ['ec}pKI2)L-VBsvJck,P@', 'I%YX)mwFw-)2L3W*kVPZ'])
    alt(id, AND(tested(), EQ(item('Tok', a('lo')), s('not'))), [c('condNot828', ADD(a('lo'), n(1)), a('hi'))]);
  // Non-Boolean binary operations go directly to rightside without invoking truth.
  const left = 'nZH}+P^|TjXtjp?sFMHe', right = BL()['wP;5Ke:[h=2T6euJyNtY'].inputs.SUBSTACK[1];
  BL()[left].next = chain([IF(NOT(ok()), [stop()]), right]);
  // Prefer the first cut in a homogeneous chain, so a falsy a in `a and b and c`
  // is not tested again. Parenthesised expressions still have their own eval frames.
  const rank = BL()['b{;)dUOf!(_A/?MF7+}@'].inputs.CONDITION;
  rank[1] = AND(rank[1], NOT(AND(EQ(v('erank'), v('emin')), isBoolOp(() => v('eop')))));

  // Existing assignment code derives mutable aliases from the RHS tokens. Give it the
  // selected bare name or literal lookup instead of the entire Boolean expression.
  // Never re-evaluate a user-defined expression to find a source/owner.
  lists('PickLo828', 'PickHi828', 'PickView828'); vars('pickLo828', 'pickHi828', 'pickI828');
  enter(ctx, IF(selected(), [rep('PickLo828', llen('PickLo828'), a('lo')), rep('PickHi828', llen('PickHi828'), a('hi'))]));
  proc('assignEval828', ['hi'], [
    IFELSE(OR(GT(idx('Tok', s('and')), n(0)), GT(idx('Tok', s('or')), n(0))), [
      addTo('PickLo828', n(0)), addTo('PickHi828', n(0)), evaluate(n(3), a('hi'), n(2)),
      sv('pickLo828', last('PickLo828')), sv('pickHi828', last('PickHi828')),
      del('PickLo828', s('last')), del('PickHi828', s('last'))
    ], [evaluate(n(3), a('hi'), n(0)), sv('pickLo828', n(0))])
  ]);
  replaceStmt('oyZ^4fnxYCtDOSCp9}1b', c('assignEval828', v('count')));
  const at = (list, off) => item(list, ADD(v('pickLo828'), n(off)));
  const span = n0 => EQ(SUB(v('pickHi828'), v('pickLo828')), n(n0));
  const simple = () => AND(EQ(at('Kind', 0), s('I')), OR(span(0), OR(
    AND(span(2), AND(EQ(at('Tok', 1), s('.')), EQ(at('Kind', 2), s('I')))),
    AND(span(3), AND(EQ(at('Tok', 1), s('[')), AND(EQ(at('Tok', 3), s(']')),
      OR(EQ(at('Kind', 2), s('N')), EQ(at('Kind', 2), s('S')))))))));
  const mutable = () => OR(type('D'), OR(type('L'), type('E')));
  const copy = index => ['Tok','Kind'].map(k => addTo(k, item('EG764' + k, ADD(SUB(llen('EG764' + k), last('EG764Len')), index()))));
  before('bdatase_13rp97jg9', addTo('PickView828', n(0)),
    IF(AND(mutable(), AND(GT(v('pickLo828'), n(0)), AND(OR(GT(v('pickLo828'), n(3)), LT(v('pickHi828'), v('count'))), simple()))), [
      rep('PickView828', llen('PickView828'), n(1)), c('egSave764'), ...copy(() => n(1)), ...copy(() => n(2)),
      sv('pickI828', v('pickLo828')), REPEATU(GT(v('pickI828'), v('pickHi828')), [...copy(() => v('pickI828')), chgV('pickI828', n(1))]),
      sv('count', llen('Tok'))
    ]));
  after('bcontro_tovqirc2x', IF(EQ(last('PickView828'), n(1)), [c('egRestore764')]), del('PickView828', s('last')));
});

patch('Full Unicode default case folding', () => {
  const rows = fs.readFileSync(path.join(__dirname, 'v254/fold-15.0.txt'), 'ascii').trim().split(/\r?\n/).map(line => {
    const [key, values] = line.split(';');
    return [String.fromCodePoint(parseInt(key, 16)), String.fromCodePoint(...values.split(' ').map(x => parseInt(x, 16)))];
  });
  const costumes = T(IT).costumes, offset = costumes.length, prefix = '@cf828:';
  // Scratch string/list comparisons ignore case. Costume names use exact lookup. These
  // private aliases share one existing asset, and their numbers never change old indices.
  for (const [key] of rows) costumes.push({...costumes[0], name: prefix + key});
  B.addList(IT, 'FoldMap828', rows.map(row => row[1]));
  vars('cfPos828', 'cfUnit828', 'cfText828', 'cfAcc828', 'cfSaved828');
  const sw = x => I('looks_switchcostumeto', {inputs: {COSTUME: B.REP(x, [10, ''])}});
  const costume = () => I('looks_costumenumbername', {fields: {NUMBER_NAME: ['number', null]}});
  const high = new Map(rows.filter(([key]) => key.length === 2).map(([key]) => [key[0], key]));
  const mayStartPair = () => I('operator_contains', {inputs: {
    STRING1: B.REP(s([...high.values()].join('')), [10, '']), STRING2: B.REP(v('cfUnit828'), [10, ''])
  }});
  const lookup = text => sw(JOIN(s(prefix), text));
  proc('casefold828', ['text'], [
    sv('cfSaved828', costume()), sv('cfAcc828', s('')), sv('cfPos828', n(1)),
    REPEATU(GT(v('cfPos828'), lenOf(a('text'))), [
      sv('cfUnit828', letterOf(v('cfPos828'), a('text'))), sw(n(1)),
      IF(AND(mayStartPair(), LT(v('cfPos828'), lenOf(a('text')))), [
        lookup(JOIN(v('cfUnit828'), letterOf(ADD(v('cfPos828'), n(1)), a('text')))),
        IF(GT(costume(), n(offset)), [chgV('cfPos828', n(1))])
      ]),
      IF(EQ(costume(), n(1)), [lookup(v('cfUnit828'))]),
      IFELSE(GT(costume(), n(offset)), [sv('cfText828', item('FoldMap828', SUB(costume(), n(offset))))],
        [sv('cfText828', v('cfUnit828'))]),
      sv('cfAcc828', JOIN(v('cfAcc828'), v('cfText828'))), chgV('cfPos828', n(1))
    ]), sw(v('cfSaved828')), ...result(v('cfAcc828'), 'S')
  ]);
  replaceStmt('bproced_ighmsw5bb', c('casefold828', v('smrec')));
});
