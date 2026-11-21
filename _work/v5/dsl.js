'use strict';
/**
 * MiniPy v5 - Scratch block DSL + emitter.
 * Kernel logic is written as a tree of plain JS nodes (E.* reporters,
 * S.* statements) and flattened into sb3 blocks. The JS recursion is
 * BUILD-time only; emitted Scratch scripts are completely flat.
 */
const fs = require('fs');
const { zipRead, zipWrite } = require('../sb3lib.js');

// ============================================================ expressions
const blk = (op, ins, f) => ({ k: 'blk', op, ins: ins || [], f: f || {} });
const one = (op, inName, a, kind) => blk(op, [[inName, a, kind || 'rep']]);
const two = (op, n1, a, n2, b, k1, k2) =>
  blk(op, [[n1, a, k1 || 'rep'], [n2, b, k2 || 'rep']]);

const E = {
  num: (v) => ({ k: 'lit', t: 4, v: String(v) }),
  str: (v) => ({ k: 'lit', t: 10, v: String(v) }),
  var: (name) => blk('data_variable', [], { VARIABLE: name }),
  item: (list, i) => blk('data_itemoflist', [['INDEX', i, 'rep']], { LIST: list }),
  len: (list) => blk('data_lengthoflist', [], { LIST: list }),
  itemNum: (list, x) => blk('data_itemnumoflist', [['ITEM', x, 'rep']], { LIST: list }),
  listContains: (list, x) => blk('data_listcontainsitem', [['ITEM', x, 'rep']], { LIST: list }),
  add: (a, b) => two('operator_add', 'NUM1', a, 'NUM2', b),
  sub: (a, b) => two('operator_subtract', 'NUM1', a, 'NUM2', b),
  mul: (a, b) => two('operator_multiply', 'NUM1', a, 'NUM2', b),
  div: (a, b) => two('operator_divide', 'NUM1', a, 'NUM2', b),
  mod: (a, b) => two('operator_mod', 'NUM1', a, 'NUM2', b),
  rnd: (a) => one('operator_round', 'NUM', a),
  math: (op, a) => blk('operator_mathop', [['NUM', a, 'rep']], { OPERATOR: op }),
  join: (a, b) => two('operator_join', 'STRING1', a, 'STRING2', b),
  letter: (i, s) => two('operator_letter_of', 'LETTER', i, 'STRING', s),
  slen: (s) => one('operator_length', 'STRING', s),
  contains: (a, b) => two('operator_contains', 'STRING1', a, 'STRING2', b),
  gt: (a, b) => two('operator_gt', 'OPERAND1', a, 'OPERAND2', b),
  lt: (a, b) => two('operator_lt', 'OPERAND1', a, 'OPERAND2', b),
  eq: (a, b) => two('operator_equals', 'OPERAND1', a, 'OPERAND2', b),
  and: (a, b) => two('operator_and', 'OPERAND1', a, 'OPERAND2', b, 'bool', 'bool'),
  or: (a, b) => two('operator_or', 'OPERAND1', a, 'OPERAND2', b, 'bool', 'bool'),
  not: (a) => one('operator_not', 'OPERAND', a, 'bool'),
  random: (a, b) => two('operator_random', 'FROM', a, 'TO', b),
  ans: () => blk('sensing_answer'),
  days2000: () => blk('sensing_dayssince2000'),
  costumeNum: () => blk('looks_costumenumbername', [], { NUMBER_NAME: 'number' }),
  ge: (a, b) => E.not(E.lt(a, b)),
  le: (a, b) => E.not(E.gt(a, b)),
  ne: (a, b) => E.not(E.eq(a, b)),
};

