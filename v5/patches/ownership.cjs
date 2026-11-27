'use strict';
// Make the serialized Scratch graph an editor-safe forest. Runtime follows forward
// edges; the editor additionally requires one owner per block (including shadows).
const { Graph, sweep } = require('../graph.cjs');
module.exports = {
  id: 'ownership',
  after: [],
  writes: ['block-ownership'],
  apply(project) {
    const stats = { dead: 0, clones: 0, parents: 0, menus: 0, emptyBranches: 0, labels: 0 };
    // Frozen execute/yield has an actual back-edge: its no-active-generator arm
    // re-enters the preceding escape block forever. No valid yield can resume
    // without a generator frame. Fail explicitly rather than spin in warp.
    const g = new Graph(project, 'ownership'),
      gate = 'bcontro_vbdf1m3mw',
      escape = g.b[gate].inputs.SUBSTACK2[1];
    if (g.b[escape].mutation.proccode !== 'lesc %s' || g.b[escape].next !== gate)
      throw Error('unexpected yield back-edge');
    g.sub(
      gate,
      [g.call('fail %s', g.text('RuntimeError: yield without an active generator'))],
      'SUBSTACK2',
    );
    stats.yieldCycles = 1;
    for (const t of project.targets) {
      const b = t.blocks,
        owned = new Set(),
        active = new Set();
      let serial = 0;
      const fresh = () => {
        let k;
        do {
          k = `v5:${t.name}:${++serial}`;
        } while (b[k]);
        return k;
      };
      function visit(k, parent) {
        if (active.has(k)) throw Error(`Block cycle: ${k}`);
        if (!b[k]) throw Error(`Missing active block ${k}`);
        const original = k;
        active.add(original);
        if (owned.has(k)) {
          k = fresh();
          b[k] = structuredClone(b[original]);
          stats.clones++;
        }
        owned.add(k);
        const x = b[k];
        if (x.parent !== parent) {
          stats.parents++;
          x.parent = parent;
        }
        for (const [slot, v] of Object.entries(x.inputs)) {
          if (slot.startsWith('SUBSTACK') && typeof v[1] !== 'string') {
            if (v[1] !== null && JSON.stringify(v) !== '[1,[10,""]]') throw Error('Unknown substack');
            delete x.inputs[slot];
            stats.emptyBranches++;
            continue;
          }
          for (let j = 1; j < v.length; j++) {
            if (typeof v[j] !== 'string') continue;
            if (!b[v[j]] && j === 2 && slot === 'COSTUME' && x.opcode === 'looks_switchcostumeto') {
              const key = fresh();
              b[key] = {
                opcode: 'looks_costume',
                inputs: {},
                fields: { COSTUME: [t.costumes[0].name, null] },
                parent: k,
                next: null,
                shadow: true,
                topLevel: false,
              };
              v[j] = key;
              stats.menus++;
            }
            v[j] = visit(v[j], k);
          }
        }
        if (x.next) x.next = visit(x.next, k);
        active.delete(original);
        return k;
      }
      for (const k of Object.keys(b).filter((k) => b[k].topLevel)) visit(k, null);
      stats.dead += sweep(t);
      const stage = project.targets.find((v) => v.isStage);
      function label(v, pos, field) {
        const id = v[pos + 1],
          n = (t[field][id] || stage[field][id])[0];
        if (v[pos] !== n) {
          v[pos] = n;
          stats.labels++;
        }
      }
      for (const x of Object.values(b)) {
        if (x.fields.LIST) label(x.fields.LIST, 0, 'lists');
        if (x.fields.VARIABLE) label(x.fields.VARIABLE, 0, 'variables');
        for (const v of Object.values(x.inputs))
          for (const a of v.slice(1))
            if (Array.isArray(a) && [12, 13].includes(a[0]))
              label(a, 1, a[0] === 12 ? 'variables' : 'lists');
      }
    }
    // Scratch SB3 is JSON but the editor exchanges XML 1.0. Some actual lexer
    // constants are illegal XML text (and literal CR is normalized to LF).
    // Keep their exact bytes in named, never-written scalar initializers. The
    // editor sees a normal variable reporter; no decoding or startup code.
    const literals = new Map([
      ['\x1f', 'unit separator'],
      ['\x07', 'bell'],
      ['\x0b', 'vertical tab'],
      ['\x0c', 'form feed'],
      ['\r', 'carriage return'],
      [' \t\n\r\x0b\x0c', 'ASCII whitespace'],
      [' \t\n\r', 'space tab LF CR'],
      [' \t\r\n', 'space tab CR LF'],
    ]);
    stats.xmlLiterals = 0;
    for (const x of Object.values(g.b))
      for (const [slot, v] of Object.entries(x.inputs)) {
        if (!Array.isArray(v[1]) || v[1][0] !== 10 || !/[\x00-\x08\x0b-\x1f\ufffe\uffff]/.test(v[1][1]))
          continue;
        const text = v[1][1],
          label = literals.get(text);
        if (!label || v.length !== 2) throw Error('unknown non-XML literal');
        const name = 'literal: ' + label;
        g.gen.addVar('Interpreter', name, text);
        x.inputs[slot] = g.v(name);
        stats.xmlLiterals++;
      }
    return stats;
  },
};
