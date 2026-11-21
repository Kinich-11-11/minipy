'use strict';
/**
 * v5 Parser - one flat state machine.  ps=0 statement start, ps=1 expression
 * shunting-yard loop.  Pending statement work is carried in stK/stN/stL/stC.
 */
const { E, S } = require('../dsl.js');
const A = require('./ast.js');
const L = require('./lib.js');
const P = require('./pexpr.js');
const U = require('./astutil.js');

const T = P.T, V = P.V;
const isO = P.isO, isK = P.isK;
const AUG = ' += -= *= /= //= %= **= ';
const isAug = (v) => E.contains(E.str(AUG), E.join(E.str(' '), E.join(v, E.str(' '))));

const heapNew = U.heapNew, heapAdd = U.heapAdd, heapGet = U.heapGet;

function blkPush(node, slot) {
  return L.pushRow('blSp', [['BlN', node], ['BlS', E.num(slot)], ['BlK', E.str('X')]]);
}
function blkSetKind(k) { return [S.lset('BlK', E.var('blSp'), E.str(k))]; }

/** node whose children come from a heap list plus an optional trailing child */
function nodeFromHeap(dst, kind, aux, listObj, cntExpr, extra) {
  const n = extra ? E.add(cntExpr, E.num(1)) : cntExpr;
  const st = [
    S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')), S.set(dst, E.var('nTop')),
    ...L.setAt('NdK', E.var(dst), kind), ...L.setAt('NdA', E.var(dst), aux),
    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),
    ...L.setAt('NdL', E.var(dst), E.var('curLine')),
    S.set('i', E.num(1)),
    S.Until(E.gt(E.var('i'), cntExpr), [S.ladd('NdC', heapGet(listObj, E.var('i'))), S.chg('i', E.num(1))]),
    ...L.setAt('NdN', E.var(dst), n),
  ];
  if (extra) st.push(S.ladd('NdC', extra));
  return st;
}

/** append the finished statement to the innermost suite */
function finishStmt(nd) {
  return [...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), nd), S.set('ps', E.num(0)), S.set('stK', E.str('')), S.set('noIn', E.num(0))];
}

