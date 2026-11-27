'use strict';
const assert = require('node:assert/strict');
const { Graph, sweep } = require('../graph.cjs');
// One layout for both sides of a synchronous call; the data stacks contain no editor
// state that calluser previously saved simply to undo fpop's restoration.
const scalars =
  `ek en ed emin ecut eop erank found head count name tmp dest lc nargs ra rb rs pending fnlimit cmp truthv printbuf pi plo phi eqi mi mj xi xa xb xcol xlo xhi xlen yb qcut narg argi qpow cs si ln lacc lstart lcount lidx lplo lphi lpi ltmp lsum lmeth lnew lval ltyp llast lx lsp ldepth lend mrt isv tif tel td tk tifs tels mbest mtype mpi inel ini inf lii lt2 psep pendnl pendtxt pmbuf psepi pendi pstart pk pd lsacc lsi slc sd sk sls sle sln slr slrec lsn lsix lsacc2 lsbv lsbt lswap lneed lnt lres mcut fi fj fk fd fphi fplo fpn fpo fdd ftype fval fu fend csteps selected page hscroll outpage varpage pc demo saved stopreq cursor branchjump exportShown speed gmy glz grez chName chLast`.split(
    ' ',
  );
const vectors =
  'Comma AName AVal AType AComma LComm LOut MComma UArgV UArgT UComma DefSeg DefPar DefDef UArgN'.split(
    ' ',
  );
module.exports = {
  id: 'frames',
  after: ['ownership'],
  writes: ['call.frames', 'RUN.frames'],
  apply(p) {
    const g = new Graph(p, 'frames'),
      b = g.b,
      push = g.proc('fpush'),
      pop = g.proc('fpop');
    const old = g
      .entries(push)
      .filter((k) => b[k].fields.LIST?.[0] === 'VSave')
      .map((k) => b[k].inputs.ITEM[1][1]);
    assert.deepEqual(
      old.filter((v) => !['mode', 'ticket', 'steps'].includes(v)),
      scalars,
    );
    const last = g.text('last'),
      add = [],
      drop = [];
    add.push(g.add('FrLoop', g.len('LoopHead')));
    for (const v of scalars) add.push(g.add('VSave', g.v(v)));
    for (const n of vectors) {
      add.push(
        g.set('epI', g.len(n)),
        g.repeat(g.v('epI'), [g.add('LSave', g.item(n, g.v('epI'))), g.change('epI', -1)]),
        g.add('LSave', g.len(n)),
      );
    }
    for (const v of scalars.toReversed())
      drop.push(g.set(v, g.item('VSave', last)), g.del('VSave', last));
    for (const n of vectors.toReversed())
      drop.push(
        g.set('epN', g.item('LSave', last)),
        g.del('LSave', last),
        g.clear(n),
        g.repeat(g.v('epN'), [g.add(n, g.item('LSave', last)), g.del('LSave', last)]),
      );
    for (const v of ['eopK', 'headK', 'nameK', 'lmethK']) drop.push(g.set(v, g.text('')));
    // The three UI registers are saved across pend() and other teardown calls,
    // not just fpop. Keep that outer guard; omit them only from the frame layout.
    for (const root of [g.proc('calluser %s %s %s'), g.hat('RUN')]) {
      g.body(
        root,
        g.entries(root).filter((k) => !['FrVBase', 'FrLBase'].includes(b[k].fields.LIST?.[0])),
      );
    }
    g.body(push, add);
    g.body(pop, drop);
    return { scalars: scalars.length, vectors: vectors.length, removedBlocks: sweep(g.t) };
  },
};
