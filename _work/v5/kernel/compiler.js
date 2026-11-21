'use strict';
/**
 * v5 Compiler - explicit task stack, post-order emission, label backpatching.
 * Tasks (CtK): n visit node | e emit | j jump/patched jump | l label
 *              d def/class/lambda | p push loop ctx | q pop loop ctx | s store-to-target
 */
const { E, S } = require('../dsl.js');
const L = require('./lib.js');
const U = require('./astutil.js');

const NdK = (nd) => E.item('NdK', nd);
const NdA = (nd) => E.item('NdA', nd);
const NdN = (nd) => E.item('NdN', nd);
const NdG = (nd) => E.item('NdG', nd);
const { EXCNAMES, key } = require('./vm.js');
const SKNAME = key('__sortpairs');
const STOPEX = E.str('C' + (EXCNAMES.indexOf('StopIteration') + 1));
const NXV = '__nxv';
const Ch = (nd, k) => E.item('NdC', E.add(E.item('NdS', nd), (typeof k === 'number') ? E.num(k) : k));
const heapGet = U.heapGet;

function build() {
  const pushT = (k, a, b, c) => L.pushRow('csSp', [
    ['CtK', E.str(k)], ['CtA', a],
    ['CtB', b === undefined ? E.str('') : b],
    ['CtC', c === undefined ? E.str('') : c]]);
  // Iline carries the source line of the node being compiled, so runtime errors and the
  // editor's current-line marker can talk about source lines instead of bytecode addresses.
  const emit = (op, a, b) => [
    S.ladd('Iop', typeof op === 'string' ? E.str(op) : op),
    S.ladd('Ia', a === undefined ? E.str('') : a),
    S.ladd('Ib', b === undefined ? E.str('') : b),
    S.ladd('Iline', E.var('cline')),
  ];
  const herePc = () => E.add(E.len('Iop'), E.num(1));
  const addK = (v, dst) => [S.ladd('Kval', v), S.set(dst, E.len('Kval'))];
  const pushSuite = (suiteNd) => [
    S.set('j', E.item('LCount', NdA(suiteNd))),
    S.Until(E.le(E.var('j'), E.num(0)), [
      ...pushT('n', heapGet(NdA(suiteNd), E.var('j'))),
      S.chg('j', E.num(-1)),
    ]),
  ];
  const pend = (lab, slot) => [
    S.If(E.gt(E.item('Lpc', lab), E.num(0)), [
      S.If(E.eq(slot, E.num(0)),
        [S.lset('Ia', E.len('Iop'), E.item('Lpc', lab))],
        [S.lset('Ib', E.len('Iop'), E.item('Lpc', lab))]),
    ], [
      ...L.pushRow('pdSp', [['PdL', lab], ['PdS', E.len('Iop')], ['PdF', slot]]),
    ]),
  ];
  const doJump = (op, lab) => [...emit(op, E.num(0)), ...pend(lab, E.num(0))];
  const doDef = (op, kidx, lab) => [...emit(op, kidx, E.num(0)), ...pend(lab, E.num(1))];
  const doLabel = (lab) => [
    S.Until(E.ge(E.len('Lpc'), lab), [S.ladd('Lpc', E.num(0))]),
    ...L.setAt('Lpc', lab, herePc()),
    S.set('j', E.num(1)),
    S.Until(E.gt(E.var('j'), E.var('pdSp')), [
      S.If(E.eq(E.item('PdL', E.var('j')), lab), [
        S.If(E.eq(E.item('PdF', E.var('j')), E.num(0)),
          [S.lset('Ia', E.item('PdS', E.var('j')), herePc())],
          [S.lset('Ib', E.item('PdS', E.var('j')), herePc())]),
      ]),
      S.chg('j', E.num(1)),
    ]),
  ];
  function compDict() {
    const nd = () => E.var('cnd');
    return [
      // pushed first => executed last: close the comprehension scope after the value is built
      ...pushT('e', E.str('LCEND')),
      S.chg('lcTop', E.num(1)),
      S.If(E.lt(E.var('lcTop'), E.num(10)),
        [S.set('lcnam', E.join(E.str('__lcacc0'), E.var('lcTop')))],
        [S.set('lcnam', E.join(E.str('__lcacc'), E.var('lcTop')))]),
      S.set('lcak', E.join(E.var('lcnam'), E.str('|000000000'))),
      S.chg('labTop', E.num(2)),
      S.set('lcl', E.sub(E.var('labTop'), E.num(1))),
      S.set('lce', E.var('labTop')),
      ...pushT('e', E.str('DELV'), E.var('lcak')),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce')),
      ...pushT('j', E.str('JMP'), E.var('lcl')),
      ...pushT('e', E.str('SUBSSET'), E.str('k')),
      ...pushT('n', Ch(nd(), E.num(4))),
      ...pushT('n', Ch(nd(), E.num(3))),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),
      ...pushT('j', E.str('NEXT'), E.var('lce')),
      ...pushT('l', E.var('lcl')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
      ...pushT('e', E.str('STOREV'), E.var('lcak')),
      ...pushT('e', E.str('BUILD'), E.str('D|0')),
      // pushed last => executed first: open the comprehension scope before the container
      ...pushT('e', E.str('LCBEGIN')),
    ];
  }

  // [BODY for V1 in I1 for V2 in I2] -> __lc2(I1,V1,I2,V2,BODY): two nested loops
  function compNest() {
    const nd = () => E.var('cnd');
    return [
      // pushed first => executed last: close the comprehension scope after the value is built
      ...pushT('e', E.str('LCEND')),
      S.chg('lcTop', E.num(1)),
      S.If(E.lt(E.var('lcTop'), E.num(10)),
        [S.set('lcnam', E.join(E.str('__lcacc0'), E.var('lcTop')))],
        [S.set('lcnam', E.join(E.str('__lcacc'), E.var('lcTop')))]),
      S.set('lcak', E.join(E.var('lcnam'), E.str('|000000000'))),
      S.chg('labTop', E.num(4)),
      S.set('lcl', E.sub(E.var('labTop'), E.num(3))),
      S.set('lce', E.sub(E.var('labTop'), E.num(2))),
      S.set('lcl2', E.sub(E.var('labTop'), E.num(1))),
      S.set('lce2', E.var('labTop')),
      ...pushT('e', E.str('DELV'), E.var('lcak')),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce')),
      ...pushT('j', E.str('JMP'), E.var('lcl')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce2')),
      ...pushT('j', E.str('JMP'), E.var('lcl2')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),
      ...pushT('n', Ch(nd(), E.num(5))),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(4)))),
      ...pushT('j', E.str('NEXT'), E.var('lce2')),
      ...pushT('l', E.var('lcl2')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(3))),
      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),
      ...pushT('j', E.str('NEXT'), E.var('lce')),
      ...pushT('l', E.var('lcl')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
      ...pushT('e', E.str('STOREV'), E.var('lcak')),
      ...pushT('e', E.str('BUILD'), E.str('L|0')),
      // pushed last => executed first: open the comprehension scope before the container
      ...pushT('e', E.str('LCBEGIN')),
    ];
  }

  function compIfStmt() {
    const nd = () => E.var('cnd');
    return [
      // pushed first => executed last: close the comprehension scope after the value is built
      ...pushT('e', E.str('LCEND')),
      S.chg('lcTop', E.num(1)),
      S.If(E.lt(E.var('lcTop'), E.num(10)),
        [S.set('lcnam', E.join(E.str('__lcacc0'), E.var('lcTop')))],
        [S.set('lcnam', E.join(E.str('__lcacc'), E.var('lcTop')))]),
      S.set('lcak', E.join(E.var('lcnam'), E.str('|000000000'))),
      S.chg('labTop', E.num(3)),
      S.set('lcl', E.sub(E.var('labTop'), E.num(2))),
      S.set('lcs', E.sub(E.var('labTop'), E.num(1))),
      S.set('lce', E.var('labTop')),
      ...pushT('e', E.str('DELV'), E.var('lcak')),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce')),
      ...pushT('j', E.str('JMP'), E.var('lcl')),
      ...pushT('l', E.var('lcs')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),
      ...pushT('n', Ch(nd(), E.num(3))),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('j', E.str('JZ'), E.var('lcs')),
      ...pushT('n', Ch(nd(), E.num(4))),
      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),
      ...pushT('j', E.str('NEXT'), E.var('lce')),
      ...pushT('l', E.var('lcl')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
      ...pushT('e', E.str('STOREV'), E.var('lcak')),
      ...pushT('e', E.str('BUILD'), E.str('L|0')),
      // pushed last => executed first: open the comprehension scope before the container
      ...pushT('e', E.str('LCBEGIN')),
    ];
  }

  // ---------------- next(gen) ----------------
  // Builtins cannot run user code, so `next(g)` is compiled inline: resume the generator
  // with ITER/NEXT/NCHK, park the yielded value in a scratch variable while the two
  // iterator slots are popped, then jump over the StopIteration path.
  // ---------------- sorted(x, key=f) ----------------
  // A builtin cannot call a user function, so the compiler builds the (key, value) pairs
  // itself and hands them to the __sortpairs builtin, which sorts by the first element.
  // Supported shapes: sorted(X, key=K) and sorted(X, key=K, reverse=R).
  // ---------------- with ----------------
  // with EXPR as V: BODY  ->  the manager is parked in a hidden variable, __enter__() is
  // bound to V and the body runs under a TRY, so the exception path still calls
  // __exit__(None, None, None) before re-raising.  The cleanup appears twice (once per
  // path) because the VM has no out-of-line subroutine.
  function withStmt() {
    const nd = () => E.var('cnd');
    const wv = () => E.var('wvar');
    const cleanup = () => [
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('METH'), E.str(key('__exit__')), E.num(4)),
      ...pushT('e', E.str('PUSHK'), E.var('kciZ')),
      ...pushT('e', E.str('PUSHK'), E.var('kciZ')),
      ...pushT('e', E.str('PUSHK'), E.var('kciZ')),
      ...pushT('e', E.str('PUSHV'), wv()),
    ];
    return [
      S.chg('wTop', E.num(1)),
      S.set('wvar', E.join(E.str('__wm'), E.var('wTop'))),
      S.chg('labTop', E.num(2)),
      S.set('lc', E.sub(E.var('labTop'), E.num(1))),
      S.set('lh', E.var('labTop')),
      ...addK(E.str('Z'), 'kciZ'),
      ...cleanup(),
      ...pushT('l', E.var('lc')),
      ...pushT('e', E.str('RERAISE')),
      ...cleanup(),
      ...pushT('l', E.var('lh')),
      ...pushT('j', E.str('JMP'), E.var('lc')),
      ...pushT('e', E.str('ENDTRY')),
      ...pushT('n', Ch(nd(), E.num(2))),
      S.If(E.gt(Ch(nd(), E.num(0)), E.num(0)), [...pushT('s', Ch(nd(), E.num(0)))], [...pushT('e', E.str('POP'))]),
      ...pushT('e', E.str('METH'), E.str(key('__enter__')), E.num(1)),
      ...pushT('e', E.str('PUSHV'), wv()),
      ...pushT('j', E.str('TRY'), E.var('lh')),
      ...pushT('e', E.str('STOREV'), wv()),
      ...pushT('n', Ch(nd(), E.num(1))),
    ];
  }
  function compKeySort() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(2)),
      S.set('lcl', E.sub(E.var('labTop'), E.num(1))),
      S.set('lce', E.var('labTop')),
      ...pushT('e', E.str('DELV'), E.str('__ksp')),
      ...pushT('e', E.str('DELV'), E.str('__ksv')),
      ...pushT('e', E.str('DELV'), E.str('__ksr')),
      ...pushT('e', E.str('CALL'), E.str(',|3')),
      S.If(E.eq(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))], [
        ...addK(E.str('B0'), 'kci'),
        ...pushT('e', E.str('PUSHK'), E.var('kci')),
      ]),
      ...pushT('e', E.str('PUSHV'), E.str('__ksr')),
      ...pushT('e', E.str('PUSHV'), E.str(SKNAME)),
      ...pushT('e', E.str('STOREV'), E.str('__ksr')),
      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce')),
      ...pushT('j', E.str('JMP'), E.var('lcl')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),
      ...pushT('e', E.str('BUILD'), E.str('T|2')),
      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),
      ...pushT('e', E.str('CALL'), E.str(',|2')),
      ...pushT('e', E.str('PUSHV'), E.str('__ksv')),
      ...pushT('n', Ch(nd(), E.num(2))),
      ...pushT('e', E.str('PUSHV'), E.str('__ksp')),
      ...pushT('e', E.str('STOREV'), E.str('__ksv')),
      ...pushT('j', E.str('NCHK'), E.var('lce')),
      ...pushT('j', E.str('NEXT'), E.var('lce')),
      ...pushT('l', E.var('lcl')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
      ...pushT('e', E.str('STOREV'), E.str('__ksp')),
      ...pushT('e', E.str('BUILD'), E.str('L|0')),
    ];
  }
  function compNext() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(2)),
      S.set('lst', E.sub(E.var('labTop'), E.num(1))),
      S.set('lnd', E.var('labTop')),
      ...addK(STOPEX, 'kci'),
      ...pushT('l', E.var('lnd')),
      ...pushT('e', E.str('RAISE')),
      ...pushT('e', E.str('PUSHK'), E.var('kci')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lst')),
      ...pushT('j', E.str('JMP'), E.var('lnd')),
      ...pushT('e', E.str('PUSHV'), E.str('__nxv')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('STOREV'), E.str('__nxv')),
      ...pushT('j', E.str('NCHK'), E.var('lst')),
      ...pushT('j', E.str('NEXT'), E.var('lst')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
    ];
  }
  function compStmt() {
    const nd = () => E.var('cnd');
    return [
      // pushed first => executed last: close the comprehension scope after the value is built
      ...pushT('e', E.str('LCEND')),
      S.chg('lcTop', E.num(1)),
      S.If(E.lt(E.var('lcTop'), E.num(10)),
        [S.set('lcnam', E.join(E.str('__lcacc0'), E.var('lcTop')))],
        [S.set('lcnam', E.join(E.str('__lcacc'), E.var('lcTop')))]),
      S.set('lcak', E.join(E.var('lcnam'), E.str('|000000000'))),
      S.chg('labTop', E.num(2)),
      S.set('lcl', E.sub(E.var('labTop'), E.num(1))),
      S.set('lce', E.var('labTop')),
      ...pushT('e', E.str('DELV'), E.var('lcak')),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lce')),
      ...pushT('j', E.str('JMP'), E.var('lcl')),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('METH'), E.str('append|000000'), E.num(2)),
      ...pushT('n', Ch(nd(), E.num(3))),
      ...pushT('e', E.str('PUSHV'), E.var('lcak')),
      ...pushT('e', E.str('STOREV'), NdA(Ch(nd(), E.num(2)))),
      ...pushT('j', E.str('NEXT'), E.var('lce')),
      ...pushT('l', E.var('lcl')),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
      ...pushT('e', E.str('STOREV'), E.var('lcak')),
      ...pushT('e', E.str('BUILD'), E.str('L|0')),
      // pushed last => executed first: open the comprehension scope before the container
      ...pushT('e', E.str('LCBEGIN')),
    ];
  }
  // ---------------- chained comparison ----------------
  // a < b < c  ->  <a> <b> CMPK <   JZ lf   <c> BIN <   JMP le   lf: POP PUSHK False   le:
  // Every operand is evaluated at most once (CMPK leaves the right operand on the stack for
  // the next link) and the chain short-circuits exactly like Python's implicit `and`.
  function compChain() {
    const nd = () => E.var('cnd');
    // operator number i (1-based) out of NdA 'a,b,c|n'
    const opI = (i, dst) => [
      S.set(dst, E.str('')), S.set('j', E.num(1)), S.set('k3', E.num(1)), S.set('cst', E.num(0)),
      S.Until(E.or(E.gt(E.var('j'), E.slen(NdA(nd()))), E.eq(E.var('cst'), E.num(1))), [
        S.If(E.eq(E.letter(E.var('j'), NdA(nd())), E.str('|')), [S.set('cst', E.num(1))], [
          S.If(E.eq(E.letter(E.var('j'), NdA(nd())), E.str(',')), [S.chg('k3', E.num(1))], [
            S.If(E.eq(E.var('k3'), i), [S.set(dst, E.join(E.var(dst), E.letter(E.var('j'), NdA(nd()))))]),
          ]),
        ]),
        S.chg('j', E.num(1)),
      ]),
    ];
    return [
      S.chg('labTop', E.num(2)),
      S.set('clf', E.sub(E.var('labTop'), E.num(1))),
      S.set('cle', E.var('labTop')),
      S.set('cnv', NdN(nd())),
      // the tail runs last, so it is pushed first.  On the false path the stack still holds
      // [.., B0, operand]; dropping the operand leaves exactly the B0 result.
      ...pushT('l', E.var('cle')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('clf')),
      ...pushT('j', E.str('JMP'), E.var('cle')),
      // last link consumes both of its operands
      ...opI(E.sub(E.var('cnv'), E.num(1)), 'cop1'),
      ...pushT('e', E.str('BIN'), E.var('cop1')),
      ...pushT('n', Ch(nd(), E.sub(E.var('cnv'), E.num(1)))),
      // middle links keep the shared operand
      S.set('i', E.sub(E.var('cnv'), E.num(2))),
      S.Until(E.lt(E.var('i'), E.num(1)), [
        ...pushT('j', E.str('CKJZ'), E.var('clf')),
        ...opI(E.var('i'), 'cop2'),
        ...pushT('e', E.str('CMPK'), E.var('cop2')),
        ...pushT('n', Ch(nd(), E.var('i'))),
        S.chg('i', E.num(-1)),
      ]),
      ...pushT('n', Ch(nd(), E.num(0))),
    ];
  }

  // ---------------- node visitor ----------------
  function visit() {
    const nd = () => E.var('cnd');
    const ck = () => E.var('ck');
    // children live at NdC[NdS + 0 .. NdS + NdN - 1]; push them last-to-first
    const kidsRev = (from) => [
      S.set('j', E.sub(NdN(nd()), E.num(1))),
      S.Until(E.lt(E.var('j'), E.num(from)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
    ];
    // kidsRev pushes children in reverse order; call AFTER pushing the emit task
    return [
      S.set('cnd', E.item('CtA', E.var('csSp'))),
      S.chg('csSp', E.num(-1)),
      S.set('cline', E.item('NdL', E.var('cnd'))),
      S.set('ck', NdK(E.var('cnd'))),
      S.If(E.eq(ck(), E.str('lit')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('PUSHK'), E.var('kci'))]),
      S.If(E.eq(ck(), E.str('name')), [...pushT('e', E.str('PUSHV'), NdA(nd()))]),
      S.If(E.eq(ck(), E.str('bin')), [
        ...pushT('e', E.str('BIN'), NdA(nd())), ...kidsRev(0),
      ]),
      S.If(E.eq(ck(), E.str('un')), [
        ...pushT('e', E.str('UN'), NdA(nd())), ...kidsRev(0),
      ]),
      S.If(E.eq(ck(), E.str('cmp')), [compChain()]),
      S.If(E.eq(ck(), E.str('call')), [
        S.If(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),
          E.and(
            E.or(E.or(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc|0000')),
              E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lcif|000000'))),
              E.or(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')),
                E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')))),
            E.and(E.ge(NdN(nd()), E.num(4)), E.le(NdN(nd()), E.num(7))))), [
          S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__dc|0000')), [...compDict()], [
            S.If(E.eq(NdA(Ch(nd(), E.num(0))), E.str('__lc2|00000')), [...compNest()], [
              S.If(E.eq(NdN(nd()), E.num(5)), [...compIfStmt()], [...compStmt()]),
            ]),
          ]),
        ], [
        S.If(E.and(E.ge(NdN(nd()), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr'))), [
          ...pushT('e', E.str('METH'), NdA(Ch(nd(), E.num(0))), NdN(nd())),
          S.set('j', E.sub(NdN(nd()), E.num(1))),
          S.Until(E.lt(E.var('j'), E.num(1)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
          ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
        ], [
          S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),
            E.eq(NdA(Ch(nd(), E.num(0))), E.str('next|0000'))), E.eq(NdN(nd()), E.num(2))), [
            ...compNext(),
          ], [
          S.If(E.and(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')),
            E.eq(NdA(Ch(nd(), E.num(0))), E.str('sorted|000000'))),
            E.and(E.contains(NdA(nd()), E.str('key|000')),
              E.or(E.eq(NdN(nd()), E.num(3)), E.and(E.eq(NdN(nd()), E.num(4)), E.contains(NdA(nd()), E.str('reverse|0000000')))))), [
            ...compKeySort(),
          ], [
            ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0),
          ]),
          ]),
        ]),
        ]),
      ]),
      S.If(E.eq(ck(), E.str('tern')), [
        S.chg('labTop', E.num(2)),
        S.set('l1', E.sub(E.var('labTop'), E.num(1))),
        S.set('l2', E.var('labTop')),
        ...pushT('l', E.var('l2')),
        ...pushT('n', Ch(nd(), E.num(2))),
        ...pushT('l', E.var('l1')),
        ...pushT('j', E.str('JMP'), E.var('l2')),
        ...pushT('n', Ch(nd(), E.num(0))),
        ...pushT('j', E.str('JZ'), E.var('l1')),
        ...pushT('n', Ch(nd(), E.num(1))),
      ]),
      S.If(E.eq(ck(), E.str('attr')), [...pushT('e', E.str('GETATTR'), NdA(nd())), ...kidsRev(0)]),
      S.If(E.eq(ck(), E.str('sub')), [...pushT('e', E.str('SUBS'), NdA(nd())), ...kidsRev(0)]),
      S.If(E.eq(ck(), E.str('list')), [...pushT('e', E.str('BUILD'), E.join(E.str('L'), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0)]),
      S.If(E.eq(ck(), E.str('tuple')), [...pushT('e', E.str('BUILD'), E.join(E.str('T'), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0)]),
      S.If(E.eq(ck(), E.str('dict')), [...pushT('e', E.str('BUILD'), E.join(E.str('D'), E.join(E.str('|'), NdN(nd())))), ...kidsRev(0)]),

      S.If(E.eq(ck(), E.str('suite')), [...pushSuite(nd())]),
      S.If(E.eq(ck(), E.str('expr')), [...pushT('e', E.str('POP')), ...kidsRev(0)]),
      S.If(E.eq(ck(), E.str('assign')), [assignStmt()]),
      S.If(E.eq(ck(), E.str('ret')), [
        ...pushT('e', E.str('RET')),
        S.If(E.ge(NdN(nd()), E.num(1)), [...pushT('n', Ch(nd(), E.num(0)))],
          [...addK(E.str('Z'), 'kci'), ...pushT('e', E.str('PUSHK'), E.var('kci'))]),
      ]),
      S.If(E.eq(ck(), E.str('yield')), [
        ...pushT('e', E.str('YIELD')),
        S.If(E.ge(NdN(nd()), E.num(1)), [...pushT('n', Ch(nd(), E.num(0)))], [
          ...addK(E.str('Z'), 'kci'),
          ...pushT('e', E.str('PUSHK'), E.var('kci')),
        ]),
      ]),
      S.If(E.eq(ck(), E.str('pass')), [...pushT('e', E.str('NOP'))]),
      S.If(E.eq(ck(), E.str('break')), [
        S.If(E.le(E.var('lpSp'), E.num(0)), [...L.failAt(E.str('SyntaxError: break outside loop'), E.num(0))], [
          S.set('j', E.item('LpExt', E.var('lpSp'))),
          S.Until(E.le(E.var('j'), E.num(0)), [...pushT('e', E.str('POP')), S.chg('j', E.num(-1))]),
          ...pushT('j', E.str('JMP'), E.item('LpBrk', E.var('lpSp'))),
        ]),
      ]),
      S.If(E.eq(ck(), E.str('cont')), [
        S.If(E.le(E.var('lpSp'), E.num(0)), [...L.failAt(E.str('SyntaxError: continue outside loop'), E.num(0))],
          [...pushT('j', E.str('JMP'), E.item('LpCon', E.var('lpSp')))]),
      ]),
      S.If(E.eq(ck(), E.str('if')), [ifStmt()]),
      S.If(E.eq(ck(), E.str('while')), [loopStmt()]),
      S.If(E.eq(ck(), E.str('for')), [forStmt()]),
      S.If(E.eq(ck(), E.str('def')), [defStmt(E.str('DEF'))]),
      S.If(E.eq(ck(), E.str('lam')), [defStmt(E.str('LAMBDA'))]),
      S.If(E.eq(ck(), E.str('class')), [defStmt(E.str('CLASS'))]),
      S.If(E.eq(ck(), E.str('glob')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('GLOBAL'), E.var('kci'))]),
      S.If(E.eq(ck(), E.str('nonloc')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('NONLOCAL'), E.var('kci'))]),
      S.If(E.eq(ck(), E.str('del')), [
        S.If(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')), [...pushT('e', E.str('DELV'), NdA(Ch(nd(), E.num(0))))], [
          S.If(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('sub')), E.eq(NdN(Ch(nd(), E.num(0))), E.num(2))), [
            ...pushT('e', E.str('DELIDX')),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(1))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
          ], [
            ...L.failAt(E.str('SyntaxError: del needs a name'), E.num(0)),
          ]),
        ]),
      ]),
      S.If(E.eq(ck(), E.str('asrt')), [
        ...pushT('e', E.str('ASRT')),
        ...pushT('n', Ch(nd(), E.num(0))),
        S.If(E.and(E.ge(NdN(nd()), E.num(2)), E.gt(Ch(nd(), E.num(1)), E.num(0))), [...pushT('n', Ch(nd(), E.num(1)))],
          [...addK(E.str('Z'), 'kci'), ...pushT('e', E.str('PUSHK'), E.var('kci'))]),
      ]),
      S.If(E.eq(ck(), E.str('raise')), [
        S.If(E.ge(NdN(nd()), E.num(1)), [
          ...pushT('e', E.str('RAISE')),
          ...pushT('n', Ch(nd(), E.num(0))),
        ], [
          // bare raise re-raises the active exception (RuntimeError when there is none)
          ...pushT('e', E.str('RAISEN')),
        ]),
      ]),
      S.If(E.eq(ck(), E.str('import')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('IMPORT'), E.var('kci'))]),
      S.If(E.eq(ck(), E.str('from')), [...addK(NdA(nd()), 'kci'), ...pushT('e', E.str('IMPORTFROM'), E.var('kci'))]),
      S.If(E.eq(ck(), E.str('try')), [tryStmt()]),
      S.If(E.eq(ck(), E.str('with')), [withStmt()]),
    ];
  }

  function assignStmt() {
    const nd = () => E.var('cnd');
    return [
      S.set('nt', NdN(nd())),
      S.set('aop', NdA(nd())),
      S.set('j', E.slen(E.var('aop'))), S.set('nc', E.str('')),
      S.Until(E.le(E.var('j'), E.num(0)), [
        S.If(E.eq(E.letter(E.var('j'), E.var('aop')), E.str('|')), [
          S.set('k2', E.add(E.var('j'), E.num(1))),
          S.Until(E.gt(E.var('k2'), E.slen(E.var('aop'))), [
            S.set('nc', E.join(E.var('nc'), E.letter(E.var('k2'), E.var('aop')))),
            S.chg('k2', E.num(1)),
          ]),
        ]),
        S.chg('j', E.num(-1)),
      ]),
      S.set('aop2', E.str('')), S.set('j', E.num(1)),
      S.Until(E.or(E.gt(E.var('j'), E.slen(E.var('aop'))),
        E.eq(E.letter(E.var('j'), E.var('aop')), E.str('|'))), [
        S.set('aop2', E.join(E.var('aop2'), E.letter(E.var('j'), E.var('aop')))),
        S.chg('j', E.num(1)),
      ]),
      S.set('aop', E.var('aop2')),
      S.If(E.eq(E.var('aop'), E.str('u')), [
        // executed: value, [DUP,PUSHN i,SUBS,s_i]..., POP  -> push reversed
        ...pushT('e', E.str('POP')),
        S.set('j', E.sub(E.var('nc'), E.num(1))),
        S.Until(E.lt(E.var('j'), E.num(0)), [
          ...pushT('s', Ch(nd(), E.var('j'))),
          ...pushT('e', E.str('SUBS'), E.str('i')),
          ...pushT('e', E.str('PUSHN'), E.var('j')),
          ...pushT('e', E.str('DUP')),
          S.chg('j', E.num(-1)),
        ]),
        ...pushT('n', Ch(nd(), E.var('nc'))),
      ], [
      S.If(E.not(E.eq(E.var('aop'), E.str('='))), [
        S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('name'))), [
          S.set('nm', NdA(Ch(nd(), E.num(0)))),
          ...pushT('e', E.str('STOREV'), E.var('nm')),
          ...pushT('e', E.str('BIN'), E.var('aop')),
          ...pushT('n', Ch(nd(), E.num(1))),
          ...pushT('e', E.str('PUSHV'), E.var('nm')),
        ], [
          S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('sub')),
            E.eq(NdN(Ch(nd(), E.num(0))), E.num(2)))), [
            // stack must end as [obj, idx, newval]; the target is evaluated twice
            // executed: obj, idx, obj, idx, SUBS, rhs, BIN, SUBSSET
            ...pushT('e', E.str('SUBSSET'), NdA(Ch(nd(), E.num(0)))),
            ...pushT('e', E.str('BIN'), E.var('aop')),
            ...pushT('n', Ch(nd(), E.num(1))),
            ...pushT('e', E.str('SUBS'), E.str('i')),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(1))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(1))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
          ], [
            S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr'))), [
              // executed: obj, obj, GETATTR, rhs, BIN, SETATTR  -> [obj, newval]
              ...pushT('e', E.str('SETATTR'), NdA(Ch(nd(), E.num(0)))),
              ...pushT('e', E.str('BIN'), E.var('aop')),
              ...pushT('n', Ch(nd(), E.num(1))),
              ...pushT('e', E.str('GETATTR'), NdA(Ch(nd(), E.num(0)))),
              ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
              ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
            ], [L.failAt(E.str('SyntaxError: unsupported augmented assignment'), E.num(0))]),
          ]),
        ]),
      ], [
        S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('sub'))), [
          ...pushT('e', E.str('SUBSSET'), NdA(Ch(nd(), E.num(0)))),
          ...pushT('n', Ch(nd(), E.num(1))),
          ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(1))),
          ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
        ], [
          S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr'))), [
            ...pushT('e', E.str('SETATTR'), NdA(Ch(nd(), E.num(0)))),
            ...pushT('n', Ch(nd(), E.num(1))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
          ], [
            // executed: value, DUP*(nc-1), store t0, store t1, ...  -> push reversed
            S.set('j', E.sub(E.var('nc'), E.num(1))),
            S.Until(E.lt(E.var('j'), E.num(0)), [...pushT('s', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
            S.set('j', E.num(1)),
            S.Until(E.ge(E.var('j'), E.var('nc')), [...pushT('e', E.str('DUP')), S.chg('j', E.num(1))]),
            ...pushT('n', Ch(nd(), E.var('nc'))),
          ]),
        ]),
      ]),
      ]),
    ];
  }

  function storeTarget() {
    return [
      S.If(E.eq(NdK(E.var('tg')), E.str('name')), [
        ...emit('STOREV', NdA(E.var('tg'))),
      ], [
        S.If(E.eq(NdK(E.var('tg')), E.str('sub')), [
          ...pushT('e', E.str('SUBSSET'), NdA(E.var('tg'))),
          ...pushT('n', Ch(E.var('tg'), E.num(1))),
          ...pushT('n', Ch(E.var('tg'), E.num(0))),
        ], [
          S.If(E.eq(NdK(E.var('tg')), E.str('attr')), [
            ...pushT('e', E.str('SETATTR'), NdA(E.var('tg'))),
            ...pushT('n', Ch(E.var('tg'), E.num(0))),
          ], [
            S.If(E.and(E.eq(NdK(E.var('tg')), E.str('tuple')), E.eq(NdN(E.var('tg')), E.num(1))), [
              ...pushT('s', Ch(E.var('tg'), E.num(0))),
            ], [L.failAt(E.str('SyntaxError: bad assignment target'), E.num(0))]),
          ]),
        ]),
      ]),
    ];
  }

  function ifStmt() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(2)),
      S.set('l1', E.sub(E.var('labTop'), E.num(1))),
      S.set('l2', E.var('labTop')),
      // executed: cond, JZ l1, body, JMP l2, l1, else, l2  -> push reversed
      ...pushT('l', E.var('l2')),
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      ...pushT('l', E.var('l1')),
      ...pushT('j', E.str('JMP'), E.var('l2')),
      S.If(E.ge(NdN(nd()), E.num(2)), [...pushT('n', Ch(nd(), E.num(1)))]),
      ...pushT('j', E.str('JZ'), E.var('l1')),
      ...pushT('n', Ch(nd(), E.num(0))),
    ];
  }

  function loopStmt() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(3)),
      S.set('lc', E.sub(E.var('labTop'), E.num(2))),
      S.set('lx', E.sub(E.var('labTop'), E.num(1))),
      S.set('lb', E.var('labTop')),
      // executed: l0, pushloop, cond, JZ lx, body, JMP l0, lx, poploop, else, lb
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      ...pushT('l', E.var('lb')),
      ...pushT('q'),
      ...pushT('l', E.var('lx')),
      ...pushT('j', E.str('JMP'), E.var('lc')),
      S.If(E.ge(NdN(nd()), E.num(2)), [...pushT('n', Ch(nd(), E.num(1)))]),
      ...pushT('j', E.str('JZ'), E.var('lx')),
      ...pushT('n', Ch(nd(), E.num(0))),
      ...pushT('p', E.var('lc'), E.var('lb'), E.num(0)),
      ...pushT('l', E.var('lc')),
    ];
  }

  function forStmt() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(3)),
      S.set('lc', E.sub(E.var('labTop'), E.num(2))),
      S.set('lx', E.sub(E.var('labTop'), E.num(1))),
      S.set('lb', E.var('labTop')),
      // executed: iter, ITER, pushloop, l0, NEXT lx, store, body, JMP l0, lx, POP, POP, poploop, else, lb
      ...pushT('l', E.var('lb')),
      S.If(E.ge(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))]),
      ...pushT('q'),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lx')),
      ...pushT('j', E.str('JMP'), E.var('lc')),
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      S.If(E.and(E.eq(NdK(Ch(nd(), E.num(0))), E.str('tuple')), E.gt(NdN(Ch(nd(), E.num(0))), E.num(1))), [
        S.set('tgu', Ch(nd(), E.num(0))),
        ...pushT('e', E.str('DELV'), E.str('__up|0000')),
        S.set('i', E.sub(NdN(E.var('tgu')), E.num(1))),
        S.Until(E.lt(E.var('i'), E.num(0)), [
          ...pushT('s', Ch(E.var('tgu'), E.var('i'))),
          ...pushT('e', E.str('SUBS'), E.str('i')),
          ...addK(E.var('i'), 'kci2'),
          ...pushT('e', E.str('PUSHK'), E.var('kci2')),
          ...pushT('e', E.str('PUSHV'), E.str('__up|0000')),
          S.chg('i', E.num(-1)),
        ]),
        ...pushT('e', E.str('STOREV'), E.str('__up|0000')),
      ], [
        ...pushT('s', Ch(nd(), E.num(0))),
      ]),
      ...pushT('j', E.str('NCHK'), E.var('lx')),
      ...pushT('j', E.str('NEXT'), E.var('lx')),
      ...pushT('l', E.var('lc')),
      ...pushT('p', E.var('lc'), E.var('lb'), E.num(2)),
      ...pushT('e', E.str('ITER')),
      ...pushT('n', Ch(nd(), E.num(1))),
    ];
  }

  function defStmt(opKind) {
    const nd = () => E.var('cnd');
    return [
      S.If(E.eq(opKind, E.str('CLASS')),
        [...addK(E.join(E.str('#'), NdA(nd())), 'kci')],
        [...addK(NdA(nd()), 'kci')]),
      S.If(E.eq(NdG(nd()), E.str('g')), [S.set('dgen', E.str('GDEF'))], [S.set('dgen', opKind)]),
      S.set('dspec', NdA(nd())), S.set('dname', E.str('')), S.set('dseen', E.num(0)), S.set('j', E.num(1)),
      S.Until(E.gt(E.var('j'), E.slen(E.var('dspec'))), [
        S.If(E.eq(E.letter(E.var('j'), E.var('dspec')), E.str('#')), [S.set('dseen', E.num(1))], [
          S.If(E.eq(E.var('dseen'), E.num(1)),
            [S.set('dname', E.join(E.var('dname'), E.letter(E.var('j'), E.var('dspec'))))]),
        ]),
        S.chg('j', E.num(1)),
      ]),
      S.chg('labTop', E.num(2)),
      S.set('lbody', E.sub(E.var('labTop'), E.num(1))),
      S.set('laft', E.var('labTop')),
      // executed: JMP laft, lbody, body, RETN, laft, DEF k lbody, STOREV name
      S.If(E.not(E.eq(opKind, E.str('LAMBDA'))), [...pushT('e', E.str('STOREV'), E.var('dname'))]),
      ...pushT('d', E.var('dgen'), E.var('kci'), E.var('lbody')),
      ...pushT('l', E.var('laft')),
      S.If(E.eq(opKind, E.str('CLASS')), [
        ...pushT('e', E.str('RETN')),
      ], [
        ...addK(E.str('Z'), 'kci2'),
        ...pushT('e', E.str('RET')),
        ...pushT('e', E.str('PUSHK'), E.var('kci2')),
      ]),
      ...pushSuite(Ch(nd(), E.num(0))),
      ...pushT('l', E.var('lbody')),
      ...pushT('j', E.str('JMP'), E.var('laft')),
    ];
  }

  function tryStmt() {
    const nd = () => E.var('cnd');
    const has = (i) => S.If(E.not(E.eq(Ch(nd(), E.num(i)), E.num(0))), []);
    const t = [];
    // finally, then lend, then handlers (0..3), then RERAISE, then lh, then JMP lend, else, ENDTRY, body, TRY lh
    t.push(has(10));
    t.push(S.If(E.not(E.eq(Ch(nd(), E.num(10)), E.num(0))), [...pushT('n', Ch(nd(), E.num(10)))]));
    t.push(...pushT('l', E.var('lend')));
    t.push(...pushT('e', E.str('RERAISE')));
    for (let i = 3; i >= 0; i--) t.push(...handlerBlock(i));
    t.push(...pushT('l', E.var('lh')));
    t.push(...pushT('j', E.str('JMP'), E.var('lend')));
    t.push(S.If(E.not(E.eq(Ch(nd(), E.num(9)), E.num(0))), [...pushT('n', Ch(nd(), E.num(9)))]));
    t.push(...pushT('e', E.str('ENDTRY')));
    t.push(...pushSuite(Ch(nd(), E.num(0))));
    t.push(...pushT('j', E.str('TRY'), E.var('lh')));
    return [
      S.chg('labTop', E.num(6)),
      S.set('lh', E.sub(E.var('labTop'), E.num(5))),
      S.set('lend', E.sub(E.var('labTop'), E.num(4))),
      ...t,
    ];
  }

  function handlerBlock(i) {
    const nd = () => E.var('cnd');
    const ty = Ch(nd(), E.num(1 + i * 2));
    const body = Ch(nd(), E.num(2 + i * 2));
    const lab = E.sub(E.add(E.var('labTop'), E.num(i)), E.num(3));
    return [
      S.If(E.not(E.eq(ty, E.num(0))), [
        ...pushT('l', lab),
        ...pushT('j', E.str('JMP'), E.var('lend')),
        ...pushT('e', E.str('XCLR')),
        ...pushT('n', body),
        S.If(E.eq(NdK(ty), E.str('excas')),
          [...pushT('e', E.str('STOREV'), NdA(Ch(ty, E.num(1))))],
          [...pushT('e', E.str('POP'))]),
        ...pushT('j', E.str('JZ'), lab),
        ...pushT('e', E.str('ISINST')),
        S.If(E.eq(NdK(ty), E.str('excas')),
          [...pushT('n', Ch(ty, E.num(0)))],
          [...pushT('n', ty)]),
        // two DUPs: one copy is parked in actEx (for a bare raise), the other is what
        // ISINST consumes as the value under test
        ...pushT('e', E.str('XSET')),
        ...pushT('e', E.str('DUP')),
        ...pushT('e', E.str('DUP')),
      ]),
    ];
  }

  return [
    S.ldelall('Iop'), S.ldelall('Ia'), S.ldelall('Ib'), S.ldelall('Iline'), S.ldelall('Kval'),
    S.ldelall('PdL'), S.ldelall('PdS'), S.ldelall('PdF'), S.ldelall('Lpc'),
    S.set('pdSp', E.num(0)), S.set('csSp', E.num(0)), S.set('lpSp', E.num(0)), S.set('labTop', E.num(0)),
    S.set('cline', E.num(0)), S.set('curLine', E.num(0)),
    ...pushT('n', E.var('rootNd')),
    S.Until(E.or(E.le(E.var('csSp'), E.num(0)), E.not(E.eq(E.var('err'), E.str('')))), [
      S.set('ct0', E.item('CtK', E.var('csSp'))),
      S.If(E.eq(E.var('ct0'), E.str('n')), [...visit()], [
        S.If(E.eq(E.var('ct0'), E.str('e')), [
          S.set('cop', E.item('CtA', E.var('csSp'))),
          S.set('car', E.item('CtB', E.var('csSp'))),
          S.set('cax', E.item('CtC', E.var('csSp'))),
          S.chg('csSp', E.num(-1)),
          ...emit(E.var('cop'), E.var('car'), E.var('cax')),
        ], [
          S.If(E.eq(E.var('ct0'), E.str('j')), [
            S.set('cop', E.item('CtA', E.var('csSp'))),
            S.set('car', E.item('CtB', E.var('csSp'))),
            S.chg('csSp', E.num(-1)),
            ...doJump(E.var('cop'), E.var('car')),
          ], [
            S.If(E.eq(E.var('ct0'), E.str('l')), [
              S.set('car', E.item('CtA', E.var('csSp'))),
              S.chg('csSp', E.num(-1)),
              ...doLabel(E.var('car')),
            ], [
              S.If(E.eq(E.var('ct0'), E.str('d')), [
                S.set('cop', E.item('CtA', E.var('csSp'))),
                S.set('car', E.item('CtB', E.var('csSp'))),
                S.set('ca2', E.item('CtC', E.var('csSp'))),
                S.chg('csSp', E.num(-1)),
                  ...doDef(E.var('cop'), E.var('car'), E.var('ca2')),
              ], [
                S.If(E.eq(E.var('ct0'), E.str('p')), [
                  S.set('car', E.item('CtA', E.var('csSp'))),
                  S.set('ca2', E.item('CtB', E.var('csSp'))),
                  S.set('ca3', E.item('CtC', E.var('csSp'))),
                  S.chg('csSp', E.num(-1)),
                  ...L.pushRow('lpSp', [['LpCon', E.var('car')], ['LpBrk', E.var('ca2')], ['LpExt', E.var('ca3')]]),
                ], [
                  S.If(E.eq(E.var('ct0'), E.str('q')), [
                    S.chg('csSp', E.num(-1)), S.chg('lpSp', E.num(-1)),
                  ], [
                    S.If(E.eq(E.var('ct0'), E.str('s')), [
                      S.set('tg', E.item('CtA', E.var('csSp'))),
                      S.chg('csSp', E.num(-1)),
                      ...storeTarget(),
                    ], [
                      L.failAt(E.join(E.str('CompilerError: bad task '), E.join(E.var('ct0'), E.join(E.str('/'), E.item('CtA', E.var('csSp'))))), E.num(0)),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    ...emit('HALT'),
  ];
}

function setup(em) { em.defineProc('Interpreter', 'compile_all', [], () => build(), true); }
module.exports = { build: build, setup: setup };
