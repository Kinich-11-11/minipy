'use strict';
/**
 * v5 Parser.  One flat state machine (leaf): statement start <-> expression
 * shunting-yard loop.  Suites are heap list objects so statements append in O(1).
 */
const { E, S } = require('../dsl.js');
const A = require('./ast.js');
const L = require('./lib.js');
const P = require('./pexpr.js');

const T = P.T, V = P.V;
const isO = P.isO, isK = P.isK;

// ------------------------------------------------------------ heap objects
function heapNew(dst) {
  return [
    S.chg('hTop', E.num(1)),
    S.set(dst, E.var('hTop')),
    ...L.setAt('LStart', E.var(dst), E.add(E.len('LArr'), E.num(1))),
    ...L.setAt('LCount', E.var(dst), E.num(0)),
    ...L.setAt('LCap', E.var(dst), E.num(0)),
  ];
}
function heapAdd(objExpr, valExpr) {
  return [
    S.set('ho', objExpr),
    S.If(E.lt(E.item('LCount', E.var('ho')), E.item('LCap', E.var('ho'))), [], [
      S.set('ncap', E.num(4)),
      S.If(E.gt(E.mul(E.item('LCount', E.var('ho')), E.num(2)), E.num(4)), [
        S.set('ncap', E.mul(E.item('LCount', E.var('ho')), E.num(2))),
      ]),
      S.set('nst', E.add(E.len('LArr'), E.num(1))),
      S.set('i', E.num(1)),
      S.Repeat(E.item('LCount', E.var('ho')), [
        S.ladd('LArr', E.item('LArr', E.add(E.item('LStart', E.var('ho')), E.sub(E.var('i'), E.num(1))))),
        S.chg('i', E.num(1)),
      ]),
      S.Repeat(E.sub(E.var('ncap'), E.item('LCount', E.var('ho'))), [S.ladd('LArr', E.str(''))]),
      S.lset('LStart', E.var('ho'), E.var('nst')),
      S.lset('LCap', E.var('ho'), E.var('ncap')),
    ]),
    S.lset('LArr', E.add(E.item('LStart', E.var('ho')), E.item('LCount', E.var('ho'))), valExpr),
    S.lset('LCount', E.var('ho'), E.add(E.item('LCount', E.var('ho')), E.num(1))),
  ];
}
const heapGet = (objExpr, iExpr) =>
  E.item('LArr', E.add(E.item('LStart', objExpr), E.sub(iExpr, E.num(1))));

// ------------------------------------------------------------ node helpers
function nodeFromStack(dst, kind, aux, baseExpr, cntExpr, kwDst) {
  const st = [
    S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')),
    S.set(dst, E.var('nTop')),
    ...L.setAt('NdK', E.var(dst), kind),
    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),
    ...L.setAt('NdL', E.var(dst), E.var('curLine')),
    S.set('i', E.num(0)),
  ];
  if (kwDst) st.push(S.set(kwDst, E.str('')));
  st.push(S.Until(E.ge(E.var('i'), cntExpr), [
    S.ladd('NdC', E.item('Pv', E.add(baseExpr, E.var('i')))),
    ...(kwDst ? [S.If(E.gt(E.var('i'), E.num(0)), [S.set(kwDst, E.join(E.var(kwDst), E.str(',')))]),
      S.set(kwDst, E.join(E.var(kwDst), E.item('Pk', E.add(baseExpr, E.var('i')))))] : []),
    S.chg('i', E.num(1)),
  ]));
  st.push(...L.setAt('NdA', E.var(dst), aux));
  st.push(...L.setAt('NdN', E.var(dst), cntExpr));
  st.push(S.chg('pvSp', E.mul(E.num(-1), cntExpr)));
  st.push(S.chg('pkSp', E.mul(E.num(-1), cntExpr)));
  return st;
}

module.exports = { heapNew, heapAdd, heapGet, nodeFromStack, T, V, isO, isK };
