'use strict';
const assert = require('node:assert/strict');
const { Graph, unique, sweep } = require('../graph.cjs');
// Lower the three existing lexers into a streaming pipeline. The lexer bodies
// retain v4.267's grammar, but no pass rewrites or copies a whole source table.
module.exports = {
  id: 'source',
  after: ['ownership'],
  writes: ['source', 'RUN.source', 'diagnostics'],
  apply(p) {
    const g = new Graph(p, 'source'),
      b = g.b;
    const sub = (k) => g.chain(b[k].inputs.SUBSTACK[1]);
    const name = (k, n) => b[k].fields.VARIABLE?.[0] === n;
    const list = (k, n) => b[k].fields.LIST?.[0] === n;
    const isCall = (k, n) => b[k].mutation?.proccode === n;
    const stop = () => g.block('control_stop', {}, { STOP_OPTION: ['this script', null] });
    const line = () => g.arg('line'),
      origin = () => g.arg('origin');
    const emit = 'source emit %s %s',
      split = 'source split %s %s',
      expand = 'source suite %s %s %s';
    const emitDef = g.define(emit, ['line', 'origin']),
      splitDef = g.define(split, ['line', 'origin']),
      expandDef = g.define(expand, ['line', 'origin', 'depth']);
    g.body(emitDef, [g.add('Src267', line()), g.add('SrcMap267', origin())]);
    // A single disposable snapshot isolates a run from concurrent editor edits.
    const input = 'Source input';
    g.gen.addList('Interpreter', input, []);
    const snapshot = g.proc('srccopy267');
    g.body(snapshot, [
      g.clear(input),
      g.set('srcI267', g.num(1)),
      g.repeat(g.len('Code'), [g.add(input, g.item('Code', g.v('srcI267'))), g.change('srcI267', 1)]),
    ]);
    const join = g.proc('joinlines'),
      jl = g.entries(join),
      loop = jl[3],
      js = sub(loop);
    assert.equal(b[loop].opcode, 'control_repeat_until');
    assert(name(js[0], 'xgc') && name(js[1], 'xgm267') && list(js.at(-3), 'New2'));
    // Redirect only the joining scanner's physical-line reads, not its output.
    for (const k of g.within(
      loop,
      (x) =>
        x.fields.LIST?.[0] === 'Src267' && ['data_itemoflist', 'data_lengthoflist'].includes(x.opcode),
    ))
      b[k].fields = g.gen.LISTF(input);
    g.plug(js[1], 'VALUE', g.v('xgi'));
    // Triple-quoted continuation retains both its LF and the next line's indentation.
    const scan = js[3],
      sep = unique(
        g.within(
          scan,
          (x) =>
            x.fields.VARIABLE?.[0] === 'xgsep' &&
            x.inputs.VALUE?.[1]?.[1] === ' ' &&
            b[x.parent]?.fields.VARIABLE?.[0] === 'xgb',
        ),
        'triple separator',
      );
    g.plug(sep, 'VALUE', g.text('\n'));
    const trim = unique(
      g.within(scan, (x) => x.mutation?.proccode === 'trimsp %s'),
      'join trim',
    );
    const parent = b[trim].parent,
      tail = b[trim].next;
    assert.equal(b[parent].inputs.SUBSTACK2[1], trim);
    const raw = g.item(input, g.v('xgi'));
    const choose = g.branch(g.op('equals', g.v('xgt'), g.num(1)), [g.set('ev', raw)], [trim]);
    g.sub(parent, [choose, tail], 'SUBSTACK2');
    g.sub(loop, [...js.slice(0, -3), g.call(expand, g.v('xgc'), g.v('xgm267'), g.num(1)), js.at(-1)]);
    g.body(join, [g.clear('Src267'), g.clear('SrcMap267'), jl[2], loop, g.clear(input)]);
    // Reuse the quote/depth-aware semicolon scanner on ONE line. Its three
    // emission sites all call the same text+origin operation.
    const oldSplit = g.proc('splitlines'),
      oldExpand = g.proc('expandlines');
    const qs = sub(g.entries(oldSplit)[3]);
    assert(name(qs[0], 'qsrc') && name(qs.at(-1), 'qidx'));
    for (const k of g.within(
      qs[0],
      (x) => x.opcode === 'data_addtolist' && x.fields.LIST[0] === 'QNew',
    )) {
      const map = b[k].next;
      assert(list(map, 'TmpMap267'));
      const next = b[map].next;
      const call = g.call(emit, b[k].inputs.ITEM, origin());
      const { parent } = b[k];
      if (b[parent].next === k) b[parent].next = call;
      else {
        const v = unique(
          Object.values(b[parent].inputs).filter((v) => v[1] === k),
          'emit parent',
        );
        v[1] = call;
      }
      b[call].parent = parent;
      b[call].next = next;
      if (next) b[next].parent = call;
    }
    g.plug(qs[0], 'VALUE', g.rep(line()));
    const early = (char, action) =>
      g.branch(g.block('operator_not', { OPERAND: [2, g.contains(line(), g.text(char))] }), [
        action,
        stop(),
      ]);
    g.body(splitDef, [early(';', g.call(emit, line(), origin())), ...qs.slice(0, -1)]);
    const xs = sub(g.entries(oldExpand)[3]),
      branch = xs.at(-2),
      yes = sub(branch);
    assert(
      name(xs[0], 'xles') &&
        name(xs.at(-1), 'xli') &&
        list(yes[3], 'NewLines') &&
        list(yes.at(-2), 'NewLines'),
    );
    // Inside quotes the delimiter must match the opener, including single quotes.
    const quoted = unique(
      g.within(
        xs[1],
        (x) =>
          x.opcode === 'control_if_else' &&
          b[x.inputs.CONDITION[1]]?.inputs.OPERAND1?.[1]?.[1] === 'xlstr',
      ),
      'suite quote state',
    );
    g.plug(quoted, 'CONDITION', [
      2,
      g.block('operator_not', { OPERAND: [2, g.op('equals', g.v('xlstr'), g.num(0))] }),
    ]);
    const enter = b[quoted].inputs.SUBSTACK2[1],
      close = b[b[quoted].inputs.SUBSTACK[1]].inputs.SUBSTACK2[1];
    g.plug(close, 'CONDITION', [2, g.op('equals', g.v('xlch'), g.v('xlstr'))]);
    g.plug(enter, 'CONDITION', [2, g.contains(g.text(`'"`), g.v('xlch'))]);
    g.plug(b[enter].inputs.SUBSTACK[1], 'VALUE', g.v('xlch'));
    g.plug(xs[0], 'VALUE', g.rep(line()));
    const bodyVal = () => g.block('operator_join', { STRING1: g.v('xlbod'), STRING2: g.v('xlrest') });
    const recurse = g.branch(
      g.op('lt', g.arg('depth'), g.num(3)),
      [g.call(expand, bodyVal(), origin(), g.op('add', g.arg('depth'), g.num(1)))],
      [g.call(split, bodyVal(), origin())],
    );
    g.sub(branch, [
      ...yes.slice(0, 3),
      g.call(split, g.v('xlhead'), origin()),
      ...yes.slice(5, -2),
      recurse,
    ]);
    g.sub(branch, [g.call(split, line(), origin())], 'SUBSTACK2');
    g.body(expandDef, [early(':', g.call(split, line(), origin())), ...xs.slice(0, -1)]);
    const run = g.hat('RUN'),
      cmds = g.entries(run);
    const obsolete = cmds.filter((k) => isCall(k, 'expandlines') || isCall(k, 'splitlines'));
    assert.equal(obsolete.length, 4);
    g.body(
      run,
      cmds.filter((k) => !obsolete.includes(k)),
    );
    for (const k of [oldExpand, oldSplit]) b[k].topLevel = false;
    // User-facing errors refer to physical editor lines; synthetic helpers have no origin.
    const logs = g.within(
      run,
      (x) => x.opcode === 'operator_join' && x.inputs.STRING1[1]?.[1] === 'Line ',
    );
    const display = unique(logs, 'uncaught diagnostic'),
      joinNumber = b[display].inputs.STRING2[1];
    assert.equal(b[joinNumber].inputs.STRING1[1][1], 'pc');
    const n = 'source error line';
    g.gen.addVar('Interpreter', n, '');
    const log = b[display].parent;
    const test = g.branch(
      g.op('gt', g.item('SrcMap267', g.v('pc')), g.num(0)),
      [g.set(n, g.item('SrcMap267', g.v('pc')))],
      [g.set(n, g.text('internal'))],
    );
    const prev = b[log].parent;
    assert.equal(b[prev].next, log);
    b[prev].next = test;
    b[test].parent = prev;
    b[test].next = log;
    b[log].parent = test;
    g.plug(joinNumber, 'STRING1', g.v(n));
    return { removedBlocks: sweep(g.t), removedFullSourcePasses: 3 };
  },
};
