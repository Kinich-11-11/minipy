'use strict';
const assert = require('node:assert/strict');
const { Graph, unique } = require('../graph.cjs');

// List slots storing !/& encode a stable RefData826 ID. A nested mutation
// writes the referent, not a replacement value into that particular slot.
module.exports = {
  id: 'nested-reference-writeback',
  after: [],
  writes: ['heap.nested-index-writeback', 'path.state', 'RUN.pathState'],
  requiresCore: '5a93246a42b80136db3ee99a3432b3c57cfc75362f1d894867c327c7a8ab5420',
  apply(p) {
    const g = new Graph(p, 'nested-reference-writeback'),
      b = g.b;
    const ref = 'path receiver ref',
      i = 'path ref row',
      key = 'path ref key',
      cut = 'path ref separator',
      nm = 'path ref name';
    for (const n of [ref, i, key, cut, nm]) g.gen.addVar('Interpreter', n, '');
    const eq = (a, c) => g.op('equals', a, c),
      gt = (a, c) => g.op('gt', a, c),
      or = (a, c) => g.block('operator_or', { OPERAND1: [2, a], OPERAND2: [2, c] }),
      and = (a, c) => g.block('operator_and', { OPERAND1: [2, a], OPERAND2: [2, c] }),
      not = (a) => g.block('operator_not', { OPERAND: [2, a] });
    const replace = (list, at, value) =>
      g.block('data_replaceitemoflist', { INDEX: g.rep(at), ITEM: g.rep(value) }, g.gen.LISTF(list));
    const numOf = (list, value) =>
      g.block('data_itemnumoflist', { ITEM: g.rep(value) }, g.gen.LISTF(list));
    const size = (value) => g.block('operator_length', { STRING: g.rep(value) });
    const letter = (at, value) =>
      g.block('operator_letter_of', { LETTER: g.rep(at), STRING: g.rep(value) });
    const until = (cond, body) => {
      const k = g.block('control_repeat_until', { CONDITION: [2, cond] });
      g.sub(k, body);
      return k;
    };
    const peek = () => g.item('VStack', g.len('VStack'));
    const save = (names) => names.map((n) => g.add('VStack', g.v(n)));
    const restore = (names) =>
      [...names].reverse().flatMap((n) => [g.set(n, peek()), g.del('VStack', g.text('last'))]);

    const commit = 'path commit reference %s %s %s';
    const def = g.define(commit, ['id', 'data', 'kind']);
    const regs = ['ev', 'evtype', 'evK', 'found'];
    const bind = 'path publish binding %s %s %s';
    g.body(g.define(bind, ['name', 'data', 'kind']), [
      g.call('assign %s %s %s', g.arg('name'), g.arg('data'), g.arg('kind')),
      g.call('publish %s', g.arg('name')),
    ]);
    // Update only a currently resolvable binding with the same exact scoped
    // ref row. Never match mutable objects by their serialized contents.
    g.body(def, [
      replace('RefData826', g.arg('id'), g.arg('data')),
      g.branch(gt(numOf('RefIds826', g.arg('id')), g.num(0)), [
        ...save(regs),
        g.set(i, g.num(1)),
        until(gt(g.v(i), g.len('RefIds826')), [
          g.branch(eq(g.item('RefIds826', g.v(i)), g.arg('id')), [
            g.set(key, g.item('RefKeys826', g.v(i))),
            g.set(cut, g.num(1)),
            until(
              or(gt(g.v(cut), size(g.v(key))), eq(letter(g.v(cut), g.v(key)), g.text('|'))),
              [g.change(cut, 1)],
            ),
            g.branch(not(gt(g.v(cut), size(g.v(key)))), [
              g.call('substr %s %s %s', g.v(key), g.op('add', g.v(cut), g.num(1)), size(g.v(key))),
              g.set(nm, g.v('ev')),
              g.call('refFind826 %s %s', g.v(nm), g.len('FrGen')),
              g.branch(and(eq(g.v('rRow826'), g.v(i)), eq(g.v('rId826'), g.arg('id'))), [
                g.call('lookup %s', g.v(nm)),
                g.branch(and(gt(g.v('found'), g.num(0)), eq(g.item('Types', g.v('found')), g.arg('kind'))), [
                  ...save([i]),
                  g.call(bind, g.v(nm), g.arg('data'), g.arg('kind')),
                  ...restore([i]),
                ]),
              ]),
            ]),
          ]),
          g.change(i, 1),
        ]),
        ...restore(regs),
      ]),
    ]);

    const path = g.proc('pathset %s %s %s %s');
    const main = unique(g.entries(path).filter((k) => b[k].opcode === 'control_if_else'), 'path dispatch');
    const cmds = g.chain(b[main].inputs.SUBSTACK[1]);
    const name = (k, n) => b[k].fields.VARIABLE?.[0] === n;
    const literal = (k, n) => Object.values(b[k].inputs)[0]?.[1]?.[1] === n;
    const prefix = unique(cmds.filter((k) => name(k, 'w9pi')), 'receiver evaluation anchor');
    assert.equal(b[b[prefix].next].mutation.proccode, 'evalCtx828 %s %s %s');
    g.body(prefix, [g.set('valueRef827', g.num(0)), ...g.chain(b[prefix].next)]);
    const tmp = unique(
      cmds.filter((k) => b[k].mutation?.proccode === 'assign %s %s %s' && literal(k, '__pw')),
      'temporary receiver',
    );
    const mutable = or(eq(g.v('evtype'), g.text('L')), eq(g.v('evtype'), g.text('D')));
    const indexed = eq(g.item('Tok', g.op('subtract', g.v('w7br'), g.num(1))), g.text(']'));
    const proven = and(gt(g.v('valueRef827'), g.num(0)), eq(g.v('valueRef827'), g.v('itemRef827')));
    // Save across the synthetic indexset, whose own evaluation overwrites the
    // expression result reference. Pop before the existing error branch.
    g.body(b[tmp].parent, [
      g.set(ref, g.num(0)),
      g.branch(and(and(mutable, indexed), proven), [g.set(ref, g.v('valueRef827'))]),
      g.add('VStack', g.v(ref)),
      ...g.chain(tmp),
    ]);
    const reset = unique(cmds.filter((k) => name(k, 'rid') && literal(k, '0')), 'indexset completed');
    g.body(reset, [g.set(ref, peek()), g.del('VStack', g.text('last')), ...g.chain(b[reset].next)]);
    const recurse = unique(
      cmds.filter((k) => b[k].mutation?.proccode === 'pathset %s %s %s %s'),
      'recursive writeback',
    );
    const parent = b[recurse].parent,
      tail = b[recurse].next;
    g.body(parent, [
      g.branch(gt(g.v(ref), g.num(0)), [g.call(commit, g.v(ref), g.v('w7nv'), g.v('w7nt'))], [recurse]),
      ...g.chain(tail),
    ]);

    // The old pathset returned early on error/tuple branches without decrementing
    // w7dep, so later successful mutations stopped removing temporary names.
    // Share its existing normal epilogue across all early exits. Our saved
    // reference is already popped before the synthetic indexset error branch.
    const leave = 'path leave';
    const epilogue = g.chain(b[main].next);
    assert.equal(epilogue.length, 2);
    assert(name(epilogue[0], 'w7dep') && b[epilogue[0]].opcode === 'data_changevariableby');
    assert.equal(b[epilogue[1]].opcode, 'control_if');
    const leaveDef = g.define(leave, []);
    g.body(main, [g.call(leave)]);
    g.body(leaveDef, epilogue);
    const stops = g.within(
      path,
      (x) => x.opcode === 'control_stop' && x.fields.STOP_OPTION?.[0] === 'this script',
    );
    assert(stops.length > 0);
    for (const stop of stops) {
      const owner = b[stop].parent;
      const next = [g.call(leave), ...g.chain(stop)];
      if (b[owner].next === stop) g.body(owner, next);
      else {
        const slot = unique(
          Object.keys(b[owner].inputs).filter((n) => n.startsWith('SUBSTACK') && b[owner].inputs[n][1] === stop),
          'early exit owner',
        );
        g.sub(owner, next, slot);
      }
    }
    // HALT can cancel before any epilogue runs. New RUN must not inherit
    // the aborted path depth or private evaluation stack from its predecessor.
    const run = g.hat('RUN');
    const resetPwr = unique(g.entries(run).filter((k) => name(k, 'pwr') && literal(k, '0')), 'RUN path reset');
    g.body(resetPwr, [
      g.set('w7dep', g.num(0)),
      g.set('rid', g.num(0)),
      g.set('p8mut', g.num(0)),
      g.set(ref, g.num(0)),
      g.clear('VStack'),
      ...g.chain(b[resetPwr].next),
    ]);
    return {
      nestedWriteback: true,
      referenceBindingSync: true,
      balancedPathExits: stops.length + 1,
      resetPathStateOnRun: true,
    };
  },
};