function build() {
  const tp1 = () => S.chg('tp', E.num(1));
  // every expression parse gets its own statement-level context
  const startExpr = () => [...P.pushCtx('S', 0), S.set('pmark', E.var('pvSp')),
    S.set('ps', E.num(1)), S.set('want', E.num(0))];
  const pushNone = () => P.pushV(E.var('noneNd'), E.str(''));

  // ------------------------------------------------ atom / prefix
  function atomStep() {
    return [
      S.If(E.eq(T(), E.str('N')), [
        ...A.nodeN('t3', E.str('lit'), E.join(E.str(''), V()), []), ...P.pushV(E.var('t3'), E.str('')), tp1(), S.set('want', E.num(1)),
      ], [
        S.If(E.eq(T(), E.str('S')), [
          ...A.nodeN('t3', E.str('lit'), E.join(E.str('S'), V()), []), ...P.pushV(E.var('t3'), E.str('')), tp1(), S.set('want', E.num(1)),
        ], [
          S.If(E.eq(T(), E.str('F')), [
            L.failAt(E.str('NotImplementedError: f-strings'), E.item('TokL', E.var('tp'))),
          ], [
            S.If(E.eq(T(), E.str('I')), [
              ...A.nodeN('t3', E.str('name'), V(), []), ...P.pushV(E.var('t3'), E.str('')), tp1(), S.set('want', E.num(1)),
            ], [
              S.If(E.eq(T(), E.str('K')), [
                S.set('t5', V()),
                S.If(E.contains(E.str(' True False None '), E.join(E.str(' '), E.join(E.var('t5'), E.str(' ')))), [
                  ...A.nodeN('t3', E.str('lit'), E.str('Z'), []),
                  S.If(E.eq(E.var('t5'), E.str('True')), [S.lset('NdA', E.var('t3'), E.str('B1'))]),
                  S.If(E.eq(E.var('t5'), E.str('False')), [S.lset('NdA', E.var('t3'), E.str('B0'))]),
                  ...P.pushV(E.var('t3'), E.str('')), tp1(), S.set('want', E.num(1)),
                ], [
                  S.If(E.eq(E.var('t5'), E.str('not')), [...P.pushO('not'), tp1()], [
                    S.If(E.eq(E.var('t5'), E.str('lambda')), [...lambdaStep()], [
                      S.set('stop', E.num(1)),
                    ]),
                  ]),
                ]),
              ], [
                S.If(E.eq(T(), E.str('O')), [
                  S.set('t5', V()),
                  S.If(E.eq(E.var('t5'), E.str('-')), [...P.pushO('neg'), tp1()], [
                    S.If(E.eq(E.var('t5'), E.str('+')), [...P.pushO('pos'), tp1()], [
                      S.If(E.eq(E.var('t5'), E.str('~')), [...P.pushO('inv'), tp1()], [
                        S.If(E.eq(E.var('t5'), E.str('(')), [...P.pushCtx('G', 0), tp1()], [
                          S.If(E.eq(E.var('t5'), E.str('[')), [...P.pushCtx('L', 0), tp1()], [
                            S.If(E.eq(E.var('t5'), E.str('{')), [...P.pushCtx('D', 0), tp1()], [
                              S.set('stop', E.num(1)),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ], [
                  S.set('stop', E.num(1)),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
  }

  // ------------------------------------------------ lambda: params then body
  function lambdaStep() {
    // consumes 'lambda', reads params up to ':', pushes a marker node and a 'M' ctx
    return [
      tp1(),
      // the lambda's value replaces the one the callee pushed, so keep the pending kwarg
      // name (`key=`) around for the ctx close below
      S.set('kwlam', E.var('kwpend')),
      S.set('stS', E.str('')),
      S.Until(E.or(E.not(E.or(E.eq(T(), E.str('I')), isO(','))), E.not(E.eq(E.var('err'), E.str('')))), [
        S.If(E.eq(T(), E.str('I')), [
          S.set('stS', E.join(E.var('stS'), E.join(E.item('TokV', E.var('tp')), E.str(';')))),
          tp1(),
        ], [tp1()]),
      ]),
      S.set('stS', E.join(E.var('stS'), E.str('#'))),
      S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: bad lambda'), E.item('TokL', E.var('tp')))]),
      tp1(),
      ...U.heapNew('t4'),
      ...A.nodeK('t3', E.str('lam'), E.var('stS'), 1),
      ...P.pushV(E.var('t3'), E.str('')),
      ...P.pushCtx('M', 0),
      S.set('want', E.num(0)),
    ];
  }

  // ------------------------------------------------ closing a context
  function finalizeCtx() {
    return [
      P.reduceCtx(),
      S.set('ct', P.ctxT()),
      S.If(E.eq(E.var('ct'), E.str('G')), [
        S.set('cn', E.sub(E.var('pvSp'), P.ctxA())),
        S.If(E.lt(E.var('cn'), E.num(1)), [L.failAt(E.str('SyntaxError: empty ()'), E.item('TokL', E.var('tp')))]),
        // a parenthesised operand never joins a comparison chain: (a < b) < c is nested
        S.If(E.and(E.eq(E.var('cn'), E.num(1)), E.eq(P.ctxD(), E.num(0))), [
          ...L.setAt('NdG', E.item('Pv', E.var('pvSp')), E.str('p')),
        ]),
        // (x,) is a one element tuple
        S.If(E.or(E.gt(E.var('cn'), E.num(1)), E.and(E.eq(E.var('cn'), E.num(1)), E.eq(P.ctxD(), E.num(1)))), [
          ...U.nodeFromStack('t3', E.str('tuple'), E.str(''), E.add(P.ctxA(), E.num(1)), E.var('cn'), null),
          ...P.pushV(E.var('t3'), E.str('')),
        ]),
        S.chg('pcSp', E.num(-1)),
      ]),
      S.If(E.eq(E.var('ct'), E.str('M')), [
        // lambda body value is on the stack; the lambda node is right below it
        S.set('v0', E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        S.set('l0', E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        ...U.heapNew('t4'),
        ...A.nodeN('t5', E.str('ret'), E.str(''), [E.var('v0')]),
        ...heapAdd(E.var('t4'), E.var('t5')),
        ...A.nodeK('t6', E.str('suite'), E.var('t4'), 0),
  ...A.setChild(E.var('l0'), E.num(0), E.var('t6')),
        S.chg('pcSp', E.num(-1)),
        S.set('kwpend', E.var('kwlam')),
        ...P.pushV(E.var('l0')),
        S.set('want', E.num(1)),
      ]),
      S.If(E.eq(E.var('ct'), E.str('C')), [
        S.set('cn', E.add(E.sub(E.var('pvSp'), P.ctxA()), E.num(1))),
        ...U.nodeFromStack('t3', E.str('call'), E.var('kws'), P.ctxA(), E.var('cn'), 'kws'),
        ...P.pushV(E.var('t3'), E.str('')),
        S.chg('pcSp', E.num(-1)),
      ]),
      S.If(E.eq(E.var('ct'), E.str('L')), [
        S.set('cn', E.sub(E.var('pvSp'), P.ctxA())),
        ...U.nodeFromStack('t3', E.str('list'), E.str(''), E.add(P.ctxA(), E.num(1)), E.var('cn'), null),
        ...P.pushV(E.var('t3'), E.str('')),
        S.chg('pcSp', E.num(-1)),
      ]),
      S.If(E.eq(E.var('ct'), E.str('D')), [
        S.set('cn', E.sub(E.var('pvSp'), P.ctxA())),
        ...U.nodeFromStack('t3', E.str('dict'), E.str(''), E.add(P.ctxA(), E.num(1)), E.var('cn'), null),
        ...P.pushV(E.var('t3'), E.str('')),
        S.chg('pcSp', E.num(-1)),
      ]),
      S.If(E.eq(E.var('ct'), E.str('X')), [
        // the object sits at ctxA(), index parts follow: count is inclusive of the object
        S.set('cn', E.add(E.sub(E.var('pvSp'), P.ctxA()), E.num(1))),
        S.If(E.eq(P.ctxD(), E.num(0)), [
          ...U.nodeFromStack('t3', E.str('sub'), E.str('i'), P.ctxA(), E.var('cn'), null),
        ], [
          S.Until(E.ge(E.add(E.sub(E.var('pvSp'), P.ctxA()), E.num(1)), E.num(4)), [pushNone()]),
          S.set('cn', E.add(E.sub(E.var('pvSp'), P.ctxA()), E.num(1))),
          ...U.nodeFromStack('t3', E.str('sub'), E.str('s'), P.ctxA(), E.var('cn'), null),
        ]),
        ...P.pushV(E.var('t3'), E.str('')),
        S.chg('pcSp', E.num(-1)),
      ]),
    ];
  }

  // ------------------------------------------------ infix / postfix
  function infixStep() {
    return [
      S.If(E.eq(T(), E.str('O')), [inOp()], [
        S.If(E.eq(T(), E.str('K')), [inKw()], [
          S.If(E.eq(T(), E.str('E')), [S.set('stop', E.num(1))], [
            S.If(E.eq(T(), E.str('W')), [S.set('stop', E.num(1))], [
              S.set('stop', E.num(1)),
            ]),
          ]),
        ]),
      ]),
    ];
  }

  function binPush(opExpr) {
    return [
      ...P.precBlock('pr0', opExpr),
      S.set('bk2', E.num(0)),
      S.Until(E.or(E.le(E.var('poSp'), P.ctxB()), E.eq(E.var('bk2'), E.num(1))), [
        ...P.precBlock('pc0', E.item('Po', E.var('poSp'))),
        S.If(E.or(E.gt(E.var('pc0'), E.var('pr0')),
          E.and(E.eq(E.var('pc0'), E.var('pr0')), E.not(E.or(E.eq(opExpr, E.str('**')), E.eq(opExpr, E.str('else')))))), [
          ...P.reduceOne(),
        ], [
          S.set('bk2', E.num(1)),
        ]),
      ]),
      ...P.pushO(opExpr), tp1(), S.set('want', E.num(0)),
    ];
  }

  function inOp() {
    const v = () => E.var('t5');
    return [
      S.set('t5', V()),
      S.If(E.eq(v(), E.str('.')), [
        tp1(),
        S.If(E.not(E.eq(T(), E.str('I'))), [L.failAt(E.str('SyntaxError: expected attribute name'), E.item('TokL', E.var('tp')))]),
        S.set('t7', V()),
        ...P.popV(),
        ...A.nodeN('t3', E.str('attr'), E.var('t7'), [E.var('v0')]),
        ...P.pushV(E.var('t3'), E.str('')),
        tp1(), S.set('want', E.num(1)),
      ], [
        S.If(E.eq(v(), E.str('(')), [
          ...P.pushCtx('C', 0), tp1(), S.set('want', E.num(0)),
        ], [
          S.If(E.eq(v(), E.str('[')), [
            ...P.pushCtx('X', 0),
            S.lset('PcE', E.var('pcSp'), E.var('pvSp')),
            tp1(), S.set('want', E.num(0)),
          ], [
            S.If(E.eq(v(), E.str(')')), [
              S.If(E.eq(P.ctxT(), E.str('C')), [...finalizeCtx()], [
                S.If(E.eq(P.ctxT(), E.str('G')), [...finalizeCtx()], [
                  S.If(E.eq(P.ctxT(), E.str('M')), [
                // one ')' closes both the lambda body and the bracket it sits in
                ...finalizeCtx(),
                S.If(E.eq(E.var('err'), E.str('')), [
                  S.If(E.or(E.eq(P.ctxT(), E.str('G')), E.eq(P.ctxT(), E.str('C'))), [...finalizeCtx()]),
                ]),
              ], [L.failAt(E.str('SyntaxError: unexpected )'), E.item('TokL', E.var('tp')))]),
                ]),
              ]),
              S.If(E.eq(E.var('err'), E.str('')), [tp1(), S.set('want', E.num(1))]),
            ], [
              S.If(E.eq(v(), E.str(']')), [
                S.If(E.eq(P.ctxT(), E.str('L')), [...finalizeCtx()], [
                  S.If(E.eq(P.ctxT(), E.str('X')), [...finalizeCtx()], [L.failAt(E.str('SyntaxError: unexpected ]'), E.item('TokL', E.var('tp')))]),
                ]),
                S.If(E.eq(E.var('err'), E.str('')), [tp1(), S.set('want', E.num(1))]),
              ], [
                S.If(E.eq(v(), E.str('}')), [
                  S.If(E.eq(P.ctxT(), E.str('D')), [...finalizeCtx()], [L.failAt(E.str('SyntaxError: unexpected }'), E.item('TokL', E.var('tp')))]),
                  S.If(E.eq(E.var('err'), E.str('')), [tp1(), S.set('want', E.num(1))]),
                ], [
                  S.If(E.eq(v(), E.str(',')), [...inComma()], [
                    S.If(E.eq(v(), E.str(':')), [...inColon()], [
                      S.If(E.eq(v(), E.str('=')), [...inEq()], [
                        S.If(P.isBin(v()), [...binPush(v())], [
                          S.set('stop', E.num(1)),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
  }

  function inComma() {
    return [
      // fold the operators pending for the element that just ended (same reason as inColon)
      S.If(E.not(E.eq(P.ctxT(), E.str('S'))), [S.Until(E.le(E.var('poSp'), P.ctxB()), [P.reduceOne()])]),
      S.set('t6', P.ctxT()),
      S.If(E.eq(E.var('t6'), E.str('S')), [S.set('stop', E.num(1))], [
        S.If(E.eq(E.var('t6'), E.str('G')), [S.lset('PcD', E.var('pcSp'), E.num(1)), tp1(), S.set('want', E.num(0))], [
          S.If(E.eq(E.var('t6'), E.str('C')), [
            S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0)),
          ], [
            S.If(E.eq(E.var('t6'), E.str('X')), [
              S.If(E.eq(E.var('pvSp'), P.ctxE()), [pushNone()]),
              S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0)),
            ], [
              S.If(E.eq(E.var('t6'), E.str('L')), [S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0))], [
                S.If(E.eq(E.var('t6'), E.str('D')), [S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0))], [
                  S.set('stop', E.num(1)),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
  }

  function inColon() {
    return [
      // fold any operators still pending for the part that just ended, otherwise the next
      // part's operators stack on top of them and reduce in the wrong order
      S.Until(E.le(E.var('poSp'), P.ctxB()), [P.reduceOne()]),
      S.set('t6', P.ctxT()),
      S.If(E.eq(E.var('t6'), E.str('D')), [
        S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0)),
      ], [
        S.If(E.eq(E.var('t6'), E.str('X')), [
          S.If(E.eq(E.var('pvSp'), P.ctxE()), [pushNone()]),
          S.lset('PcD', E.var('pcSp'), E.add(P.ctxD(), E.num(1))),
          S.lset('PcE', E.var('pcSp'), E.var('pvSp')), tp1(), S.set('want', E.num(0)),
        ], [
          S.set('stop', E.num(1)),
        ]),
      ]),
    ];
  }

  function inEq() {
    return [
      S.If(E.eq(P.ctxT(), E.str('C')), [
        S.set('v0', E.item('Pv', E.var('pvSp'))),
        S.If(E.eq(E.item('NdK', E.var('v0')), E.str('name')), [
          S.set('kwpend', E.item('NdA', E.var('v0'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          tp1(), S.set('want', E.num(0)),
        ], [
          L.failAt(E.str('SyntaxError: keyword must be a name'), E.item('TokL', E.var('tp'))),
        ]),
      ], [
        S.set('stop', E.num(1)),
      ]),
    ];
  }

  function inKw() {
    const v = () => E.var('t5');
    return [
      S.set('t5', V()),
      S.If(E.eq(v(), E.str('and')), [...binPush(E.str('and'))], [
        S.If(E.eq(v(), E.str('or')), [...binPush(E.str('or'))], [
          S.If(E.eq(v(), E.str('if')), [...binPush(E.str('if'))], [
            S.If(E.eq(v(), E.str('else')), [...binPush(E.str('else'))], [
          S.If(E.eq(v(), E.str('in')), [
            S.If(E.eq(E.var('noIn'), E.num(1)), [S.set('stop', E.num(1))], [...binPush(E.str('in'))]),
          ], [
            S.If(E.eq(v(), E.str('is')), [...binPush(E.str('is'))], [
              S.If(E.eq(v(), E.str('not')), [
                S.If(E.and(E.eq(E.item('TokT', E.add(E.var('tp'), E.num(1))), E.str('K')),
                  E.eq(E.item('TokV', E.add(E.var('tp'), E.num(1))), E.str('in'))), [
                  ...binPush(E.str('notin')), S.chg('tp', E.num(1)),
                ], [S.set('stop', E.num(1))]),
              ], [S.set('stop', E.num(1))]),
            ]),
          ]),
        ]),
      ]),
            ]),
          ]),
    ];
  }

  // ------------------------------------------------ statement start
  function stmtStart() {
    return [
      // every node built from here on records the source line it came from
      S.set('curLine', E.item('TokL', E.var('tp'))),
      S.If(E.gt(E.var('poSp'), E.num(0)), [S.Until(E.le(E.var('poSp'), E.num(0)), [P.reduceOne()])]),
      S.set('pcSp', E.num(0)), S.set('kwpend', E.str('')),
      S.If(E.eq(E.var('wantSuite'), E.num(1)), [
        S.set('wantSuite', E.num(0)),
        S.If(E.eq(T(), E.str('W')), [tp1()]),
        S.If(E.not(E.eq(T(), E.str('>'))), [...openSimpleSuite()]),
      ]),
      // a one-line suite ends where its source line ends
      S.If(E.and(E.gt(E.var('ssDepth'), E.num(0)),
        E.not(E.eq(E.item('TokL', E.var('tp')), E.var('ssLine')))), [...closeSimpleSuites()]),
      S.If(E.eq(T(), E.str('W')), [
        S.If(E.gt(E.var('ssDepth'), E.num(0)), [...closeSimpleSuites()]),
        tp1(),
      ], [
        S.If(E.eq(T(), E.str(';')), [tp1()], [
          S.If(E.eq(T(), E.str('<')), [...dedent()], [
            S.If(E.eq(T(), E.str('>')), [...indentOpen()], [
              S.If(E.eq(T(), E.str('K')), [...kwStmt()], [
                S.If(E.eq(T(), E.str('E')), [], [
                  ...startExpr(), S.set('stK', E.str('')),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
  }

  // Pop the innermost block unless the next statement continues it (elif / else /
  // except / finally).  `innermost` is a build-time switch: the lookahead only applies to
  // the block that is actually being closed; outer levels are always popped.
  function blockContinuation(innermost) {
    const body = [
      S.set('t6', E.num(0)),
      S.If(innermost, [
        S.set('j', E.var('tp')),
        S.Until(E.or(E.gt(E.var('j'), E.len('TokT')), E.not(E.eq(E.item('TokT', E.var('j')), E.str('W')))), [S.chg('j', E.num(1))]),
        S.set('t5', E.item('TokV', E.var('j'))),
        S.If(E.and(E.eq(E.item('BlK', E.var('blSp')), E.str('if')),
          E.or(E.eq(E.var('t5'), E.str('elif')), E.eq(E.var('t5'), E.str('else')))), [S.set('t6', E.num(1))]),
        S.If(E.and(E.or(E.eq(E.item('BlK', E.var('blSp')), E.str('while')), E.eq(E.item('BlK', E.var('blSp')), E.str('for'))),
          E.eq(E.var('t5'), E.str('else'))), [S.set('t6', E.num(1))]),
        S.If(E.and(E.eq(E.item('BlK', E.var('blSp')), E.str('try')),
          E.or(E.or(E.eq(E.var('t5'), E.str('except')), E.eq(E.var('t5'), E.str('finally'))),
            E.eq(E.var('t5'), E.str('else')))), [S.set('t6', E.num(1))]),
      ]),
      S.If(E.eq(E.var('t6'), E.num(0)), [S.chg('blSp', E.num(-1))]),
    ];
    return body;
  }
  function dedent() {
    return [
      tp1(),
      S.chg('suSp', E.num(-1)),
      S.If(E.gt(E.var('blSp'), E.num(0)), [...blockContinuation(E.num(1))]),
    ];
  }
  // One-line suite:  `if x: stmt` / `for i in r: stmt` / `def f(): return 1`
  // Python allows these on the header line itself; without this the suite is empty and
  // the statement that follows the colon leaks into the enclosing suite.
  function openSimpleSuite() {
    return [
      S.If(E.gt(E.var('blSp'), E.num(0)), [
        S.set('ssLine', E.item('TokL', E.var('tp'))),
        ...U.heapNew('t4'),
        ...A.nodeK('t5', E.str('suite'), E.var('t4'), 0),
        ...A.setChild(E.item('BlN', E.var('blSp')), E.item('BlS', E.var('blSp')), E.var('t5')),
        S.lset('BlS', E.var('blSp'), E.add(E.item('BlS', E.var('blSp')), E.num(1))),
        ...L.pushL('SuN', 'suSp', E.var('t5')),
        S.chg('ssDepth', E.num(1)),
      ]),
    ];
  }
  function closeSimpleSuites() {
    return [
      S.Until(E.le(E.var('ssDepth'), E.num(0)), [
        S.chg('suSp', E.num(-1)),
        S.If(E.gt(E.var('blSp'), E.num(0)), [
          ...blockContinuation(E.eq(E.var('ssDepth'), E.num(1))),
        ]),
        S.chg('ssDepth', E.num(-1)),
      ]),
    ];
  }

  function indentOpen() {
    return [
      tp1(),
      S.If(E.gt(E.var('blSp'), E.num(0)), [
        ...U.heapNew('t4'),
        ...A.nodeK('t5', E.str('suite'), E.var('t4'), 0),
        ...A.setChild(E.item('BlN', E.var('blSp')), E.item('BlS', E.var('blSp')), E.var('t5')),
        S.lset('BlS', E.var('blSp'), E.add(E.item('BlS', E.var('blSp')), E.num(1))),
        ...L.pushL('SuN', 'suSp', E.var('t5')),
      ], [
        L.failAt(E.join(E.str('IndentationError: unexpected indent at '), E.var('tp')), E.item('TokL', E.var('tp'))),
      ]),
    ];
  }

  // ------------------------------------------------ yield
  // `yield` marks the innermost enclosing def as a generator (NdG = 'g') and produces a
  // yield node; the compiler turns that into the YIELD instruction and a GDEF.
  function yieldStmt() {
    return [
      tp1(),
      S.set('gkj', E.var('blSp')), S.set('gkn', E.num(0)),
      S.Until(E.or(E.lt(E.var('gkj'), E.num(1)), E.eq(E.var('gkn'), E.num(1))), [
        S.If(E.eq(E.item('BlK', E.var('gkj')), E.str('def')), [
          S.lset('NdG', E.item('BlN', E.var('gkj')), E.str('g')), S.set('gkn', E.num(1)),
        ]),
        S.chg('gkj', E.num(-1)),
      ]),
      S.If(E.eq(E.var('gkn'), E.num(0)), [
        L.failAt(E.str('SyntaxError: yield outside function'), E.item('TokL', E.var('tp'))),
      ]),
      S.If(E.or(E.eq(T(), E.str('W')), E.or(E.eq(T(), E.str(';')), E.eq(T(), E.str('E')))), [
        ...A.nodeN('t3', E.str('yield'), E.str(''), []), ...finishStmt(E.var('t3')),
      ], [
        ...startExpr(), S.set('stK', E.str('hyld')),
      ]),
    ];
  }
  // ------------------------------------------------ keyword statements
  function kwStmt() {
    const v = () => E.var('t5');
    const compound = (kind, nslots, slot, nodeKind) => [
      tp1(),
      ...A.nodeK('t1', E.str(nodeKind), E.str(''), nslots),
      ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
      ...blkPush(E.var('t1'), slot),
      ...blkSetKind(kind),
      ...startExpr(), S.set('stK', E.str(kind)),
    ];
    const SIMPLE = ' pass break continue return yield import from del assert raise global nonlocal ';
    return [
      S.set('t5', V()),
      // Python only allows simple statements in a one-line suite
      S.If(E.and(E.gt(E.var('ssDepth'), E.num(0)),
        E.not(E.contains(E.str(SIMPLE), E.join(E.str(' '), E.join(v(), E.str(' ')))))), [
        L.failAt(E.str('SyntaxError: compound statement in a one-line suite'), E.item('TokL', E.var('tp'))),
      ]),
      S.If(E.eq(v(), E.str('if')), [...compound('if', 3, 0, 'if')], [
        S.If(E.eq(v(), E.str('while')), [...compound('while', 3, 0, 'while')], [
          S.If(E.eq(v(), E.str('for')), [
            tp1(),
            ...A.nodeK('t1', E.str('for'), E.str(''), 4),
            ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
            ...blkPush(E.var('t1'), 0), ...blkSetKind('for'),
            ...U.heapNew('stL'), S.set('stC', E.num(0)),
            ...startExpr(), S.set('stK', E.str('hfor')), S.set('noIn', E.num(1)),
          ], [
            S.If(E.eq(v(), E.str('with')), [
              tp1(),
              ...A.nodeK('t1', E.str('with'), E.str(''), 3),
              ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
              ...blkPush(E.var('t1'), 0), ...blkSetKind('with'),
              ...startExpr(), S.set('stK', E.str('hwith')),
            ], [            S.If(E.eq(v(), E.str('def')), [...defStmt()], [
              S.If(E.eq(v(), E.str('class')), [...classStmt()], [
                S.If(E.eq(v(), E.str('try')), [
                  tp1(),
                  S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp')))]),
                  tp1(),
                  ...A.nodeK('t1', E.str('try'), E.str(''), 11),
                  ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
                  ...blkPush(E.var('t1'), 0), ...blkSetKind('try'),
                  S.set('ps', E.num(0)), S.set('want', E.num(0)), S.set('stK', E.str('')), S.set('wantSuite', E.num(1)),
                ], [
                  S.If(E.eq(v(), E.str('elif')), [...contIf('elif')], [
                    S.If(E.eq(v(), E.str('else')), [...contElse()], [
                      S.If(E.eq(v(), E.str('except')), [...contExcept()], [
                        S.If(E.eq(v(), E.str('finally')), [...contFinally()], [
                          S.If(E.eq(v(), E.str('return')), [
                            tp1(),
                            S.If(E.or(E.eq(T(), E.str('W')), E.or(E.eq(T(), E.str(';')), E.eq(T(), E.str('E')))), [
                              ...A.nodeN('t3', E.str('ret'), E.str(''), []), ...finishStmt(E.var('t3')),
                            ], [
                              ...startExpr(), S.set('stK', E.str('hret')),
                            ]),
                          ], [
                            S.If(E.eq(v(), E.str('pass')), [tp1(), ...A.nodeN('t3', E.str('pass'), E.str(''), []), ...finishStmt(E.var('t3'))], [
                              S.If(E.eq(v(), E.str('break')), [tp1(), ...A.nodeN('t3', E.str('break'), E.str(''), []), ...finishStmt(E.var('t3'))], [
                                S.If(E.eq(v(), E.str('continue')), [tp1(), ...A.nodeN('t3', E.str('cont'), E.str(''), []), ...finishStmt(E.var('t3'))], [
                                  S.If(E.eq(v(), E.str('global')), [...nameListStmt('glob')], [
                                    S.If(E.eq(v(), E.str('nonlocal')), [...nameListStmt('nonloc')], [
                                      S.If(E.eq(v(), E.str('yield')), [...yieldStmt()], [
                                      S.If(E.eq(v(), E.str('import')), [...importStmt()], [
                                        S.If(E.eq(v(), E.str('from')), [...fromStmt()], [
                                          S.If(E.eq(v(), E.str('del')), [
                                            tp1(), ...U.heapNew('stL'), S.set('stC', E.num(0)),
                                            ...startExpr(), S.set('stK', E.str('hdel')),
                                          ], [
                                            S.If(E.eq(v(), E.str('assert')), [
                                              tp1(), ...startExpr(), S.set('stK', E.str('hasrt')),
                                            ], [
                                              S.If(E.eq(v(), E.str('raise')), [
                                                tp1(),
                                                S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str('E'))), [
                                                  ...A.nodeN('t3', E.str('raise'), E.str(''), []), ...finishStmt(E.var('t3')),
                                                ], [
                                                  ...startExpr(), S.set('stK', E.str('hraise')),
                                                ]),
                                              ], [
                                                ...startExpr(), S.set('stK', E.str('')),
                                              ]),
                                            ]),
                                          ]),
                                        ]),
                                      ]),
                                    ]),
                                  ]),
                                ]),
                              ]),
                            ]),
                          ]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
      ]),
      ]),
    ];
  }

  function contIf(kw) {
    return [
      S.If(E.eq(E.item('BlK', E.var('blSp')), E.str('if')), [
        tp1(),
        ...A.nodeK('t2', E.str('if'), E.str(''), 3),
        ...A.setChild(E.item('BlN', E.var('blSp')), E.num(2), E.var('t2')),
        S.chg('blSp', E.num(-1)),
        ...blkPush(E.var('t2'), 0), ...blkSetKind('if'),
        ...startExpr(), S.set('stK', E.str('if')),
      ], [
        L.failAt(E.str('SyntaxError: elif without if'), E.item('TokL', E.var('tp'))),
      ]),
    ];
  }

  function contElse() {
    return [
      tp1(),
      S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp')))]),
      tp1(),
      S.If(E.eq(E.item('BlK', E.var('blSp')), E.str('for')), [S.lset('BlS', E.var('blSp'), E.num(3))]),
      S.If(E.eq(E.item('BlK', E.var('blSp')), E.str('try')), [S.lset('BlS', E.var('blSp'), E.num(9))]),
      S.set('ps', E.num(0)), S.set('stK', E.str('')), S.set('wantSuite', E.num(1)),
    ];
  }

  function contExcept() {
    return [
      tp1(),
      S.If(E.eq(E.item('BlK', E.var('blSp')), E.str('try')), [
        S.set('stK', E.str('hexc')), S.set('stC', E.var('pvSp')),
        ...startExpr(),
      ], [
        L.failAt(E.str('SyntaxError: except without try'), E.item('TokL', E.var('tp'))),
      ]),
    ];
  }

  function contFinally() {
    return [
      tp1(),
      S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp')))]),
      tp1(),
      S.lset('BlS', E.var('blSp'), E.num(10)),
      S.set('ps', E.num(0)), S.set('stK', E.str('')), S.set('wantSuite', E.num(1)),
    ];
  }

  function defStmt() {
    return [
      tp1(),
      S.If(E.not(E.eq(T(), E.str('I'))), [L.failAt(E.str('SyntaxError: def needs a name'), E.item('TokL', E.var('tp')))]),
      S.set('stS', V()), tp1(),
      S.If(E.not(isO('(')), [L.failAt(E.str('SyntaxError: def needs ( )'), E.item('TokL', E.var('tp')))]),
      tp1(),
      S.set('t7', E.str('')),
      S.Until(E.or(isO(')'), E.not(E.eq(E.var('err'), E.str('')))), [
        S.If(isO('**'), [
          S.set('t7', E.join(E.var('t7'), E.str('**'))), tp1(),
        ]),
        S.If(isO('*'), [
          S.set('t7', E.join(E.var('t7'), E.str('*'))), tp1(),
        ]),
        S.If(E.eq(T(), E.str('I')), [
          S.set('t7', E.join(E.var('t7'), V())), tp1(),
          // a literal default value is tagged into the parameter spec
          S.If(isO('='), [
            tp1(),
            S.If(E.eq(T(), E.str('N')), [S.set('t7', E.join(E.var('t7'), E.join(E.str('='), V()))), tp1()], [
              S.If(E.eq(T(), E.str('S')), [S.set('t7', E.join(E.var('t7'), E.join(E.str('=S'), V()))), tp1()], [
                S.If(E.and(E.eq(T(), E.str('K')), E.eq(V(), E.str('None'))), [S.set('t7', E.join(E.var('t7'), E.str('=Z'))), tp1()], [
                  S.If(E.and(E.eq(T(), E.str('K')), E.eq(V(), E.str('True'))), [S.set('t7', E.join(E.var('t7'), E.str('=B1'))), tp1()], [
                    S.If(E.and(E.eq(T(), E.str('K')), E.eq(V(), E.str('False'))), [S.set('t7', E.join(E.var('t7'), E.str('=B0'))), tp1()], [
                      L.failAt(E.str('NotImplementedError: default value must be a literal'), E.item('TokL', E.var('tp'))),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
          S.set('t7', E.join(E.var('t7'), E.str(';'))),
        ]),
        S.If(isO(','), [tp1()]),
        S.If(E.not(E.or(E.eq(T(), E.str('I')), E.or(isO(','), E.or(isO('*'), isO('**'))))), [
          S.If(E.not(isO(')')), [L.failAt(E.str('SyntaxError: bad parameter list'), E.item('TokL', E.var('tp'))), tp1()]),
        ]),
      ]),
      tp1(),
      S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp')))]),
      tp1(),
      ...A.nodeK('t1', E.str('def'), E.join(E.var('t7'), E.join(E.str('#'), E.var('stS'))), 1),
      ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
      ...blkPush(E.var('t1'), 0), ...blkSetKind('def'),
      S.set('ps', E.num(0)), S.set('want', E.num(0)), S.set('stK', E.str('')), S.set('wantSuite', E.num(1)),
    ];
  }

  function classStmt() {
    return [
      tp1(),
      S.If(E.not(E.eq(T(), E.str('I'))), [L.failAt(E.str('SyntaxError: class needs a name'), E.item('TokL', E.var('tp')))]),
      S.set('stS', V()), tp1(),
      S.set('t7', E.str('')),
      S.If(isO('('), [
        tp1(),
        S.Until(E.or(isO(')'), E.not(E.eq(E.var('err'), E.str('')))), [
          S.If(E.eq(T(), E.str('I')), [S.set('t7', E.join(E.var('t7'), E.join(V(), E.str(',')))), tp1()]),
          S.If(isO(','), [tp1()]),
          S.If(E.and(E.not(E.eq(T(), E.str('I'))), E.not(isO(','))), [
            S.If(E.not(isO(')')), [L.failAt(E.str('SyntaxError: bad base list'), E.item('TokL', E.var('tp'))), tp1()]),
          ]),
        ]),
        tp1(),
      ]),
      S.If(E.not(isO(':')), [L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp')))]),
      tp1(),
      ...A.nodeK('t1', E.str('class'), E.join(E.var('t7'), E.join(E.str('#'), E.var('stS'))), 1),
      ...heapAdd(E.item('NdA', E.item('SuN', E.var('suSp'))), E.var('t1')),
      ...blkPush(E.var('t1'), 0), ...blkSetKind('class'),
      S.set('ps', E.num(0)), S.set('want', E.num(0)), S.set('stK', E.str('')), S.set('wantSuite', E.num(1)),
    ];
  }

  function nameListStmt(kind) {
    return [
      tp1(),
      S.set('tx', E.str('')),
      S.Until(E.or(E.not(E.eq(T(), E.str('I'))), E.not(E.eq(E.var('err'), E.str('')))), [
        S.set('tx', E.join(E.var('tx'), E.join(V(), E.str(',')))),
        tp1(),
        S.If(isO(','), [tp1()]),
      ]),
      ...A.nodeN('t3', E.str(kind), E.var('tx'), []),
      ...finishStmt(E.var('t3')),
    ];
  }

  function importStmt() {
    return [
      tp1(),
      S.set('tx', E.str('')),
      S.Until(E.or(E.not(E.or(E.eq(T(), E.str('I')), isO('.'))), E.not(E.eq(E.var('err'), E.str('')))), [
        S.set('tx', E.join(E.var('tx'), V())),
        tp1(),
        S.If(isO(','), [S.set('tx', E.join(E.var('tx'), E.str(','))), tp1()]),
      ]),
      ...A.nodeN('t3', E.str('import'), E.var('tx'), []),
      ...finishStmt(E.var('t3')),
    ];
  }

  function fromStmt() {
    return [
      tp1(),
      S.set('tx', E.str('')),
      S.Until(E.or(isK('import'), E.not(E.eq(E.var('err'), E.str('')))), [
        S.set('tx', E.join(E.var('tx'), V())), tp1(),
      ]),
      S.set('tx', E.join(E.var('tx'), E.str('#'))),
      tp1(),
      S.Until(E.or(E.not(E.eq(T(), E.str('I'))), E.not(E.eq(E.var('err'), E.str('')))), [
        S.set('tx', E.join(E.var('tx'), E.join(V(), E.str(',')))), tp1(),
        S.If(isO(','), [tp1()]),
      ]),
      ...A.nodeN('t3', E.str('from'), E.var('tx'), []),
      ...finishStmt(E.var('t3')),
    ];
  }

  // ------------------------------------------------ stop resolution
  function resolveStop() {
    const v = () => V();
    return [
      P.reduceCtx(),
      S.If(E.not(E.eq(E.var('err'), E.str(''))), [], [
        S.If(E.eq(P.ctxT(), E.str('M')), [...finalizeCtx()], [
          S.set('t5', V()),
          S.set('t6', E.num(0)),
          S.If(E.and(E.eq(E.var('stK'), E.str('')), E.le(E.var('pvSp'), E.var('pmark'))), [
            ...L.failAt(E.join(E.str('SyntaxError: unexpected '), V()), E.item('TokL', E.var('tp'))),
            S.set('t6', E.num(1)),
          ]),
          S.If(E.eq(E.var('stK'), E.str('')), [
            S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str('='))), [
              ...U.heapNew('stL'), S.set('stC', E.num(0)), ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
              S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
              S.set('stO', E.str('=')), tp1(), S.set('stK', E.str('assign')), S.set('want', E.num(0)), S.set('t6', E.num(1)),
            ]),
            S.If(E.and(E.eq(T(), E.str('O')), isAug(v())), [
              ...U.heapNew('stL'), S.set('stC', E.num(0)), ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
              S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
              S.set('stO', E.str('+')),
              S.If(E.eq(v(), E.str('-=')), [S.set('stO', E.str('-'))]),
              S.If(E.eq(v(), E.str('*=')), [S.set('stO', E.str('*'))]),
              S.If(E.eq(v(), E.str('/=')), [S.set('stO', E.str('/'))]),
              S.If(E.eq(v(), E.str('//=')), [S.set('stO', E.str('//'))]),
              S.If(E.eq(v(), E.str('%=')), [S.set('stO', E.str('%'))]),
              S.If(E.eq(v(), E.str('**=')), [S.set('stO', E.str('**'))]),
              tp1(), S.set('stK', E.str('assign')), S.set('want', E.num(0)), S.set('t6', E.num(1)),
            ]),
            S.If(E.eq(E.var('t6'), E.num(0)), [
              S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
                ...U.heapNew('stL'), S.set('stC', E.num(0)), ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
                S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
                tp1(), S.set('stK', E.str('elist')), S.set('want', E.num(0)), S.set('t6', E.num(1)),
              ]),
            ]),
            S.If(E.eq(E.var('t6'), E.num(0)), [...asExprStmt(E.item('Pv', E.var('pvSp')))]),
          ]),
        ]),
        // ---- pending statement kinds ----
        S.If(E.eq(E.var('t6'), E.num(0)), [
          S.If(E.and(E.eq(E.var('err'), E.str('')), E.gt(E.slen(E.var('stK')), E.num(0))), [...pending()]),
        ]),
      ]),
    ];
  }

  function asExprStmt(ndExpr) {
    return [
      ...A.nodeN('t3', E.str('expr'), E.str(''), [ndExpr]),
      ...finishStmt(E.var('t3')),
      S.If(E.eq(E.var('t6'), E.num(0)), [
        S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
      ]),
    ];
  }

  function pending() {
    const k = () => E.var('stK');
    const v = () => V();
    return [
      // expression list at statement level
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('elist'))), [
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
          tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1)),
        ]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str('='))), [
            ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
            S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
            S.set('stO', E.str('u')), tp1(), S.set('stK', E.str('assign')), S.set('want', E.num(0)), S.set('t6', E.num(1)),
          ]),
        ]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
          S.If(E.eq(E.var('stC'), E.num(1)), [
            ...A.nodeN('t3', E.str('expr'), E.str(''), [heapGet(E.var('stL'), E.num(1))]),
          ], [
            ...nodeFromHeap('t3', E.str('tuple'), E.str(''), E.var('stL'), E.var('stC'), null),
            ...A.nodeN('t4', E.str('expr'), E.str(''), [E.var('t3')]),
            S.set('t3', E.var('t4')),
          ]),
          ...finishStmt(E.var('t3')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          S.set('t6', E.num(1)),
        ]),
      ]),
      // assignment rhs
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('assign'))), [
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str('='))), [
          ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
          tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1)),
        ], [
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          ...U.heapNew('stL2'), ...heapAdd(E.var('stL2'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.set('stC2', E.num(1)),
          tp1(), S.set('want', E.num(0)), S.set('stK', E.str('atuple')), S.set('t6', E.num(1)),
        ], [
          ...nodeFromHeap('t3', E.str('assign'), E.join(E.var('stO'), E.join(E.str('|'), E.var('stC'))),
            E.var('stL'), E.var('stC'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          S.If(E.eq(E.var('err'), E.str('')), [
            ...finishStmt(E.var('t3')),
            S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          ]),
          S.set('t6', E.num(1)),
        ]),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('atuple'))), [
        ...heapAdd(E.var('stL2'), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC2', E.num(1)),
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1)),
        ], [
          ...nodeFromHeap('t5', E.str('tuple'), E.str(''), E.var('stL2'), E.var('stC2'), null),
          ...nodeFromHeap('t3', E.str('assign'), E.join(E.var('stO'), E.join(E.str('|'), E.var('stC'))),
            E.var('stL'), E.var('stC'), E.var('t5')),
          ...finishStmt(E.var('t3')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          S.set('t6', E.num(1)),
        ]),
      ]),
      // if / elif / while header
      S.If(E.or(E.eq(k(), E.str('if')), E.eq(k(), E.str('while'))), [
        S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [
          L.failAt(E.str('SyntaxError: expected :'), E.item('TokL', E.var('tp'))),
        ]),
        ...A.setChild(E.item('BlN', E.var('blSp')), E.num(0), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        S.lset('BlS', E.var('blSp'), E.num(1)),
        tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)), S.set('wantSuite', E.num(1)),
      ]),
      // for target
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hfor'))), [
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
          tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1)),
        ]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          S.If(E.and(E.eq(T(), E.str('K')), E.eq(v(), E.str('in'))), [
            ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
            S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC', E.num(1)),
            ...nodeFromHeap('t3', E.str('tuple'), E.str(''), E.var('stL'), E.var('stC'), null),
            ...A.setChild(E.item('BlN', E.var('blSp')), E.num(0), E.var('t3')),
            tp1(), S.set('noIn', E.num(0)), S.set('want', E.num(0)), S.set('stK', E.str('hfor2')), S.set('t6', E.num(1)),
          ]),
        ]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          L.failAt(E.str('SyntaxError: for needs in'), E.item('TokL', E.var('tp'))),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hfor2'))), [
        S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [
          L.failAt(E.join(E.str('SyntaxError: for want colon got '), E.join(T(), E.join(E.str('/'), v()))), E.item('TokL', E.var('tp'))),
        ]),
        ...A.setChild(E.item('BlN', E.var('blSp')), E.num(1), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        S.lset('BlS', E.var('blSp'), E.num(2)),
        tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)), S.set('wantSuite', E.num(1)),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hyld'))), [
        ...A.nodeN('t3', E.str('yield'), E.str(''), [E.item('Pv', E.var('pvSp'))]),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        ...finishStmt(E.var('t3')),
        S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
        S.set('t6', E.num(1)),
      ]),
      // with [as TARGET]
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hwith'))), [
        S.If(E.and(E.eq(T(), E.str('K')), E.eq(v(), E.str('as'))), [
          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(1), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          tp1(),
          S.If(E.not(E.eq(T(), E.str('I'))), [
            L.failAt(E.str('SyntaxError: with as needs a name'), E.item('TokL', E.var('tp'))),
          ]),
          ...A.nodeN('t3', E.str('name'), V(), []),
          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(0), E.var('t3')),
          tp1(), S.set('want', E.num(0)), S.set('stK', E.str('hwith2')), S.set('t6', E.num(1)),
        ]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [
            L.failAt(E.str('SyntaxError: with wants : or as'), E.item('TokL', E.var('tp'))),
          ]),
          ...A.setChild(E.item('BlN', E.var('blSp')), E.num(1), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          S.lset('BlS', E.var('blSp'), E.num(2)),
          tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)), S.set('wantSuite', E.num(1)),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hwith2'))), [
        S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [
          L.failAt(E.str('SyntaxError: with wants :'), E.item('TokL', E.var('tp'))),
        ]),
        S.lset('BlS', E.var('blSp'), E.num(2)),
        tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)), S.set('wantSuite', E.num(1)),
      ]),
      // return value (possibly a tuple)
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hret'))), [
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          ...U.heapNew('stL2'), ...heapAdd(E.var('stL2'), E.item('Pv', E.var('pvSp'))),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.set('stC2', E.num(1)),
          tp1(), S.set('want', E.num(0)), S.set('stK', E.str('rtuple')), S.set('t6', E.num(1)),
        ], [
          ...A.nodeN('t3', E.str('ret'), E.str(''), [E.item('Pv', E.var('pvSp'))]),
          S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          ...finishStmt(E.var('t3')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          S.set('t6', E.num(1)),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('rtuple'))), [
        ...heapAdd(E.var('stL2'), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)), S.chg('stC2', E.num(1)),
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1)),
        ], [
          ...nodeFromHeap('t5', E.str('tuple'), E.str(''), E.var('stL2'), E.var('stC2'), null),
          ...A.nodeN('t3', E.str('ret'), E.str(''), [E.var('t5')]),
          ...finishStmt(E.var('t3')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          S.set('t6', E.num(1)),
        ]),
      ]),
      // del list
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hdel'))), [
        ...heapAdd(E.var('stL'), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        S.chg('stC', E.num(1)),
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [tp1(), S.set('want', E.num(0)), S.set('t6', E.num(1))]),
        S.If(E.eq(E.var('t6'), E.num(0)), [
          ...nodeFromHeap('t3', E.str('del'), E.str(''), E.var('stL'), E.var('stC'), null),
          ...finishStmt(E.var('t3')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
          S.set('t6', E.num(1)),
        ]),
      ]),
      // assert cond [, msg]
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hasrt'))), [
        ...A.nodeK('t3', E.str('asrt'), E.str(''), 2),
        ...A.setChild(E.var('t3'), E.num(0), E.item('Pv', E.var('pvSp'))),
        S.set('stN', E.var('t3')),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        S.If(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(','))), [
          tp1(), S.set('want', E.num(0)), S.set('stK', E.str('hasrt2')),
        ], [
          ...finishStmt(E.var('stN')),
          S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
        ]),
        S.set('t6', E.num(1)),
      ]),
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hasrt2'))), [
        ...A.setChild(E.var('stN'), E.num(1), E.item('Pv', E.var('pvSp'))),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        ...finishStmt(E.var('stN')),
        S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
        S.set('t6', E.num(1)),
      ]),
      // raise value
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hraise'))), [
        ...A.nodeN('t3', E.str('raise'), E.str(''), [E.item('Pv', E.var('pvSp'))]),
        S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
        ...finishStmt(E.var('t3')),
        S.If(E.or(E.eq(T(), E.str('W')), E.eq(T(), E.str(';'))), [tp1()]),
        S.set('t6', E.num(1)),
      ]),
      // except header:  except [Type [as name]] :
      S.If(E.and(E.eq(E.var('t6'), E.num(0)), E.eq(k(), E.str('hexc'))), [
        S.Until(E.or(E.gt(E.var('t6'), E.num(0)), E.not(E.eq(E.var('err'), E.str('')))), [
          S.If(E.eq(E.var('pvSp'), E.var('stC')), [
            S.set('stN', E.var('noneNd')),
          ], [
            S.set('stN', E.item('Pv', E.var('pvSp'))),
            S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
          ]),
          S.If(E.and(E.eq(T(), E.str('K')), E.eq(v(), E.str('as'))), [
            tp1(),
            S.If(E.eq(T(), E.str('I')), [
              ...A.nodeN('t4', E.str('asname'), V(), []),
              ...A.nodeN('t3', E.str('excas'), E.str(''), [E.var('stN'), E.var('t4')]),
              S.set('stN', E.var('t3')), tp1(),
            ], [
              L.failAt(E.str('SyntaxError: except as needs a name'), E.item('TokL', E.var('tp'))),
            ]),
          ]),
          S.If(E.not(E.and(E.eq(T(), E.str('O')), E.eq(v(), E.str(':')))), [
            L.failAt(E.str('SyntaxError: expected : after except'), E.item('TokL', E.var('tp'))),
          ]),
          ...A.setChild(E.item('BlN', E.var('blSp')), E.item('BlS', E.var('blSp')), E.var('stN')),
          S.lset('BlS', E.var('blSp'), E.add(E.item('BlS', E.var('blSp')), E.num(1))),
          tp1(), S.set('stK', E.str('')), S.set('ps', E.num(0)), S.set('t6', E.num(1)), S.set('wantSuite', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.var('t6'), E.num(0)), [
        ...L.failAt(E.join(E.str('SyntaxError: unexpected '), V()), E.item('TokL', E.var('tp'))),
      ]),
    ];
  }

  // ------------------------------------------------ assembly
  return [
    ...A.clear(),
    ...U.heapNew('noneNd'),
    ...A.nodeK('noneNd2', E.str('lit'), E.str('Z'), 0),
    S.set('noneNd', E.var('noneNd2')),
    S.set('tp', E.num(1)),
    S.set('pvSp', E.num(0)), S.set('pkSp', E.num(0)), S.set('poSp', E.num(0)), S.set('pcSp', E.num(0)),
    S.set('suSp', E.num(0)), S.set('blSp', E.num(0)), S.set('noIn', E.num(0)),
    S.ldelall('Pv'), S.ldelall('Pk'), S.ldelall('Po'),
    S.ldelall('PcT'), S.ldelall('PcA'), S.ldelall('PcB'), S.ldelall('PcD'), S.ldelall('PcE'),
    S.ldelall('SuN'), S.ldelall('BlN'), S.ldelall('BlS'), S.ldelall('BlK'),
    S.set('stK', E.str('')), S.set('ps', E.num(0)),
    S.set('wantSuite', E.num(0)), S.set('ssDepth', E.num(0)), S.set('curLine', E.num(1)),
    ...U.heapNew('t4'),
    ...A.nodeK('rootNd', E.str('suite'), E.var('t4'), 0),
    ...L.pushL('SuN', 'suSp', E.var('rootNd')),
    S.Until(E.or(E.not(E.eq(E.var('err'), E.str(''))), E.eq(T(), E.str('E'))), [
      S.chg('pgi', E.num(1)),
      S.If(E.gt(E.var('pgi'), E.num(30000)), [
        ...L.failAt(E.join(E.str('ParserError: stuck ps='), E.join(E.var('ps'),
          E.join(E.str(' tp='), E.join(E.var('tp'), E.join(E.str(' stK='), E.join(E.var('stK'),
            E.join(E.str(' tok='), E.join(T(), E.join(E.str('/'), V()))))))))),
          E.item('TokL', E.var('tp'))),
      ]),
      S.If(E.eq(E.var('ps'), E.num(0)), [...stmtStart()], [
        S.set('stop', E.num(0)),
        S.set('igl', E.num(0)),
        S.Until(E.or(E.eq(E.var('stop'), E.num(1)), E.not(E.eq(E.var('err'), E.str('')))), [
          S.chg('igl', E.num(1)),
          S.If(E.gt(E.var('igl'), E.num(3000)), [
            ...L.failAt(E.join(E.str('ParserError: expr loop tok='), E.join(T(), E.join(E.str('/'), V()))),
              E.item('TokL', E.var('tp'))),
          ]),
          S.If(E.and(E.eq(E.var('want'), E.num(0)), E.not(E.and(E.eq(T(), E.str('O')), E.or(
            E.eq(V(), E.str(')')), E.or(E.eq(V(), E.str(']')), E.or(E.eq(V(), E.str('}')),
            E.or(E.eq(V(), E.str(':')), E.eq(V(), E.str(','))))))))), [...atomStep()], [...infixStep()]),
        ]),
        S.If(E.eq(E.var('err'), E.str('')), [...resolveStop()]),
      ]),
    ]),
  ];
}

function setup(em) {
  em.defineProc('Interpreter', 'parse_all', [], () => build(), true);
}

module.exports = { build, setup };