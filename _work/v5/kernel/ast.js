'use strict';
/**
 * v5 AST helpers.  Nodes live in flat parallel lists:
 *   NdK[i] kind   NdA[i] aux   NdS[i] first child slot in NdC   NdN[i] child count
 * Nodes are built bottom up; compound statements reserve their child slots and
 * fill them later with a single list write (O(1), never insert/delete).
 */
const { E, S } = require('../dsl.js');
const L = require('./lib.js');

const childOf = (nd, k) => E.item('NdC', E.add(E.item('NdS', nd), E.num(k)));
const kindOf = (nd) => E.item('NdK', nd);
const auxOf = (nd) => E.item('NdA', nd);
const nkids = (nd) => E.item('NdN', nd);

function clear() {
  return [S.ldelall('NdK'), S.ldelall('NdA'), S.ldelall('NdS'), S.ldelall('NdN'),
    S.ldelall('NdC'), S.ldelall('NdL'), S.set('nTop', E.num(0))];
}

/** create node with the given child expressions, result id in dst */
function nodeN(dst, kind, aux, kids) {
  return [
    S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')),
    S.set(dst, E.var('nTop')),
    ...L.setAt('NdK', E.var(dst), kind),
    ...L.setAt('NdA', E.var(dst), aux),
    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),
    ...L.setAt('NdN', E.var(dst), E.num(kids.length)),
    ...L.setAt('NdL', E.var(dst), E.var('curLine')),
    ...kids.map((k) => S.ladd('NdC', k)),
  ];
}

/** create node with dst in a reserved child slot, results in dst */
function setChild(ndExpr, k, childExpr) {
  // k is either a build-time JS number or an already-built Scratch expression
  const kk = (typeof k === 'number') ? E.num(k) : k;
  return [S.lset('NdC', E.add(E.item('NdS', ndExpr), kk), childExpr)];
}

/** create node with n empty child slots (filled later) */
function nodeK(dst, kind, aux, n) {
  return [
    S.chg('nTop', E.num(1)), S.ladd('NdG', E.str('')),
    S.set(dst, E.var('nTop')),
    ...L.setAt('NdK', E.var(dst), kind),
    ...L.setAt('NdA', E.var(dst), aux),
    ...L.setAt('NdS', E.var(dst), E.add(E.len('NdC'), E.num(1))),
    ...L.setAt('NdG', E.var(dst), E.str('')),
    ...L.setAt('NdN', E.var(dst), E.num(n)),
    ...L.setAt('NdL', E.var(dst), E.var('curLine')),
    ...Array.from({ length: n }, () => S.ladd('NdC', E.num(0))),
  ];
}

module.exports = { childOf, kindOf, auxOf, nkids, clear, nodeN, nodeK, setChild };
