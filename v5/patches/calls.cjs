'use strict';
const assert = require('node:assert/strict');
const { Graph, unique, sweep } = require('../graph.cjs');
// RUN and STEP differ in scheduling and input transport, not in Python builtin semantics.
module.exports = {
  id: 'calls',
  after: ['ownership'],
  writes: ['call.dispatch'],
  apply(p) {
    const g = new Graph(p, 'calls'),
      b = g.b,
      entry = g.proc('callfn %s %s %s'),
      warp = g.proc('callfnW %s %s %s'),
      cmds = g.entries(warp),
      route = g.entries(entry).at(-1);
    assert.equal(b[route].opcode, 'control_if_else');
    assert.equal(b[b[route].inputs.SUBSTACK[1]].mutation.proccode, 'callfnW %s %s %s');
    const common = 'dispatch callable %s %s %s %s',
      core = g.define(common, ['fn', 'lo', 'hi', 'fast'], false);
    const argCall = (fast) => g.call(common, ...['fn', 'lo', 'hi'].map((n) => g.arg(n)), g.num(fast));
    const isFast = () => g.op('equals', g.arg('fast'), g.num(1));
    // Input with no prompt has a special polling entry in RUN. The non-warp path
    // retains its native ask/answer body, including the original prompt behavior.
    const poll = unique(
      cmds.filter(
        (k) =>
          b[k].opcode === 'control_if' &&
          g.within(b[k].inputs.CONDITION[1], (x) => x.inputs.OPERAND2?.[1]?.[1] === 'input').length,
      ),
      'empty RUN input',
    );
    const lookup = unique(
      cmds.filter((k) => b[k].mutation?.proccode === 'lookup %s'),
      'builtin lookup',
    );
    const promptInput = (root) =>
      unique(
        g.within(
          root,
          (x) =>
            x.opcode === 'control_if' &&
            b[x.inputs.CONDITION?.[1]]?.inputs.OPERAND2?.[1]?.[1] === 'input',
        ),
        'input with prompt',
      );
    const normalPrompt = promptInput(b[route].inputs.SUBSTACK2[1]),
      fastPrompt = promptInput(lookup);
    g.sub(fastPrompt, [
      g.branch(
        isFast(),
        g.chain(b[fastPrompt].inputs.SUBSTACK[1]),
        g.chain(b[normalPrompt].inputs.SUBSTACK[1]),
      ),
    ]);
    // The STEP path already had the correct consume-from-current-position primitive.
    // Replace the RUN-only open-coded, start-at-zero conversion with it for both.
    const lenRead = unique(
      g.within(
        lookup,
        (x) => x.fields.VARIABLE?.[0] === 'lnv' && b[x.inputs.VALUE?.[1]]?.fields.LIST?.[0] === 'ItSrc',
      ),
      'iterator conversion',
    );
    const conversion = g.chain(lenRead);
    const end = conversion.findIndex(
      (k) => b[k].opcode === 'data_replaceitemoflist' && b[k].fields.LIST[0] === 'ItPos',
    );
    assert(end > 0);
    const prev = b[lenRead].parent;
    assert.equal(b[prev].next, lenRead);
    g.body(prev, [
      g.call('gslice %s', g.v('lgi')),
      g.set('evK', g.text('')),
      ...conversion.slice(end + 1),
    ]);
    const start = cmds.indexOf(lookup);
    g.body(core, [g.branch(isFast(), [poll]), ...cmds.slice(start)]);
    g.body(warp, [argCall(1)]);
    g.sub(route, [argCall(0)], 'SUBSTACK2');
    return { sharedBuiltinBodies: 1, removedBlocks: sweep(g.t) };
  },
};