// ============================================================ statements
const st = (op, ins, f) => ({ k: 'stmt', op, ins: ins || [], f: f || {} });
const S = {
  set: (name, v) => st('data_setvariableto', [['VALUE', v, 'rep']], { VARIABLE: name }),
  chg: (name, v) => st('data_changevariableby', [['VALUE', v, 'rep']], { VARIABLE: name }),
  lset: (list, i, v) => st('data_replaceitemoflist', [['INDEX', i, 'rep'], ['ITEM', v, 'rep']], { LIST: list }),
  ladd: (list, v) => st('data_addtolist', [['ITEM', v, 'rep']], { LIST: list }),
  ldel: (list, i) => st('data_deleteoflist', [['INDEX', i, 'rep']], { LIST: list }),
  ldelall: (list) => st('data_deletealloflist', [], { LIST: list }),
  lins: (list, i, v) => st('data_insertatlist', [['INDEX', i, 'rep'], ['ITEM', v, 'rep']], { LIST: list }),
  If: (c, then, els) => els === undefined
    ? st('control_if', [['CONDITION', c, 'bool'], ['SUBSTACK', then, 'sub']])
    : st('control_if_else', [['CONDITION', c, 'bool'], ['SUBSTACK', then, 'sub'], ['SUBSTACK2', els, 'sub']]),
  Repeat: (n, body) => st('control_repeat', [['TIMES', n, 'rep'], ['SUBSTACK', body, 'sub']]),
  Until: (c, body) => st('control_repeat_until', [['CONDITION', c, 'bool'], ['SUBSTACK', body, 'sub']]),
  While: (c, body) => st('control_while', [['CONDITION', c, 'bool'], ['SUBSTACK', body, 'sub']]),
  Forever: (body) => st('control_forever', [['SUBSTACK', body, 'sub']]),
  Wait: (s) => st('control_wait', [['DURATION', s, 'rep']]),
  StopAll: () => st('control_stop', [], { STOP_OPTION: 'all' }),
  Call: (proccode, args) => st('procedures_call', [], { __proc: proccode, __args: args || [] }),
  Broadcast: (name) => st('event_broadcast', [['BROADCAST_INPUT', name, 'bcast']]),
  Costume: (c) => st('looks_switchcostumeto', [['COSTUME', c, 'costume']]),
  raw: (op, ins, f) => st(op, ins, f),
};

