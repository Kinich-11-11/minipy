'use strict';
const { Graph } = require('../graph.cjs');
// alrec already links lexical cells for function-local aliases, but module
// aliases only had serialized name/value snapshots. A borrowed parameter writes
// through its caller's cell: all true aliases need to participate in that graph.
module.exports = {
  id: 'owners',
  after: ['names'],
  writes: ['heap.cells'],
  apply(p) {
    const g = new Graph(p, 'owners'),
      r = g.proc('alrec %s %s'),
      write = g.proc('cellWrite763 %s %s %s');
    const eq = (a, v) => g.op('equals', a, g.num(v));
    const and = (a, b) => g.block('operator_and', { OPERAND1: [2, a], OPERAND2: [2, b] });
    const globalAlias = and(eq(g.len('FrGen'), 0), eq(g.v('copy775'), 0));
    const mutable = ['L', 'D', 'E']
      .map((t) => g.op('equals', g.item('Types', g.v('found')), g.text(t)))
      .reduce((a, b) => g.block('operator_or', { OPERAND1: [2, a], OPERAND2: [2, b] }));
    g.body(r, [
      ...g.entries(r),
      g.branch(and(globalAlias, mutable), [
        g.call('nameEq776 %s %s', g.arg('src'), g.arg('target')),
        g.branch(eq(g.v('cs776ok'), 0), [
          g.call('aliasDrop767 %s', g.arg('target')),
          g.call('aliasCell767 %s %s', g.arg('src'), g.num(0)),
          g.set('a767s', g.v('cc763')),
          g.call('aliasCell767 %s %s', g.arg('target'), g.num(0)),
          g.branch(and(g.op('gt', g.v('a767s'), g.num(0)), g.op('gt', g.v('cc763'), g.num(0))), [
            g.add('AliasCellN', g.v('a767s')),
            g.add('AliasCellT', g.v('cc763')),
          ]),
        ]),
      ]),
    ]);
    // Unbinding a name is NOT a mutation of its former referent. Captured uses
    // of that same lexical cell still see U, but unrelated bindings stay live.
    g.body(write, [
      g.branch(g.op('equals', g.arg('t'), g.text('U')), [g.call('aliasDrop767 %s', g.arg('name'))]),
      ...g.entries(write),
    ]);
    return { sharedCellGraph: true };
  },
};
