'use strict';
/**
 * v5 Parser - shunting-yard expressions + an explicit block/suite stack.
 * No Scratch recursion anywhere: all state is in lists with manual pointers.
 */
const { E, S } = require('../dsl.js');
const A = require('./ast.js');
const L = require('./lib.js');

// token accessors
const T = () => E.item('TokT', E.var('tp'));
const V = () => E.item('TokV', E.var('tp'));
const isT = (t) => E.eq(T(), E.str(t));
const isO = (v) => E.and(E.eq(T(), E.str('O')), E.eq(V(), E.str(v)));
const isK = (v) => E.and(E.eq(T(), E.str('K')), E.eq(V(), E.str(v)));

// operators that are binary in MiniPy
const BINOPS = ' + - * / // % ** == != < > <= >= | ^ & << >> ';
const CMPOPS = ' == != < > <= >= ';
const isBin = (v) => E.contains(E.str(BINOPS), E.join(E.str(' '), E.join(v, E.str(' '))));
const isCmp = (v) => E.contains(E.str(CMPOPS), E.join(E.str(' '), E.join(v, E.str(' '))));
const isUnOp = (o) => E.or(E.eq(o, E.str('neg')), E.or(E.eq(o, E.str('pos')), E.or(E.eq(o, E.str('inv')), E.eq(o, E.str('not')))));

// precedence of a normalised operator name
const precOf = (o) => E.var('pc0');   // filled by precBlock below

function precBlock(dst, oExpr) {
  // or1 and2 not3 cmp4 |5 ^6 &7 <<8 +-9 */ // %10 unary11 **12
  return [
    S.set(dst, E.num(0)),
    S.If(E.eq(oExpr, E.str('or')), [S.set(dst, E.num(1))]),
    S.If(E.eq(oExpr, E.str('and')), [S.set(dst, E.num(2))]),
    S.If(E.eq(oExpr, E.str('not')), [S.set(dst, E.num(3))]),
    S.If(isCmp(oExpr), [S.set(dst, E.num(4))]),
    S.If(E.or(E.eq(oExpr, E.str('in')), E.eq(oExpr, E.str('notin'))), [S.set(dst, E.num(4))]),
    S.If(E.or(E.eq(oExpr, E.str('is')), E.eq(oExpr, E.str('isnot'))), [S.set(dst, E.num(4))]),
    S.If(E.eq(oExpr, E.str('|')), [S.set(dst, E.num(5))]),
    S.If(E.eq(oExpr, E.str('^')), [S.set(dst, E.num(6))]),
    S.If(E.eq(oExpr, E.str('&')), [S.set(dst, E.num(7))]),
    S.If(E.or(E.eq(oExpr, E.str('<<')), E.eq(oExpr, E.str('>>'))), [S.set(dst, E.num(8))]),
    S.If(E.or(E.eq(oExpr, E.str('+')), E.eq(oExpr, E.str('-'))), [S.set(dst, E.num(9))]),
    S.If(E.or(E.eq(oExpr, E.str('*')), E.or(E.eq(oExpr, E.str('/')), E.or(E.eq(oExpr, E.str('//')), E.eq(oExpr, E.str('%'))))), [S.set(dst, E.num(10))]),
    S.If(E.or(E.eq(oExpr, E.str('neg')), E.or(E.eq(oExpr, E.str('pos')), E.or(E.eq(oExpr, E.str('inv')), E.eq(oExpr, E.str('u+'))))), [S.set(dst, E.num(11))]),
    S.If(E.eq(oExpr, E.str('**')), [S.set(dst, E.num(12))]),
    S.If(E.eq(oExpr, E.str('if')), [S.set(dst, E.num(-1))]),
    S.If(E.eq(oExpr, E.str('else')), [S.set(dst, E.num(-2))]),
  ];
}

// ---------------------------------------------------------------- stacks
// the kwarg name for the value about to be pushed lives in `kwpend`
const pushV = (nd) => [...L.pushRow('pvSp', [['Pv', nd], ['Pk', E.var('kwpend')]]), S.set('kwpend', E.str(''))];
const pushO = (op) => L.pushL('Po', 'poSp', typeof op === 'string' ? E.str(op) : op);
const popV = () => [S.set('v0', E.item('Pv', E.var('pvSp'))), S.set('k0', E.item('Pk', E.var('pvSp'))), S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1))];
const topV = () => E.item('Pv', E.var('pvSp'));
const pushCtx = (t, c) => L.pushRow('pcSp', [
  ['PcT', E.str(t)], ['PcA', E.var('pvSp')], ['PcB', E.var('poSp')],
  ['PcD', E.num(c || 0)], ['PcE', E.num(0)],
]);
const ctxT = () => E.item('PcT', E.var('pcSp'));
const ctxA = () => E.item('PcA', E.var('pcSp'));
const ctxB = () => E.item('PcB', E.var('pcSp'));
const ctxD = () => E.item('PcD', E.var('pcSp'));
const ctxE = () => E.item('PcE', E.var('pcSp'));

