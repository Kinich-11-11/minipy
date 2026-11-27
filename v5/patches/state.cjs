'use strict';
const { Graph, sweep, walk } = require('../graph.cjs');
function references(t) {
  const refs = new Map();
  function use(id, kind, k) {
    if (!refs.has(id)) refs.set(id, []);
    refs.get(id).push([kind, k]);
  }
  for (const [k, b] of Object.entries(t.blocks)) {
    for (const [key, f] of Object.entries(b.fields))
      if (['LIST', 'VARIABLE'].includes(key)) use(f[1], 'field', k);
    for (const v of Object.values(b.inputs))
      for (const x of v.slice(1)) if (Array.isArray(x) && [12, 13].includes(x[0])) use(x[2], 'read', k);
  }
  return refs;
}
module.exports = {
  id: 'state',
  after: ['source', 'frames', 'calls', 'layout', 'names', 'owners'],
  writes: ['private-state'],
  apply(p) {
    const g = new Graph(p, 'state'),
      b = g.b,
      monitor = new Set(p.monitors.map((x) => x.id));
    // Scratch has no dynamic custom-block invocation. Keep every external hat as a root.
    const definitions = new Map();
    for (const [k, x] of Object.entries(b))
      if (x.opcode === 'procedures_definition')
        definitions.set(b[x.inputs.custom_block[1]].mutation.proccode, k);
    const live = new Set(),
      todo = Object.keys(b).filter((k) => b[k].topLevel && b[k].opcode !== 'procedures_definition');
    while (todo.length) {
      const root = todo.pop();
      if (live.has(root)) continue;
      live.add(root);
      for (const k of walk(b, [root]))
        if (b[k].opcode === 'procedures_call') todo.push(definitions.get(b[k].mutation.proccode));
    }
    const retired = [];
    for (const [n, k] of definitions)
      if (!live.has(k)) {
        retired.push(n);
        b[k].topLevel = false;
      }
    sweep(g.t);
    // Forward a private compiler temporary only when it has exactly one writer,
    // one reader and the reader is in the very next command's pure predicate.
    const refs = references(g.t);
    let forwards = 0;
    for (const [id, [name]] of Object.entries(g.t.variables)) {
      if (!/^cs(?:776|780)r\d+$/.test(name) || monitor.has(id)) continue;
      const uses = refs.get(id) || [];
      if (uses.length !== 2) continue;
      const wr = uses.find(([n]) => n === 'field')?.[1],
        rd = uses.find(([n]) => n === 'read')?.[1];
      const x = b[wr],
        y = b[rd];
      if (!x || !y || x.opcode !== 'data_setvariableto' || x.inputs.VALUE[1]?.[0] !== 12 || !x.next)
        continue;
      const next = b[x.next],
        cond = next.inputs.CONDITION?.[1];
      if (!['control_if', 'control_if_else'].includes(next.opcode) || !cond || !walk(b, [cond]).has(rd))
        continue;
      for (const v of Object.values(y.inputs)) if (v[1]?.[2] === id) v[1] = x.inputs.VALUE[1].slice();
      const parent = b[x.parent];
      if (parent.next === wr) parent.next = x.next;
      else {
        const input = Object.values(parent.inputs).find((v) => v[1] === wr);
        if (!input) throw Error('Missing temporary parent');
        input[1] = x.next;
      }
      next.parent = x.parent;
      delete b[wr];
      forwards++;
    }
    let vars = 0,
      lists = 0;
    const all = new Set(p.targets.flatMap((t) => [...references(t).keys()]));
    if (p.targets.some((t) => Object.values(t.blocks).some((x) => x.opcode === 'sensing_of')))
      throw Error('Audit dynamic variable access before pruning');
    for (const field of ['variables', 'lists'])
      for (const [id, data] of Object.entries(g.t[field]))
        if (!all.has(id) && !monitor.has(id) && !data[2]) {
          delete g.t[field][id];
          if (field === 'lists') lists++;
          else vars++;
        }
    return { retired, forwards, vars, lists };
  },
};
