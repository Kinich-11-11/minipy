'use strict';
/**
 * v5 Compiler - explicit task/work stack, post-order emission, label backpatching.
 * Tasks: n visit node | e emit | j jump-to-label | l define label
 *        d def/class/lambda | p push loop ctx | q pop loop ctx | s store-to-target
 */
const { E, S } = require('../dsl.js');
const A = require('./ast.js');
const L = require('./lib.js');
const U = require('./astutil.js');

const NdK = (nd) => E.item('NdK', nd);
const NdA = (nd) => E.item('NdA', nd);
const NdN = (nd) => E.item('NdN', nd);
const Ch = (nd, k) => E.item('NdC', E.add(E.item('NdS', nd), E.num(k)));
const heapGet = U.heapGet;

function build() {
  const pushT = (k, a, b, c) => L.pushRow('csSp', [
    ['CtK', E.str(k)], ['CtA', a],
    ['CtB', b === undefined ? E.str('') : b],
    ['CtC', c === undefined ? E.str('') : c]]);
  const emit = (op, a, b) => [
    S.ladd('Iop', E.str(op)),
    S.ladd('Ia', a === undefined ? E.str('') : a),
    S.ladd('Ib', b === undefined ? E.str('') : b),
    S.ladd('Iline', E.num(0)),
  ];
  const herePc = () => E.add(E.len('Iop'), E.num(1));
  const addK = (v) => [S.ladd('Kval', v), S.set('kci', E.len('Kval'))];
  const pushSuite = (suiteNd) => [
    S.set('j', E.item('LCount', NdA(suiteNd))),
    S.Until(E.le(E.var('j'), E.num(0)), [
      ...pushT('n', heapGet(NdA(suiteNd), E.var('j'))),
      S.chg('j', E.num(-1)),
    ]),
  ];
  // jump with a pending patch on Ia
  const doJump = (op, lab) => [
    S.ladd('Iop', E.str(op)), S.ladd('Ia', E.num(0)), S.ladd('Ib', E.str('')), S.ladd('Iline', E.num(0)),
    ...L.pushRow('pdSp', [['PdL', lab], ['PdS', E.len('Iop')], ['PdF', E.num(0)]]),
  ];
  const doDef = (op, kidx, lab) => [
    S.ladd('Iop', E.str(op)), S.ladd('Ia', kidx), S.ladd('Ib', E.num(0)), S.ladd('Iline', E.num(0)),
    ...L.pushRow('pdSp', [['PdL', lab], ['PdS', E.len('Iop')], ['PdF', E.num(1)]]),
  ];
  const doLabel = (lab) => [
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
  const storeTarget = () => [
    S.set('tg', E.item('CtA', E.var('csSp'))),
    S.If(E.eq(NdK(E.var('tg')), E.str('name')), [
      ...emit('STOREV', NdA(E.var('tg'))),
    ], [
      S.If(E.eq(NdK(E.var('tg')), E.str('sub')), [
        ...pushT('n', Ch(E.var('tg'), E.num(0))),
        ...pushT('n', Ch(E.var('tg'), E.num(1))),
        ...pushT('e', E.str('SUBSSET'), NdA(E.var('tg'))),
      ], [
        S.If(E.eq(NdK(E.var('tg')), E.str('attr')), [
          ...pushT('n', Ch(E.var('tg'), E.num(0))),
          ...pushT('e', E.str('SETATTR'), NdA(E.var('tg'))),
        ], [L.failAt(E.str('SyntaxError: bad assignment target'), E.num(0))]),
      ]),
    ]),
  ];

  function visit() {
    const nd = () => E.var('cnd');
    const ck = () => E.var('ck');
    const is = (t) => S.If(E.eq(ck(), E.str(t)), []);
    return [
      S.set('cnd', E.item('CtA', E.var('csSp'))),
      S.chg('csSp', E.num(-1)),
      S.set('ck', NdK(E.var('cnd'))),

      // ---------------- expressions ----------------
      is('lit'),
      S.If(E.eq(ck(), E.str('lit')), [...addK(NdA(nd())), S.set('t7', E.var('kci')), ...pushT('e', E.str('PUSHK'), E.var('t7'))]),
      S.If(E.eq(ck(), E.str('name')), [...pushT('e', E.str('PUSHV'), NdA(nd()))]),

      S.If(E.eq(ck(), E.str('bin')), [
        ...pushT('e', E.str('BIN'), NdA(nd())),
        ...pushT('n', Ch(nd(), E.num(1))),
        ...pushT('n', Ch(nd(), E.num(0))),
      ]),
      S.If(E.eq(ck(), E.str('un')), [
        ...pushT('e', E.str('UN'), NdA(nd())),
        ...pushT('n', Ch(nd(), E.num(0))),
      ]),
      S.If(E.eq(ck(), E.str('cmp')), [
        ...pushT('e', E.str('CMP'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))),
        S.set('j', NdN(nd())),
        S.Until(E.le(E.var('j'), E.num(0)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
      ]),
      S.If(E.eq(ck(), E.str('call')), [
        ...pushT('e', E.str('CALL'), E.join(NdA(nd()), E.join(E.str('|'), NdN(nd())))),
        S.set('j', NdN(nd())),
        S.Until(E.le(E.var('j'), E.num(0)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
      ]),
      S.If(E.eq(ck(), E.str('attr')), [
        ...pushT('e', E.str('GETATTR'), NdA(nd())),
        ...pushT('n', Ch(nd(), E.num(0))),
      ]),
      S.If(E.eq(ck(), E.str('sub')), [
        ...pushT('e', E.str('SUBS'), NdA(nd())),
        S.set('j', NdN(nd())),
        S.Until(E.le(E.var('j'), E.num(0)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
      ]),
      S.If(E.or(E.eq(ck(), E.str('list')), E.or(E.eq(ck(), E.str('tuple')), E.eq(ck(), E.str('dict')))), [
        ...pushT('e', E.str('BUILD'), E.item('NdK', nd())),
        S.set('j', NdN(nd())),
        S.Until(E.le(E.var('j'), E.num(0)), [...pushT('n', Ch(nd(), E.var('j'))), S.chg('j', E.num(-1))]),
      ]),

      // ---------------- statements ----------------
      S.If(E.eq(ck(), E.str('suite')), [...pushSuite(nd())]),
      S.If(E.eq(ck(), E.str('expr')), [
        ...pushT('e', E.str('POP')),
        ...pushT('n', Ch(nd(), E.num(0))),
      ]),
      S.If(E.eq(ck(), E.str('assign')), [assignStmt()]),
      S.If(E.eq(ck(), E.str('ret')), [
        ...pushT('e', E.str('RET')),
        S.If(E.ge(NdN(nd()), E.num(1)), [...pushT('n', Ch(nd(), E.num(0)))],
          [...addK(E.str('Z')), S.set('t7', E.var('kci')), ...pushT('e', E.str('PUSHK'), E.var('t7'))]),
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
      S.If(E.eq(ck(), E.str('while')), [loopStmt(E.str('while'))]),
      S.If(E.eq(ck(), E.str('for')), [forStmt()]),
      S.If(E.eq(ck(), E.str('def')), [defStmt(E.str('DEF'))]),
      S.If(E.eq(ck(), E.str('lam')), [defStmt(E.str('LAMBDA'))]),
      S.If(E.eq(ck(), E.str('class')), [defStmt(E.str('CLASS'))]),
      S.If(E.or(E.eq(ck(), E.str('global')), E.eq(ck(), E.str('nonloc'))), [
        ...addK(NdA(nd())), S.set('t7', E.var('kci')),
        ...pushT('e', E.if ? E.str('GLOBAL') : E.str('GLOBAL'), E.var('t7')),
      ]),
      S.If(E.eq(ck(), E.str('del')), [
        S.If(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')), [...pushT('e', E.str('DELV'), NdA(Ch(nd(), E.num(0))))],
          [...L.failAt(E.str('SyntaxError: del needs a name'), E.num(0))]),
      ]),
      S.If(E.eq(ck(), E.str('asrt')), [
        ...pushT('e', E.str('ASRT')),
        S.If(E.ge(NdN(nd()), E.num(2)), [...pushT('n', Ch(nd(), E.num(1)))],
          [...addK(E.str('Z')), S.set('t7', E.var('kci')), ...pushT('e', E.str('PUSHK'), E.var('t7'))]),
        ...pushT('n', Ch(nd(), E.num(0))),
      ]),
      S.If(E.eq(ck(), E.str('raise')), [
        ...pushT('e', E.str('RAISE')),
        S.If(E.ge(NdN(nd()), E.num(1)), [...pushT('n', Ch(nd(), E.num(0)))],
          [...addK(E.str('Z')), S.set('t7', E.var('kci')), ...pushT('e', E.str('PUSHK'), E.var('t7'))]),
      ]),
      S.If(E.eq(ck(), E.str('import')), [...addK(NdA(nd())), S.set('t7', E.var('kci')), ...pushT('e', E.str('IMPORT'), E.var('t7'))]),
      S.If(E.eq(ck(), E.str('from')), [...addK(NdA(nd())), S.set('t7', E.var('kci')), ...pushT('e', E.str('IMPORTFROM'), E.var('t7'))]),
      S.If(E.eq(ck(), E.str('try')), [tryStmt()]),
    ];
  }

  function assignStmt() {
    const nd = () => E.var('cnd');
    return [
      S.set('nt', NdN(nd())),
      S.set('aop', E.item('NdA', nd())),
      S.set('j', E.slen(E.var('aop'))), S.set('nc', E.num(0)),
      S.Until(E.le(E.var('j'), E.num(0)), [
        S.If(E.eq(E.letter(E.var('j'), E.var('aop')), E.str('|')), [S.set('nc', E.sub(E.slen(E.var('aop')), E.var('j')))]),
        S.chg('j', E.num(-1)),
      ]),
      S.set('aop', E.letter(E.num(1), E.var('aop'))),
      // augmented assignment on a plain name
      S.If(E.not(E.eq(E.var('aop'), E.str('='))), [
        S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.eq(NdK(Ch(nd(), E.num(0))), E.str('name'))), [
          S.set('nm', NdA(Ch(nd(), E.num(0)))),
          ...pushT('e', E.str('BIN'), E.var('aop')),
          ...pushT('n', Ch(nd(), E.num(1))),
          ...pushT('e', E.str('PUSHV'), E.var('nm')),
          ...pushT('e', E.str('STOREV'), E.var('nm')),
        ], [L.failAt(E.str('SyntaxError: unsupported augmented assignment'), E.num(0))]),
      ], [
        // subscript / attribute targets evaluate object+index first
        S.If(E.and(E.eq(E.var('nc'), E.num(1)), E.not(E.eq(NdK(Ch(nd(), E.num(0))), E.str('name')))), [
          S.If(E.eq(NdK(Ch(nd(), E.num(0))), E.str('sub')), [
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(1))),
            ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
            ...pushT('n', Ch(nd(), E.num(1))),
            ...pushT('e', E.str('SUBSSET'), NdA(Ch(nd(), E.num(0)))),
          ], [
            S.If(E.eq(NdK(Ch(nd(), E.num(0))), E.str('attr')), [
              ...pushT('n', Ch(Ch(nd(), E.num(0)), E.num(0))),
              ...pushT('n', Ch(nd(), E.num(1))),
              ...pushT('e', E.str('SETATTR'), NdA(Ch(nd(), E.num(0)))),
            ], [L.failAt(E.str('SyntaxError: bad assignment target'), E.num(0))]),
          ]),
        ], [
          S.set('j', E.var('nc')),
          S.Until(E.le(E.var('j'), E.num(1)), [
            ...pushT('s', Ch(nd(), E.sub(E.var('j'), E.num(1)))),
            ...pushT('e', E.str('DUP')),
            S.chg('j', E.num(-1)),
          ]),
          ...pushT('s', Ch(nd(), E.num(0))),
          ...pushT('n', Ch(nd(), E.num(1))),
        ]),
      ]),
    ];
  }

  function ifStmt() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(2)), S.set('l1', E.sub(E.var('labTop'), E.num(1))), S.set('l2', E.var('labTop')),
      // reverse order: l2, else, l1, jmp l2, body, jz l1, cond
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      ...pushT('l', E.var('l2')),
      ...pushT('l', E.var('l1')),
      ...pushT('j', E.str('JMP'), E.var('l2')),
      S.If(E.ge(NdN(nd()), E.num(2)), [...pushT('n', Ch(nd(), E.num(1)))]),
      ...pushT('j', E.str('JZ'), E.var('l1')),
      ...pushT('n', Ch(nd(), E.num(0))),
    ];
  }

  function loopStmt(_k) {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(3)),
      S.set('lc', E.sub(E.var('labTop'), E.num(2))),
      S.set('lx', E.sub(E.var('labTop'), E.num(1))),
      S.set('lb', E.var('labTop')),
      // order: l0, pushloop, cond, JZ lx, body, JMP l0, lx, poploop, else, lb
      ...pushT('l', E.var('lb')),
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      ...pushT('q'),
      ...pushT('l', E.var('lx')),
      ...pushT('j', E.str('JMP'), E.var('lc')),
      S.If(E.ge(NdN(nd()), E.num(2)), [...pushT('n', Ch(nd(), E.num(1)))]),
      ...pushT('j', E.str('JZ'), E.var('lx')),
      ...pushT('n', Ch(nd(), E.num(0))),
      ...pushT('p', E.var('lc'), E.var('lb'), E.num(0)),
    ];
  }

  function forStmt() {
    const nd = () => E.var('cnd');
    return [
      S.chg('labTop', E.num(3)),
      S.set('lc', E.sub(E.var('labTop'), E.num(2))),
      S.set('lx', E.sub(E.var('labTop'), E.num(1))),
      S.set('lb', E.var('labTop')),
      // order: iter, ITER, pushloop, l0, NEXT lx, store, body, JMP l0, lx, POP, POP, poploop, else, lb
      ...pushT('l', E.var('lb')),
      S.If(E.ge(NdN(nd()), E.num(4)), [...pushT('n', Ch(nd(), E.num(3)))]),
      ...pushT('q'),
      ...pushT('e', E.str('POP')),
      ...pushT('e', E.str('POP')),
      ...pushT('l', E.var('lx')),
      ...pushT('j', E.str('JMP'), E.var('lc')),
      S.If(E.ge(NdN(nd()), E.num(3)), [...pushT('n', Ch(nd(), E.num(2)))]),
      ...pushT('s', Ch(nd(), E.num(0))),
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
      S.set('dop', E.item('CtA', E.var('csSp'))),
      S.set('dsp', NdA(nd())),
      S.If(E.eq(E.var('dop'), E.str('CLASS')), [
        S.set('kstr', E.join(E.str('#'), E.var('dsp'))),
      ], [
        S.set('kstr', E.var('dsp')),
      ]),
      ...addK(E.var('kstr')), S.set('t7', E.var('kci')),
      S.chg('labTop', E.num(2)),
      S.set('lbody', E.sub(E.var('labTop'), E.num(1))),
      S.set('laft', E.var('labTop')),
      // order: JMP laft, lbody, body, RETN, laft, DEF k lbody, STOREV name
      S.If(E.eq(E.var('dop'), E.str('LAMBDA')), [], [...pushT('e', E.str('STOREV'), E.var('dsp'))]),
      S.If(E.eq(E.var('dop'), E.str('DEF')), [...pushT('e', E.str('STOREV'), E.var('dsp'))]),
      ...pushT('d', E.var('dop'), E.join(E.var('t7'), E.join(E.str('|'), E.var('lbody')))),
      ...pushT('l', E.var('laft')),
      ...pushT('e', E.str('RETN')),
      ...pushSuite(Ch(nd(), E.num(0))),
      ...pushT('l', E.var('lbody')),
      ...pushT('j', E.str('JMP'), E.var('laft')),
    ];
  }

  function tryStmt() {
    const nd = () => E.var('cnd');
    // layout: TRY Lh, body, ENDTRY, else, JMP Lend, Lh, handlers..., RERAISE, Lend, finally
    const h = [];   // handler emit chain (in order)
    h.push(...pushT('e', E.str('RERAISE')));
    h.push(...pushT('l', E.var('lend')));
    // handlers are emitted in order: for i=3..0 reversed
    for (let i = 3; i >= 0; i--) {
      h.push(S.If(E.ge(NdN(nd()), E.num(11)), [
        S.If(E.not(E.eq(Ch(nd(), E.num(1 + i * 2)), E.num(0))), [handlerBlock(i)]),
      ]));
    }
    h.push(...pushT('l', E.var('lh')));
    h.push(...pushT('j', E.str('JMP'), E.var('lend')));
    h.push(S.If(E.not(E.eq(Ch(nd(), E.num(9)), E.num(0))), [...pushT('n', Ch(nd(), E.num(9)))]));
    h.push(...pushT('e', E.str('ENDTRY')));
    h.push(...pushSuite(Ch(nd(), E.num(0))));
    h.push(...pushT('j', E.str('TRY'), E.var('lh')));
    // finally
    const fin = [
      S.If(E.not(E.eq(Ch(nd(), E.num(10)), E.num(0))), [...pushT('n', Ch(nd(), E.num(10)))]),
      ...pushT('l', E.var('lend')),
    ];
    return [
      S.chg('labTop', E.num(2)),
      S.set('lh', E.sub(E.var('labTop'), E.num(1))),
      S.set('lend', E.var('labTop')),
      ...fin,
      ...h,
    ];
  }

  function handlerBlock(i) {
    const nd = () => E.var('cnd');
    const nextLab = E.sub(E.add(E.var('labTop'), E.num(1)), E.num(20 - i * 2));
    return [
      S.set('hl', E.add(E.var('labTop'), E.num(100 + i))),
      S.chg('labTop', E.num(0)),
      // DUP; type; ISINST; JZ lnext; bind; body; JMP lend; lnext
      ...pushT('l', E.var('hl')),
      ...pushT('j', E.str('JMP'), E.var('lend')),
      ...pushT('n', Ch(nd(), E.num(2 + i * 2))),
      S.If(E.eq(NdK(Ch(nd(), E.num(1 + i * 2))), E.str('excas')), [
        ...pushT('e', E.str('STOREV'), NdA(Ch(Ch(nd(), E.num(1 + i * 2)), E.num(1)))),
      ], [
        S.If(E.eq(NdK(Ch(nd(), E.num(1 + i * 2))), E.str('lit')), [
          S.If(E.eq(NdA(Ch(nd(), E.num(1 + i * 2))), E.str('Z')), [...pushT('e', E.str('POP'))]),
        ]),
      ]),
      ...pushT('j', E.str('JZ'), E.var('hl')),
      ...pushT('e', E.str('ISINST')),
      S.If(E.eq(NdK(Ch(nd(), E.num(1 + i * 2))), E.str('excas')),
        [...pushT('n', Ch(Ch(nd(), E.num(1 + i * 2)), E.num(0)))],
        [...pushT('n', Ch(nd(), E.num(1 + i * 2)))]),
      ...pushT('e', E.str('DUP')),
    ];
  }

  return [
    S.ldelall('Iop'), S.ldelall('Ia'), S.ldelall('Ib'), S.ldelall('Iline'), S.ldelall('Kval'),
    S.ldelall('PdL'), S.ldelall('PdS'), S.ldelall('PdF'), S.ldelall('Lpc'),
    S.set('pdSp', E.num(0)), S.set('csSp', E.num(0)), S.set('lpSp', E.num(0)), S.set('labTop', E.num(0)),
    ...pushT('n', E.var('rootNd')),
    S.Until(E.or(E.le(E.var('csSp'), E.num(0)), E.not(E.eq(E.var('err'), E.str('')))), [
      S.set('ct0', E.item('CtK', E.var('csSp'))),
      S.If(E.eq(E.var('ct0'), E.str('n')), [...visit()], [
        S.If(E.eq(E.var('ct0'), E.str('e')), [
          S.set('cop', E.item('CtA', E.var('csSp'))),
          S.set('carg', E.item('CtB', E.var('csSp'))),
          S.chg('csSp', E.num(-1)),
          ...emit(E.var('cop'), E.var('carg')),
        ], [
          S.If(E.eq(E.var('ct0'), E.str('j')), [
            S.set('cop', E.item('CtA', E.var('csSp'))),
            S.set('carg', E.item('CtB', E.var('csSp'))),
            S.chg('csSp', E.num(-1)),
            ...doJump(E.var('cop'), E.var('carg')),
          ], [
            S.If(E.eq(E.var('ct0'), E.str('l')), [
              S.set('carg', E.item('CtA', E.var('csSp'))),
              S.chg('csSp', E.num(-1)),
              ...doLabel(E.var('carg')),
            ], [
              S.If(E.eq(E.var('ct0'), E.str('d')), [
                S.set('cop', E.item('CtA', E.var('csSp'))),
                S.set('carg', E.item('CtB', E.var('csSp'))),
                S.chg('csSp', E.num(-1)),
                S.set('kk', E.sub(E.index ? E.num(0) : E.num(0), E.num(0))),
                ...doDef(E.var('cop'), E.num(0), E.num(0)),
              ], [
                S.If(E.eq(E.var('ct0'), E.str('p')), [
                  S.set('carg', E.item('CtA', E.var('csSp'))),
                  S.set('car2', E.item('CtB', E.var('csSp'))),
                  S.set('car3', E.item('CtC', E.var('csSp'))),
                  S.chg('csSp', E.num(-1)),
                  ...L.pushRow('lpSp', [['LpCon', E.var('carg')], ['LpBrk', E.var('car2')], ['LpExt', E.var('car3')]]),
                  ...L.heapNew('t4'), S.lset('LpBrk', E.var('lpSp'), E.var('t4')),
                  ...L.setAt('LpCon', E.var('lpSp'), E.var('carg')),
                  ...L.setAt('LpExt', E.var('lpSp'), E.var('car3')),
                ], [
                  S.If(E.eq(E.var('ct0'), E.str('q')), [
                    S.chg('csSp', E.num(-1)), S.chg('lpSp', E.num(-1)),
                  ], [
                    S.If(E.eq(E.var('ct0'), E.str('s')), [...storeTarget(), S.chg('csSp', E.num(-1))], [
                      L.failAt(E.str('CompilerError: bad task'), E.num(0)),
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
module.exports = { build, setup };
