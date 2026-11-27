'use strict';
const assert = require('node:assert/strict');
const { Graph, sweep } = require('../graph.cjs');
// A line remains pending only until the next significant line at its own or a
// shallower indent. Each line is pushed once and popped at most once (O(n)).
module.exports = {
  id: 'layout',
  after: ['source'],
  writes: ['prepare.layout'],
  apply(p) {
    const g = new Graph(p, 'layout'),
      b = g.b,
      proc = g.proc('prepare'),
      top = g.entries(proc),
      loops = top.filter((k) => b[k].opcode === 'control_repeat');
    assert.equal(loops.length, 2);
    const [first, oldEnds] = loops,
      oldElse = top[top.indexOf(oldEnds) + 1];
    assert.equal(b[oldElse].opcode, 'control_if');
    const rows = 'Layout rows',
      heads = 'Layout heads',
      prior = 'layout prior',
      bad = 'layout error row';
    for (const n of [rows, heads]) g.gen.addList('Interpreter', n, []);
    for (const n of [prior, bad]) g.gen.addVar('Interpreter', n, 0);
    const decl = 'layout accept line',
      def = g.define(decl);
    const last = g.text('last');
    const lastRow = () => g.item(rows, last),
      lastIndent = () => g.item('Indents', lastRow());
    const eq = (a, v) => g.op('equals', a, g.text(v)),
      match = (reg, ...vs) =>
        vs
          .map((s) => eq(g.v(reg), s))
          .reduce((a, b) => g.block('operator_or', { OPERAND1: [2, a], OPERAND2: [2, b] }));
    const not = (a) => g.block('operator_not', { OPERAND: [2, a] }),
      and = (a, b) => g.block('operator_and', { OPERAND1: [2, a], OPERAND2: [2, b] }),
      or = (a, b) => g.block('operator_or', { OPERAND1: [2, a], OPERAND2: [2, b] });
    const replace = (n, i, v) =>
      g.block('data_replaceitemoflist', { INDEX: g.rep(i), ITEM: g.rep(v) }, g.gen.LISTF(n));
    const loop = g.block('control_repeat_until', {
      CONDITION: [2, or(eq(g.len(rows), 0), g.op('lt', lastIndent(), g.v('indent')))],
    });
    const same = g.branch(g.op('equals', lastIndent(), g.v('indent')), [
      g.set(prior, g.item(heads, last)),
      g.branch(match('prevhead', 'else', 'elif', 'except', 'finally'), [
        replace('Elses', lastRow(), g.v('ei')),
      ]),
    ]);
    g.sub(loop, [replace('Ends', lastRow(), g.v('ei')), same, g.del(rows, last), g.del(heads, last)]);
    const clause = g.branch(match('prevhead', 'else', 'elif'), [
      g.branch(and(eq(g.v(bad), 0), not(match(prior, 'if', 'elif', 'for', 'while', 'except', 'try'))), [
        g.set(bad, g.v('ei')),
      ]),
      g.branch(and(match('prevhead', 'else'), match(prior, 'for', 'while')), [
        replace('LoopElse', g.v('ei'), g.num(1)),
      ]),
    ]);
    g.body(def, [
      g.set(prior, g.text('')),
      loop,
      clause,
      g.add(rows, g.v('ei')),
      g.add(heads, g.v('prevhead')),
    ]);
    const scan = g.chain(b[first].inputs.SUBSTACK[1]),
      endDefault = scan.find((k) => b[k].fields.LIST?.[0] === 'Ends');
    assert(endDefault);
    g.plug(endDefault, 'ITEM', g.rep(g.op('add', g.len('Src267'), g.num(1))));
    g.sub(first, [
      ...scan.slice(0, -1),
      g.branch(not(g.op('lt', g.v('indent'), g.num(0))), [g.call(decl)]),
      scan.at(-1),
    ]);
    const skipped = new Set([top[top.indexOf(oldEnds) - 1], oldEnds, oldElse]);
    assert.equal(b[top[top.indexOf(oldEnds) - 1]].fields.VARIABLE[0], 'ei');
    const finish = g.branch(and(eq(g.v('error'), ''), g.op('gt', g.v(bad), g.num(0))), [
      g.set('pc', g.v(bad)),
      g.call('fail %s', g.text('SyntaxError: elif/else without if')),
    ]);
    const commands = top.flatMap((k) =>
      k === first
        ? [g.clear(rows), g.clear(heads), g.set(bad, g.num(0)), k, g.clear(rows), g.clear(heads)]
        : k === oldElse
          ? [finish]
          : skipped.has(k)
            ? []
            : [k],
    );
    g.body(proc, commands);
    return {
      removedBlocks: sweep(g.t),
      algorithm: 'one forward pass; two bounded temporary stack columns',
    };
  },
};
