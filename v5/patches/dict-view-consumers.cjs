'use strict';
const assert = require('node:assert/strict');
const { Graph, unique } = require('../graph.cjs');

// K/V/I values hold a RefData826 row ID, not a serialized sequence. Resolve
// that ID at each consuming boundary, retaining the live view representation.
module.exports = {
  id: 'dict-view-consumers',
  after: [],
  writes: ['dict.view.consumers'],
  requiresCore: '5a93246a42b80136db3ee99a3432b3c57cfc75362f1d894867c327c7a8ab5420',
  apply(p) {
    const g = new Graph(p, 'dict-view-consumers'), b = g.b;
    const format = g.proc('strval %s %s');
    const fmt = unique(g.within(format, (x) =>
      x.mutation?.proccode === 'listfmt %s' &&
      b[x.parent]?.opcode === 'control_if_else' &&
      g.within(b[x.parent].inputs.CONDITION[1], (y) =>
        y.inputs.OPERAND2?.[1]?.[1] === 'K').length), 'view formatting');
    const fmtBranch = b[fmt].parent;
    assert.equal(b[fmtBranch].inputs.SUBSTACK[1], fmt);
    g.sub(fmtBranch, [g.call('view826 %s %s', g.arg('vv'), g.arg('vt')), ...g.chain(fmt)]);

    const comp = g.proc('cdo %s %s %s %s %s');
    const capture = unique(g.within(comp, (x) =>
      x.opcode === 'data_setvariableto' && x.fields.VARIABLE[0] === 'cltyp' &&
      x.inputs.VALUE[1]?.[1] === 'evtype'), 'comprehension iterable type capture');
    assert.equal(b[b[capture].next].opcode, 'control_if');
    const is = (kind) => g.op('equals', g.v('cltyp'), g.text(kind));
    const or = (a, c) => g.block('operator_or', { OPERAND1: [2, a], OPERAND2: [2, c] });
    const convert = g.branch(or(or(is('K'), is('V')), is('I')), [
      g.call('view826 %s %s', g.v('clist'), g.v('cltyp')),
      g.set('clist', g.v('ev')),
      g.set('cltyp', g.text('L')),
    ]);
    g.body(capture, [convert, ...g.chain(b[capture].next)]);
    return { representationConsumers: 2 };
  },
};