// ============================================================ emitter
class Emitter {
  constructor(project) {
    this.project = project;
    this.tid = {};
    for (const t of project.targets) this.tid[t.name] = t;
    this.n = 0;
    this.procs = {};
  }
  // Deterministic ids and block placement: same sources in, byte-identical project.json out.
  nid(p) { this.n++; return 'v5' + p + this.n.toString(36); }
  // a cheap deterministic scatter so scripts do not overlap in the editor
  jitter(seed) { return (seed * 2654435761) % 3000; }
  target(name) {
    const t = this.tid[name];
    if (!t) throw new Error('no target ' + name);
    return t;
  }
  varId(t, name) {
    for (const tt of [t, this.tid['Stage']]) {
      for (const [id, v] of Object.entries((tt && tt.variables) || {})) if (v[0] === name) return id;
    }
    // auto-declare sprite-local scratch variable
    t.variables = t.variables || {};
    const id = this.nid('auto');
    t.variables[id] = [name, 0];
    this.autoVars = this.autoVars || [];
    this.autoVars.push(name);
    return id;
  }
  listId(t, name) {
    for (const tt of [t, this.tid['Stage']]) {
      for (const [id, v] of Object.entries((tt && tt.lists) || {})) if (v[0] === name) return id;
    }
    throw new Error('no list ' + name + ' in ' + t.name);
  }
  broadcastId(t, name) {
    const s = this.tid['Stage'];
    for (const tt of [s, t]) {
      for (const [id, v] of Object.entries((tt && tt.broadcasts) || {})) if (v === name) return id;
    }
    throw new Error('no broadcast ' + name);
  }
  make(t, op, opts) {
    opts = opts || {};
    const id = this.nid(op.replace(/[^a-z]/gi, '').slice(0, 4));
    const b = {
      opcode: op, next: null, parent: null,
      inputs: {}, fields: {}, shadow: !!opts.shadow, topLevel: !!opts.topLevel,
    };
    if (opts.mutation) b.mutation = opts.mutation;
    if (opts.topLevel) { b.x = opts.x === undefined ? 200 : opts.x; b.y = opts.y === undefined ? 200 : opts.y; }
    t.blocks[id] = b;
    return id;
  }
  block(t, node, parentId) {
    const op = node.op;
    const id = this.make(t, op, {});
    t.blocks[id].parent = parentId;
    for (const [name, value] of Object.entries(node.f || {})) {
      if (name === 'VARIABLE') t.blocks[id].fields.VARIABLE = [value, this.varId(t, value)];
      else if (name === 'LIST') t.blocks[id].fields.LIST = [value, this.listId(t, value)];
      else t.blocks[id].fields[name] = [value, null];
    }
    if (node.f && node.f.__proc !== undefined) {
      const p = this.procs[t.name + '|' + node.f.__proc];
      if (!p) throw new Error('unknown procedure ' + node.f.__proc);
      const inputs = {};
      for (let i = 0; i < p.argIds.length; i++) {
        inputs[p.argIds[i]] = this.input(t, node.f.__args[i], id, 'rep');
      }
      t.blocks[id].inputs = inputs;
      t.blocks[id].mutation = {
        tagName: 'mutation', children: [], proccode: node.f.__proc,
        argumentids: JSON.stringify(p.argIds), warp: p.warp ? 'true' : 'false',
      };
      return id;
    }
    for (const spec of node.ins || []) {
      const name = spec[0], value = spec[1], kind = spec[2];
      if (kind === 'sub') {
        const first = this.seq(t, value, id);
        if (first) t.blocks[id].inputs[name] = [2, first];
      } else if (value === undefined || value === null) {
        continue;
      } else {
        t.blocks[id].inputs[name] = this.input(t, value, id, kind);
      }
    }
    return id;
  }
  input(t, value, parentId, kind) {
    if (value === undefined || value === null) return [1, [10, '']];
    if (value.k === 'lit') return [1, [value.t, value.v]];
    if (kind === 'bcast') {
      const nm = value.k === 'lit' ? value.v : value;
      const menuId = this.make(t, 'event_broadcast_menu', { shadow: true });
      t.blocks[menuId].parent = parentId;
      t.blocks[menuId].fields.BROADCAST_OPTION = [nm, this.broadcastId(t, nm)];
      return [1, menuId];
    }
    if (kind === 'costume') {
      const bid = this.block(t, value, parentId);
      const menuId = this.make(t, 'looks_costume', { shadow: true });
      t.blocks[menuId].parent = parentId;
      t.blocks[menuId].fields.COSTUME = ['_', null];
      return [3, bid, menuId];
    }
    if (kind === 'bool') return [2, this.block(t, value, parentId)];
    return [3, this.block(t, value, parentId), [10, '']];
  }
  seq(t, nodes, parentId) {
    let prev = null, first = null;
    const flat = [];
    const push = (n) => { if (Array.isArray(n)) { for (const x of n) push(x); } else if (n) flat.push(n); };
    push(nodes);
    for (const node of flat) {
      if (node.k !== 'stmt' && node.k !== 'blk') {
        throw new Error('bad node in ' + t.name + ' parentOp=' +
          ((parentId && t.blocks[parentId]) ? t.blocks[parentId].opcode : String(parentId)) +
          ': ' + JSON.stringify(node).slice(0, 200));
      }
      const id = this.block(t, node, prev || parentId);
      if (prev) t.blocks[prev].next = id;
      else first = id;
      prev = id;
    }
    return first;
  }
  defineProc(targetName, proccode, argNames, body, warp) {
    const t = this.target(targetName);
    const defId = this.nid('def');
    const protoId = this.nid('proto');
    const argIds = argNames.map(() => this.nid('arg'));
    const protoInputs = {};
    for (let i = 0; i < argNames.length; i++) {
      const repId = this.nid('argrep');
      t.blocks[repId] = {
        opcode: 'argument_reporter_string_number', next: null, parent: protoId,
        inputs: {}, fields: { VALUE: [argNames[i], null] }, shadow: true, topLevel: false,
      };
      protoInputs[argIds[i]] = [1, repId];
    }
    t.blocks[protoId] = {
      opcode: 'procedures_prototype', next: null, parent: defId, inputs: protoInputs, fields: {},
      shadow: true, topLevel: false,
      mutation: {
        tagName: 'mutation', children: [], proccode: proccode,
        argumentids: JSON.stringify(argIds), argumentnames: JSON.stringify(argNames),
        argumentdefaults: JSON.stringify(argNames.map(() => '')), warp: warp === false ? 'false' : 'true',
      },
    };
    t.blocks[defId] = {
      opcode: 'procedures_definition', next: null, parent: null,
      inputs: { custom_block: [1, protoId] }, fields: {}, shadow: false, topLevel: true,
      x: 4000 + this.jitter(this.n), y: 4000 + this.jitter(this.n + 977),
    };
    this.procs[targetName + '|' + proccode] = { argIds: argIds, argNames: argNames, warp: warp !== false, defId: defId };
    this.pending = this.pending || [];
    this.pending.push({ targetName: targetName, defId: defId, body: body });
    return defId;
  }
  finish() {
    for (const p of this.pending || []) {
      const t = this.target(p.targetName);
      const body = typeof p.body === 'function' ? p.body() : p.body;
      const first = this.seq(t, body, p.defId);
      if (first) { t.blocks[p.defId].next = first; t.blocks[first].parent = p.defId; }
    }
    this.pending = [];
  }
  arg(name) { return blk('argument_reporter_string_number', [], { VALUE: name }); }
  hat(targetName, opcode, fields, body) {
    const t = this.target(targetName);
    const id = this.make(t, opcode, { topLevel: true, x: 100 + this.jitter(this.n), y: 100 + this.jitter(this.n + 613) });
    for (const [k, v] of Object.entries(fields || {})) {
      if (k === 'BROADCAST_OPTION') t.blocks[id].fields[k] = [v, this.broadcastId(t, v)];
      else t.blocks[id].fields[k] = [v, null];
    }
    const first = this.seq(t, body, id);
    if (first) { t.blocks[id].next = first; t.blocks[first].parent = id; }
    return id;
  }
  addVar(targetName, name, value) {
    const t = this.target(targetName);
    for (const tt of [t, this.tid['Stage']]) {
      for (const [id, v] of Object.entries((tt && tt.variables) || {})) if (v[0] === name) return id;
    }
    t.variables = t.variables || {};
    const id = this.nid('var');
    t.variables[id] = [name, value === undefined ? 0 : value];
    return id;
  }
  addList(targetName, name, value) {
    const t = this.target(targetName);
    for (const tt of [t, this.tid['Stage']]) {
      for (const [id, v] of Object.entries((tt && tt.lists) || {})) if (v[0] === name) return id;
    }
    t.lists = t.lists || {};
    const id = this.nid('list');
    t.lists[id] = [name, value || []];
    return id;
  }
  addBroadcast(name) {
    const t = this.tid['Stage'];
    t.broadcasts = t.broadcasts || {};
    for (const [id, v] of Object.entries(t.broadcasts)) if (v === name) return id;
    const id = this.nid('bc');
    t.broadcasts[id] = name;
    return id;
  }
  dropTarget(name) {
    const t = this.tid[name];
    t.blocks = {};
    t.variables = {};
    t.lists = {};
    return t;
  }
}

module.exports = { E: E, S: S, Emitter: Emitter };
