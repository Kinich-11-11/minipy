'use strict';
const assert = require('node:assert/strict');
const { Graph, sweep } = require('../graph.cjs');
// Scratch list fields are static: specialize one exact-name scan for each
// table at build time, instead of a runtime table switch or an invalidatable cache.
module.exports = {
  id: 'names',
  after: ['ownership'],
  writes: ['names.lookup'],
  apply(p) {
    const g = new Graph(p, 'names'),
      b = g.b;
    function scan(table, key, pos, result, boolean = false) {
      const item = g.block('data_itemnumoflist', { ITEM: g.rep(g.arg(key)) }, g.gen.LISTF(table));
      const loop = g.block('control_repeat_until', {
        CONDITION: [
          2,
          g.block('operator_or', {
            OPERAND1: [2, g.op('gt', g.v(pos), g.len(table))],
            OPERAND2: [2, g.op('gt', g.v(result), g.num(0))],
          }),
        ],
      });
      g.sub(loop, [
        g.call('nameEq776 %s %s', g.item(table, g.v(pos)), g.arg(key)),
        g.branch(g.op('equals', g.v('cs776ok'), g.num(1)), [
          g.set(result, boolean ? g.num(1) : g.v(pos)),
        ]),
        g.change(pos, 1),
      ]);
      return [
        g.set(result, g.num(0)),
        g.set(pos, item),
        g.branch(g.op('gt', g.v(pos), g.num(0)), [loop]),
      ];
    }
    for (const table of [
      'GSaveN',
      'MName',
      'MSaveN',
      'NlSaveN',
      'NlN',
      'CellGlobal',
      'CellKey',
      'Names',
    ])
      g.body(g.proc(`nameIndex780${table} %s`), scan(table, 'key', 'cs780pos', 'cs780found'));
    for (const table of ['FnName', 'ClsName'])
      g.body(g.proc(`nameHas776${table} %s`), scan(table, 'key', 'cs776j', 'cs776found', true));
    const proc = g.proc('lookup %s'),
      c = g.entries(proc);
    assert.equal(b[c[4]].fields.VARIABLE[0], 'ubR');
    // Keep the lookup ABI separate from the cell index ABI: found = row or 0;
    // cmp is the (old) equality result. Do not leak cs780found to a caller.
    g.body(proc, [
      ...scan('Names', 'vn', 'cmp', 'found'),
      g.branch(
        g.op('equals', g.v('found'), g.num(0)),
        [g.set('cmp', g.num(1))],
        [g.set('cmp', g.num(0))],
      ),
      ...c.slice(4),
    ]);
    return { specializations: 11, removedBlocks: sweep(g.t) };
  },
};
