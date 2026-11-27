'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { makeBuilder } = require('../_work/sb3lib.js');
const slots = (b) =>
  Object.values(b.inputs)
    .flatMap((x) => x.slice(1))
    .filter((x) => typeof x === 'string');
const edges = (b) => [...(b.next ? [b.next] : []), ...slots(b)];
function walk(blocks, roots) {
  const seen = new Set(),
    todo = [...roots];
  while (todo.length) {
    const k = todo.pop();
    if (!seen.has(k)) {
      assert(blocks[k], `Missing ${k}`);
      seen.add(k);
      todo.push(...edges(blocks[k]));
    }
  }
  return seen;
}
function forest(t) {
  return walk(
    t.blocks,
    Object.keys(t.blocks).filter((k) => t.blocks[k].topLevel),
  );
}
function sweep(t) {
  const live = forest(t);
  let n = 0;
  for (const k of Object.keys(t.blocks))
    if (!live.has(k)) {
      delete t.blocks[k];
      n++;
    }
  return n;
}
function unique(items, label) {
  assert.equal(items.length, 1, `Expected one ${label}; found ${items.length}`);
  return items[0];
}
// Thin domain vocabulary over v4's makeBuilder. Each patch owns a stable ID stream.
class Graph {
  constructor(project, scope) {
    this.project = project;
    this.t = project.targets.find((t) => t.name === 'Interpreter');
    this.b = this.t.blocks;
    let seed = createHash('sha256').update(scope).digest().readUInt32BE();
    this.gen = makeBuilder(project, {
      random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
    });
    this.gen.setCtx(this.t.name);
  }
  proc(name) {
    return unique(
      Object.keys(this.b).filter(
        (k) =>
          this.b[k].opcode === 'procedures_definition' &&
          this.b[this.b[k].inputs.custom_block[1]].mutation.proccode === name,
      ),
      name,
    );
  }
  hat(name) {
    return unique(
      Object.keys(this.b).filter(
        (k) =>
          this.b[k].opcode === 'event_whenbroadcastreceived' &&
          this.b[k].fields.BROADCAST_OPTION[0] === name,
      ),
      name,
    );
  }
  chain(head) {
    const a = [],
      seen = new Set();
    for (let i = head; i; i = this.b[i].next) {
      assert(!seen.has(i), 'next cycle');
      seen.add(i);
      a.push(i);
    }
    return a;
  }
  stack(ids) {
    ids = ids.filter(Boolean);
    for (let i = 0; i < ids.length; i++) {
      this.b[ids[i]].next = ids[i + 1] || null;
      if (i) this.b[ids[i]].parent = ids[i - 1];
    }
    return ids[0];
  }
  body(root, ids) {
    this.b[root].next = this.stack(ids) || null;
    if (ids.length) this.b[ids[0]].parent = root;
  }
  plug(k, slot, val) {
    this.b[k].inputs[slot] = val;
    if (typeof val[1] === 'string') this.b[val[1]].parent = k;
  }
  block(op, inputs = {}, fields = {}) {
    const id = this.gen.B(this.t.name, op, { inputs, fields });
    for (const c of slots(this.b[id])) this.b[c].parent = id;
    return id;
  }
  rep(id) {
    return this.gen.REP(id);
  }
  num(n) {
    return this.gen.num(n);
  }
  text(s) {
    return this.gen.txt(s);
  }
  v(n) {
    return this.gen.VAR(n);
  }
  arg(n) {
    return this.block('argument_reporter_string_number', {}, { VALUE: [n, null] });
  }
  set(n, v) {
    return this.block('data_setvariableto', { VALUE: this.rep(v) }, this.gen.VARF(n));
  }
  change(n, x) {
    return this.block('data_changevariableby', { VALUE: this.num(x) }, this.gen.VARF(n));
  }
  clear(n) {
    return this.block('data_deletealloflist', {}, this.gen.LISTF(n));
  }
  len(n) {
    return this.block('data_lengthoflist', {}, this.gen.LISTF(n));
  }
  item(n, i) {
    return this.block('data_itemoflist', { INDEX: this.rep(i) }, this.gen.LISTF(n));
  }
  add(n, v) {
    return this.block('data_addtolist', { ITEM: this.rep(v) }, this.gen.LISTF(n));
  }
  del(n, i) {
    return this.block('data_deleteoflist', { INDEX: this.rep(i) }, this.gen.LISTF(n));
  }
  op(name, a, b) {
    const prefix = ['add', 'subtract', 'multiply', 'divide', 'mod'].includes(name) ? 'NUM' : 'OPERAND';
    return this.block('operator_' + name, { [prefix + '1']: this.rep(a), [prefix + '2']: this.rep(b) });
  }
  contains(a, b) {
    return this.block('operator_contains', { STRING1: this.rep(a), STRING2: this.rep(b) });
  }
  branch(test, yes, no) {
    const id = this.block(no ? 'control_if_else' : 'control_if', { CONDITION: [2, test] });
    this.sub(id, yes);
    if (no) this.sub(id, no, 'SUBSTACK2');
    return id;
  }
  repeat(n, body) {
    const k = this.block('control_repeat', { TIMES: this.rep(n) });
    this.sub(k, body);
    return k;
  }
  sub(id, ids, slot = 'SUBSTACK') {
    const k = this.stack(ids);
    if (k) this.plug(id, slot, [2, k]);
    else delete this.b[id].inputs[slot];
  }
  define(name, args = [], warp = true) {
    assert(
      !Object.values(this.b).some(
        (b) => b.opcode === 'procedures_prototype' && b.mutation.proccode === name,
      ),
    );
    return this.gen.makeProcedure(this.t.name, name, args, warp).defId;
  }
  call(name, ...params) {
    const m = this.b[this.b[this.proc(name)].inputs.custom_block[1]].mutation,
      ids = JSON.parse(m.argumentids);
    assert.equal(ids.length, params.length);
    const k = this.gen.callProc(this.t.name, name, ids, params, m.warp === 'true');
    for (const c of slots(this.b[k])) this.b[c].parent = k;
    return k;
  }
  entries(k) {
    return this.chain(this.b[k].next);
  } // command stack, excluding its hat
  within(id, test) {
    return [...walk(this.b, [id])].filter((k) => test(this.b[k], k));
  }
}
module.exports = { Graph, walk, forest, sweep, edges, unique };