/** pop an operator and fold it into a node */
function reduceOne() {
  return [
    S.set('o0', E.item('Po', E.var('poSp'))),
    S.chg('poSp', E.num(-1)),
    S.set('r0', E.item('Pv', E.var('pvSp'))),
    S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
    S.If(isUnOp(E.var('o0')), [
      S.set('o1', E.str('neg')),
      S.If(E.eq(E.var('o0'), E.str('pos')), [S.set('o1', E.str('pos'))]),
      S.If(E.eq(E.var('o0'), E.str('inv')), [S.set('o1', E.str('inv'))]),
      S.If(E.eq(E.var('o0'), E.str('not')), [S.set('o1', E.str('not'))]),
      ...A.nodeN('t3', E.str('un'), E.var('o1'), [E.var('r0')]),
      ...pushV(E.var('t3'), E.str('')),
    ], [
      S.set('l0', E.item('Pv', E.var('pvSp'))),
      S.chg('pvSp', E.num(-1)), S.chg('pkSp', E.num(-1)),
      S.If(E.eq(E.var('o0'), E.str('if')), [
        ...A.nodeN('t3', E.str('ifpart'), E.str(''), [E.var('l0'), E.var('r0')]),
        ...pushV(E.var('t3'), E.str('')),
      ], [
        S.If(E.eq(E.var('o0'), E.str('else')), [
          S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')), S.set('t3', E.var('nTop')),
          ...L.setAt('NdK', E.var('t3'), E.str('tern')),
          ...L.setAt('NdA', E.var('t3'), E.str('')),
          ...L.setAt('NdS', E.var('t3'), E.add(E.len('NdC'), E.num(1))),
          S.ladd('NdC', E.item('NdC', E.item('NdS', E.var('l0')))),
          S.ladd('NdC', E.item('NdC', E.add(E.item('NdS', E.var('l0')), E.num(1)))),
          S.ladd('NdC', E.var('r0')),
          ...L.setAt('NdN', E.var('t3'), E.num(3)),
          ...pushV(E.var('t3'), E.str('')),
        ], [
          // a comparison whose left operand is already a comparison (and was not
          // parenthesised) extends the chain instead of nesting: a < b < c means
          // a < b and b < c, not (a < b) < c.
          S.set('nc0', E.num(2)),
          S.If(E.and(isCmp(E.var('o0')), E.not(E.eq(E.item('NdG', E.var('l0')), E.str('p')))), [
            S.If(E.eq(E.item('NdK', E.var('l0')), E.str('cmp')), [S.set('nc0', E.num(3))]),
            S.If(E.and(E.eq(E.item('NdK', E.var('l0')), E.str('bin')), isCmp(E.item('NdA', E.var('l0')))), [
              S.set('nc0', E.num(3)),
            ]),
          ]),
          S.If(E.eq(E.var('nc0'), E.num(3)), [
            ...extendCmp(),
          ], [
            ...A.nodeN('t3', E.str('bin'), E.var('o0'), [E.var('l0'), E.var('r0')]),
            ...pushV(E.var('t3'), E.str('')),
          ]),
        ]),
      ]),
    ]),
  ];
}

/** chained comparison: copy l0's children, append r0, extend the operator list */
function extendCmp() {
  return [
    S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')),
    S.set('t3', E.var('nTop')),
    ...L.setAt('NdK', E.var('t3'), E.str('cmp')),
    // l0 is either an existing chain (ops 'a,b') or a single comparison bin (op 'a')
    S.set('cops', E.item('NdA', E.var('l0'))),
    S.set('cnum', E.item('NdN', E.var('l0'))),
    S.If(E.eq(E.item('NdK', E.var('l0')), E.str('bin')), [S.set('cnum', E.num(2))]),
    ...L.setAt('NdA', E.var('t3'), E.join(E.var('cops'), E.join(E.str(','), E.var('o0')))),
    ...L.setAt('NdS', E.var('t3'), E.add(E.len('NdC'), E.num(1))),
    S.set('i', E.num(1)),
    S.Repeat(E.var('cnum'), [
      S.ladd('NdC', E.item('NdC', E.add(E.item('NdS', E.var('l0')), E.sub(E.var('i'), E.num(1))))),
      S.chg('i', E.num(1)),
    ]),
    S.ladd('NdC', E.var('r0')),
    ...L.setAt('NdN', E.var('t3'), E.add(E.var('cnum'), E.num(1))),
    ...pushV(E.var('t3'), E.str('')),
  ];
}

/** reduce every operator belonging to the current context */
function reduceCtx() {
  return S.Until(E.le(E.var('poSp'), ctxB()), [reduceOne()]);
}

module.exports = { T, V, isT, isO, isK, isBin, isCmp, isUnOp, precBlock, precOf,
  pushV, pushO, popV, topV, pushCtx, ctxT, ctxA, ctxB, ctxD, ctxE, reduceOne, reduceCtx, extendCmp };
