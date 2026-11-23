
'use strict';
/**
 * MiniPy v4.1x builder -- incremental feature patches applied to MiniPy_v4.sb3.
 * Source of truth for the v4.1x line; the .sb3 is a product of this script.
 *   node _work/v41/build41.js            -> MiniPy_v4.197.sb3 (newest)
 *   V41_OUT=... V41_SRC=... V41_STAMP=... node ...     -> override
 *   V41_SKIP="P14 def/return,..." node ...             -> rebuild an earlier version
 *     (patch names are the first argument of each patch() call; P1..P14 == v4.10,
 *      everything == v4.11)
 */
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite, makeBuilder } = require('../sb3lib.js');
// post-build normalisation so the 小码王社区 importer cannot break the project:
// it inlines simple reporter blocks into primitives, and when such a block has
// more than one owner it drops the block but leaves the other refs dangling ->
// the community player VM throws on every frame and freezes at the first print.
const { normalizeProject } = require('./webfix.cjs');

const ROOT = 'C:/Personal/个人/编程/scratch/ai/minipython';
const SRC = process.env.V41_SRC || (ROOT + '/MiniPy_v4.sb3');
const OUT = process.env.V41_OUT || (ROOT + '/MiniPy_v4.210.sb3');
const OUT_JSON = process.env.V41_JSON || (ROOT + '/_work/v41/project.json');
const STAMP = process.env.V41_STAMP || 'MiniPy v4.210 - built 2026-10-31';
const SKIP = new Set((process.env.V41_SKIP || '').split(',').map((s) => s.trim()).filter(Boolean));

const entries = zipRead(SRC);
const project = JSON.parse(entries.find((e) => e.name === 'project.json').data.toString('utf8'));
const B = makeBuilder(project);
B.setCtx('Interpreter');
const IT = 'Interpreter';

// ---------------------------------------------------------------- helpers
const T = (n) => project.targets.find((t) => t.name === n);
const BL = () => T(IT).blocks;
const I = (op, opts) => B.B(IT, op, opts);
const num = (v) => B.num(v);
const txt = (v) => B.txt(v);
const VAR = (n) => B.VAR(n);
const item = (list, idx) => I('data_itemoflist', { fields: B.LISTF(list), inputs: { INDEX: B.REP(idx, [4, '0']) } });
const llen = (list) => I('data_lengthoflist', { fields: B.LISTF(list) });
const addTo = (list, v) => I('data_addtolist', { fields: B.LISTF(list), inputs: { ITEM: B.REP(v, [4, '0']) } });
const clearL = (list) => I('data_deletealloflist', { fields: B.LISTF(list) });
const lenOf = (x) => I('operator_length', { inputs: { STRING: B.REP(x, [10, '']) } });
const letterOf = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
const MOD = (a, b) => I('operator_mod', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
const DIV = (a, b) => I('operator_divide', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
const FLOOR = (x) => I('operator_mathop', { fields: { OPERATOR: ['floor', null] }, inputs: { NUM: B.REP(x, [4, '0']) } });
const EQ = (a, b) => I('operator_equals', { inputs: { OPERAND1: B.REP(a, [10, '']), OPERAND2: B.REP(b, [10, '']) } });
const LT = (a, b) => I('operator_lt', { inputs: { OPERAND1: B.REP(a, [10, '']), OPERAND2: B.REP(b, [10, '']) } });
const GT = (a, b) => I('operator_gt', { inputs: { OPERAND1: B.REP(a, [10, '']), OPERAND2: B.REP(b, [10, '']) } });
const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
const setV = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
const chgV = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
const IF = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub(IT, id, 'SUBSTACK', B.chain(IT, ids)); return id; };
const IFELSE = (c, a, b) => { const id = I('control_if_else', { inputs: { CONDITION: B.BOOL(c) } }); B.sub(IT, id, 'SUBSTACK', B.chain(IT, a)); B.sub(IT, id, 'SUBSTACK2', B.chain(IT, b)); return id; };
const REPEAT = (n, ids) => { const id = I('control_repeat', { inputs: { TIMES: B.REP(n, [4, '0']) } }); B.sub(IT, id, 'SUBSTACK', B.chain(IT, ids)); return id; };
const REPEATU = (c, ids) => { const id = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(c) } }); B.sub(IT, id, 'SUBSTACK', B.chain(IT, ids)); return id; };
const newVar = (n, v) => B.addVar(IT, n, v === undefined ? 0 : v);
const argOf = (n) => B.argReporter(IT, n);

function chain(ids) { return B.chain(IT, ids); }
function blockOf(id) { return BL()[id]; }
function allIds() { return Object.keys(BL()); }

function defIdOf(proccode) {
  for (const id of allIds()) {
    const b = BL()[id];
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const proto = BL()[b.inputs.custom_block[1]];
      if (proto && proto.mutation && proto.mutation.proccode === proccode) return id;
    }
  }
  throw new Error('definition not found: ' + proccode);
}
function reach(roots) {
  const seen = new Set();
  const stack = (Array.isArray(roots) ? roots : [roots]).slice();
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    const b = BL()[id];
    if (!b) continue;
    seen.add(id);
    for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') stack.push(v[1]); }
    if (b.next) stack.push(b.next);
  }
  return seen;
}
function inDef(proccode) { return reach(defIdOf(proccode)); }
function find(set, pred) { const out = []; for (const id of set) if (pred(BL()[id], id)) out.push(id); return out; }
function refOf(id) {
  for (const pid of allIds()) {
    const p = BL()[pid];
    for (const [slot, v] of Object.entries(p.inputs || {})) {
      if (v && v[1] === id) return { pid, slot, v };
    }
  }
  return null;
}
function cloneExpr(id) {
  if (typeof id !== 'string') return id;
  const src = BL()[id];
  if (!src) return id;
  const copy = JSON.parse(JSON.stringify(src));
  copy.next = null; copy.parent = null; copy.inputs = {};
  const newId = B.nid('cl');
  for (const [k, v] of Object.entries(src.inputs || {})) {
    const nv = JSON.parse(JSON.stringify(v));
    if (typeof nv[1] === 'string') nv[1] = cloneExpr(nv[1]);
    copy.inputs[k] = nv;
  }
  BL()[newId] = copy;
  return newId;
}
// replace the expression block oldId (which sits in some input slot) with a fresh builder result
function replaceExpr(oldId, build) {
  const ref = refOf(oldId);
  if (!ref) throw new Error('cannot locate parent of ' + oldId);
  const fresh = build();
  const desc = ref.v.length > 2 ? [ref.v[0], fresh, ref.v[2]] : [ref.v[0], fresh];
  BL()[ref.pid].inputs[ref.slot] = desc;
  if (typeof fresh === 'string') BL()[fresh].parent = ref.pid;
  return fresh;
}
function spliceAfter(afterId, firstId) {
  const a = BL()[afterId];
  const nx = a.next;
  a.next = firstId;
  BL()[firstId].parent = afterId;
  let t = firstId;
  while (BL()[t].next) t = BL()[t].next;
  BL()[t].next = nx;
  if (nx) BL()[nx].parent = t;
  return firstId;
}
function detachTail(predId) {
  const p = BL()[predId];
  const nx = p.next;
  p.next = null;
  if (nx) BL()[nx].parent = null;
  return nx;
}
function callProc(proccode, args, fallbackWarp) {
  const defId = defIdOf(proccode);
  const t = T(IT);
  const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
  const argIds = JSON.parse(proto.mutation.argumentids);
  const inputs = {};
  for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
  return I('procedures_call', {
    inputs,
    mutation: { tagName: 'mutation', children: [], proccode, argumentids: proto.mutation.argumentids, warp: fallbackWarp || proto.mutation.warp || 'true' }
  });
}
const FAIL = (msg) => callProc('fail %s', [typeof msg === 'string' ? txt(msg) : msg]);
const FAILB = (expr) => callProc('fail %s', [expr]);   // message built by a block
function newProc(proccode, argNames) {
  const d = B.makeProcedure(IT, proccode, argNames, true);
  return d;
}
function attachBody(defId, ids) {
  const first = chain(ids);
  BL()[defId].next = first;
  if (first) BL()[first].parent = defId;
  return first;
}
function pruneUnreachable() {
  const keep = new Set();
  const stack = allIds().filter((id) => BL()[id].topLevel);
  while (stack.length) {
    const id = stack.pop();
    if (!id || keep.has(id)) continue;
    const b = BL()[id];
    if (!b) continue;
    keep.add(id);
    for (const v of Object.values(b.inputs || {})) { if (v && typeof v[1] === 'string') stack.push(v[1]); }
    if (b.next) stack.push(b.next);
  }
  let dropped = 0;
  for (const id of allIds()) if (!keep.has(id)) { delete BL()[id]; dropped++; }
  return dropped;
}
function relinkParents() {
  const blocks = BL();
  for (const id of Object.keys(blocks)) blocks[id].parent = null;
  for (const id of Object.keys(blocks)) {
    const b = blocks[id];
    if (b.next && blocks[b.next]) blocks[b.next].parent = id;
    for (const v of Object.values(b.inputs || {})) if (v && typeof v[1] === 'string' && blocks[v[1]]) blocks[v[1]].parent = id;
  }
}

function ancestor(id, pred) {
  let cur = id, guard = 0;
  while (cur && guard++ < 200) {
    const p = BL()[cur].parent;
    if (!p) return null;
    cur = p;
    if (pred(BL()[cur])) return cur;
  }
  return null;
}
function predecessorOf(id) { for (const pid of allIds()) if (BL()[pid].next === id) return pid; return null; }
function setStack(parentId, slot, ids) {
  const first = ids && ids.length ? chain(ids.slice()) : null;
  BL()[parentId].inputs[slot] = [2, first];
  if (first) BL()[first].parent = parentId;
  return first;
}
function prependStack(parentId, slot, blockId) {
  const cur = BL()[parentId].inputs[slot] ? BL()[parentId].inputs[slot][1] : null;
  let tail = blockId;
  while (BL()[tail].next) tail = BL()[tail].next;
  if (typeof cur === 'string') { BL()[tail].next = cur; BL()[cur].parent = tail; }
  BL()[parentId].inputs[slot] = [2, blockId];
  BL()[blockId].parent = parentId;
  return blockId;
}
function replaceStmt(oldId, newId) {
  const pred = predecessorOf(oldId);
  const nx = BL()[oldId].next;
  if (pred) { BL()[pred].next = newId; BL()[newId].parent = pred; }
  else {
    const ref = refOf(oldId);
    if (!ref) throw new Error('cannot place statement ' + oldId);
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], newId, ref.v[2]] : [ref.v[0], newId];
    BL()[newId].parent = ref.pid;
  }
  BL()[newId].next = nx; if (nx) BL()[nx].parent = newId;
  return newId;
}
function insertBeforeStmt(targetId, ids) {
  const first = chain(ids.slice());
  const pred = predecessorOf(targetId);
  if (pred) spliceAfter(pred, first);
  else {
    const ref = refOf(targetId);
    if (!ref) throw new Error('cannot insert before ' + targetId);
    BL()[ref.pid].inputs[ref.slot] = ref.v.length > 2 ? [ref.v[0], first, ref.v[2]] : [ref.v[0], first];
    BL()[first].parent = ref.pid;
    let tail = first;
    while (BL()[tail].next) tail = BL()[tail].next;
    BL()[tail].next = targetId;
    BL()[targetId].parent = tail;
  }
  return first;
}

// ---------------------------------------------------------------- patches
const PATCHES = [];
function patch(name, fn) { PATCHES.push({ name, fn }); }
function patchEnabled(name) { return !SKIP.has(name) && ![...SKIP].some((s) => name.startsWith(s.split(' ')[0]) && s.split(' ')[0] === name.split(' ')[0]); }


// P785: next(iterator, default) evaluates both arguments once, uses the
// generator/iterator protocols, and catches only StopIteration.
patch('P785 next default argument',()=>{
  const call=(p,...args)=>callProc(p,args),a=n=>argOf(n),v=n=>VAR(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  const put=(l,i,x)=>I('data_replaceitemoflist',{fields:B.LISTF(l),inputs:{INDEX:B.REP(i,[4,'1']),ITEM:B.REP(x,[10,''])}});
  const del=(l,i)=>I('data_deleteoflist',{fields:B.LISTF(l),inputs:{INDEX:B.REP(i,[4,'1'])}});
  const native=(l,x)=>I('data_itemnumoflist',{fields:B.LISTF(l),inputs:{ITEM:B.REP(x,[10,''])}});
  for(const n of ['nx785src','nx785pos','nx785len','nx785err'])newVar(n,0);
  const pullG=()=>[call('substr %s %s %s',a('it'),num(3),lenOf(a('it'))),call('gxpull %s',v('ev'))];
  attachBody(newProc('nextPull785 %s %s',['it','typ']).defId,[
    IF(EQ(a('typ'),txt('G')),[...pullG(),stop()]),
    IF(EQ(a('typ'),txt('Y')), [
      IF(EQ(letterOf(num(1),item('ItSrc',a('it'))),txt('G')),[call('nextPull785 %s %s',item('ItSrc',a('it')),txt('G')),stop()]),
      setV('nx785src',item('ItSrc',a('it'))),setV('nx785pos',item('ItPos',a('it'))),
      call('listlen %s',v('nx785src')),setV('nx785len',v('ev')),
      IF(GT(v('nx785pos'),v('nx785len')), [
        setV('nx785err',native('GErrV',v('nx785src'))),
        IFELSE(GT(v('nx785err'),num(0)),[FAILB(item('GErrE',v('nx785err'))),del('GErrV',v('nx785err')),del('GErrE',v('nx785err')),del('GErrP',v('nx785err'))],[call('genStop782 %s %s',num(0),num(0))]),stop()
      ]),call('listitem %s %s',v('nx785src'),v('nx785pos')),put('ItPos',a('it'),ADD(v('nx785pos'),num(1))),stop()
    ]),
    IF(EQ(a('typ'),txt('O')), [
      call('nameHas776FnName %s',JOIN(item('InstCls',a('it')),txt('.__next__'))),
      IF(EQ(v('cs776found'),num(1)),[call('callmeth %s %s %s %s',a('it'),txt('__next__'),num(1),num(0)),stop()])
    ]),FAIL('TypeError: object is not an iterator')
  ]);
  attachBody(newProc('nextArgs785 %s',['args']).defId,[
    call('listlen %s',a('args')),
    IF(OR(LT(v('ev'),num(1)),GT(v('ev'),num(2))),[FAIL('TypeError: next expected 1 or 2 arguments'),stop()]),
    call('listitem %s %s',a('args'),num(1)),call('egSave764'),call('nextPull785 %s %s',v('ev'),v('evtype')),call('egRestore764'),
    IF(NOT(EQ(v('error'),txt(''))),[
      call('listlen %s',a('args')),IF(EQ(v('ev'),num(2)),[
        IF(GT(llen('ErrV'),num(0)),[
          setV('p2c1',item('InstCls',item('ErrV',num(1)))),setV('p2c2',txt('StopIteration')),call('isanc'),
          IF(EQ(v('p2r'),num(1)),[setV('error',txt('')),clearL('ErrV'),clearL('ErrT'),clearL('ErrN'),call('listitem %s %s',a('args'),num(2))])
        ])
      ])
    ])
  ]);
  // Keep the existing single-argument next path for synthetic iterators and
  // historical behavior; route comma-separated calls before one-arg gates.
  // Multi-argument calls use a separate expression-parser builtin allowlist.
  const gate=allIds().find(id=>BL()[id].opcode==='operator_equals'&&Object.values(BL()[id].inputs||{}).some(x=>Array.isArray(x[1])&&x[1][1]==='hasattr')&&inDef('eval %s %s').has(id));
  if(!gate)throw Error('P785 parser gate');
  const tok=()=>cloneExpr(BL()[gate].inputs.OPERAND1[1]);
  replaceExpr(gate,()=>OR(EQ(tok(),txt('hasattr')),EQ(tok(),txt('next'))));
  for(const proc of ['callfn %s %s %s','callfnW %s %s %s']){
    insertBeforeStmt(BL()[defIdOf(proc)].next,[IF(EQ(a('fn'),txt('next')), [
      call('hascomma %s %s',a('lo'),a('hi')),
      IF(OR(EQ(v('tqhcm'),num(1)),GT(a('lo'),a('hi'))),[
        // A user function named next has precedence over the builtin.
        call('nameHas776FnName %s',a('fn')),
        IF(EQ(v('cs776found'),num(0)),[
          call('nameHas776ClsName %s',a('fn')),
          IF(EQ(v('cs776found'),num(0)),[
            call('lookup %s',a('fn')),
            IF(OR(EQ(v('found'),num(0)),AND(EQ(item('Types',v('found')),txt('S')),EQ(item('Values',v('found')),txt('<built-in function next>')))),[
              call('ex232args %s %s',a('lo'),a('hi')),IF(EQ(v('error'),txt('')),[call('nextArgs785 %s',v('ev'))]),setV('pending',num(1)),stop()
            ])
          ])
        ])
      ])
    ])]);
  }
  // iter(user_object) must retain the actual iterator returned by __iter__,
  // rather than wrap its numeric instance id as a serialized sequence.
  for(const id of ['bcontro_naxafvvkv','bwr_om63gsx1v']){
    const first=BL()[id].inputs.SUBSTACK[1];
    insertBeforeStmt(first,[IF(EQ(v('evtype'),txt('O')), [
      call('nameHas776FnName %s',JOIN(item('InstCls',v('ev')),txt('.__iter__'))),
      IF(EQ(v('cs776found'),num(1)),[
        call('egSave764'),call('callmeth %s %s %s %s',v('ev'),txt('__iter__'),num(1),num(0)),call('egRestore764'),
        IF(EQ(v('error'),txt('')), [
          IF(EQ(v('evtype'),txt('O')),[call('nameHas776FnName %s',JOIN(item('InstCls',v('ev')),txt('.__next__'))),IF(NOT(EQ(v('cs776found'),num(1))),[FAIL('TypeError: iter() returned non-iterator')])]),
          IF(NOT(OR(EQ(v('evtype'),txt('O')),OR(EQ(v('evtype'),txt('G')),EQ(v('evtype'),txt('Y'))))),[FAIL('TypeError: iter() returned non-iterator')])
        ]),setV('pending',num(1)),stop()
      ])
    ])]);
  }
});

// P786: explicit StopIteration constructors initialize value from args[0].
patch('P786 StopIteration construction',()=>{
  const call=(p,...args)=>callProc(p,args),a=n=>argOf(n),v=n=>VAR(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  attachBody(newProc('stopValueArgs786 %s %s',['id','args']).defId,[
    call('listlen %s',a('args')),
    IFELSE(GT(v('ev'),num(0)),[call('listitem %s %s',a('args'),num(1)),call('aset %s %s %s %s',a('id'),txt('value'),v('evtype'),v('ev'))],[call('aset %s %s %s %s',a('id'),txt('value'),txt('Z'),txt(''))])
  ]);
  attachBody(newProc('stopValue786 %s',['id']).defId,[
    setV('p2c1',item('InstCls',a('id'))),setV('p2c2',txt('StopIteration')),call('isanc'),IF(NOT(EQ(v('p2r'),num(1))),[stop()]),
    // Existing explicit assignments to .value must not be overwritten.
    call('attrfind %s %s',a('id'),txt('value')),IF(GT(v('ev'),num(0)),[stop()]),
    call('attrfind %s %s',a('id'),txt('args')),
    IFELSE(GT(v('ev'),num(0)),[
      call('stopValueArgs786 %s %s',a('id'),item('IAttrVal',v('ev')))
    ],[call('aset %s %s %s %s',a('id'),txt('value'),txt('Z'),txt(''))])
  ]);
  for(const id of ['bdatade_14gz2el2cg','bdatade_14huaxauph']){
    // Constructor result is already in ev; preserve it across attribute work.
    insertBeforeStmt(id,[IF(EQ(v('error'),txt('')), [addTo('VStack',v('ev')),addTo('VStack',v('evtype')),addTo('VStack',v('evK')),
      call('stopValue786 %s',item('ExCtorId',llen('ExCtorId'))),
      ...['evK','evtype','ev'].flatMap(n=>[setV(n,item('VStack',llen('VStack'))),I('data_deleteoflist',{fields:B.LISTF('VStack'),inputs:{INDEX:txt('last')}})])
    ])]);
  }
  // Ordinary exhausted iterators also expose StopIteration.value == None.
  spliceAfter('bdataad_14mv7gx75z',chain([IF(EQ(item('InstCls',v('ex25id')),txt('StopIteration')),[call('stopValue786 %s',v('ex25id'))])]));
});

// P787: chained calls accept bound-method values as well as functions.
patch('P787 bound method chained call',()=>{
  const a=n=>argOf(n),v=n=>VAR(n),call=(p,...args)=>callProc(p,args);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  for(const n of ['bm787i','bm787dot','bm787recv'])newVar(n,0);
  attachBody(newProc('callBound787 %s %s %s',['m','lo','hi']).defId,[
    setV('bm787dot',num(0)),setV('bm787i',num(1)),
    REPEATU(OR(GT(v('bm787i'),lenOf(a('m'))),GT(v('bm787dot'),num(0))),[IF(EQ(letterOf(v('bm787i'),a('m')),txt('.')),[setV('bm787dot',v('bm787i'))]),chgV('bm787i',num(1))]),
    IF(EQ(v('bm787dot'),num(0)),[FAIL('AttributeError: invalid bound method'),stop()]),
    call('substr %s %s %s',a('m'),num(1),SUB(v('bm787dot'),num(1))),setV('bm787recv',v('ev')),
    call('substr %s %s %s',a('m'),ADD(v('bm787dot'),num(1)),lenOf(a('m'))),call('callmeth %s %s %s %s',v('bm787recv'),v('ev'),a('lo'),a('hi'))
  ]);
  // The general chained-call parser already computes the suffix boundary;
  // extend its F-only gate, preserving the split across nested evaluation.
  for(const id of ['bcontro_ru5egjbt4','bcontro_s6az12pjd','bcontro_s84xddwum','bcontro_s9y5x3hzn','bcontro_sbsp2v50t','bcontro_sdmjnfxuf','bcontro_sfgg7jgyw','bcontro_sha18wxps','bcontro_sj4eeuov5']){
    const prev=BL()[id].parent;
    insertBeforeStmt(prev,[addTo('VStack',v('cq3'))]);
    spliceAfter(prev,chain([setV('cq3',item('VStack',llen('VStack'))),I('data_deleteoflist',{fields:B.LISTF('VStack'),inputs:{INDEX:txt('last')}})]));
    insertBeforeStmt(id,[IF(AND(EQ(v('error'),txt('')),EQ(v('evtype'),txt('M'))),[
      call('callBound787 %s %s %s',v('ev'),ADD(v('cq3'),num(1)),SUB(a('hi'),num(1))),chgV('fnlimit',num(-1)),stop()
    ])]);
  }
  // The specialized double-parenthesis branch used to re-call the original
  // function with both argument lists. Route the returned bound method instead.
  insertBeforeStmt('bproced_70smkdxtw',[addTo('VStack',v('cpf'))]);
  spliceAfter('bproced_70smkdxtw',chain([setV('cpf',item('VStack',llen('VStack'))),I('data_deleteoflist',{fields:B.LISTF('VStack'),inputs:{INDEX:txt('last')}})]));
  replaceStmt('bproced_q5cuq5vlb',call('callBound787 %s %s %s',v('ev'),ADD(v('cpf'),num(2)),SUB(a('hi'),num(1))));
  // Attribute access on a compound receiver also yields a bound method.
  insertBeforeStmt('bdatase_dgb06jnbc',[call('nameHas776FnName %s',JOIN(JOIN(item('InstCls',v('atid')),txt('.')),v('atnm'))),
    IF(EQ(v('cs776found'),num(1)),[setV('ev',JOIN(JOIN(v('atid'),txt('.')),v('atnm'))),setV('evtype',txt('M')),setV('evK',txt('')),chgV('fnlimit',num(-1)),stop()])]);
});

// P788: linear serialized dictionary projection and integer-only sum.
// Preserve the general implementations as fallbacks for complex encoding,
// floating-point, big integers, or malformed/unexpected representations.
patch('P788 linear dictionary projection and integer sum',()=>{
  const call=(p,...args)=>callProc(p,args),a=n=>argOf(n),v=n=>VAR(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  for(const n of ['pr788i','pr788n','pr788pick','pr788c','pr788ok','pr788out','su788i','su788ok','su788field','su788total','su788c','su788tag'])newVar(n,0);
  const s=()=>a('s'),ch=()=>v('pr788c');
  attachBody(newProc('dictProject788 %s %s',['s','parity']).defId,[
    setV('pr788ok',num(1)),setV('pr788out',txt('')),setV('pr788i',num(1)),setV('pr788n',num(0)),setV('pr788pick',num(0)),
    REPEATU(OR(GT(v('pr788i'),lenOf(s())),EQ(v('pr788ok'),num(0))),[
      setV('pr788c',letterOf(v('pr788i'),s())),
      IF(EQ(ch(),v('lsep')), [chgV('pr788n',num(1)),setV('pr788pick',num(0)),IF(EQ(MOD(v('pr788n'),num(2)),a('parity')),[
        setV('pr788pick',num(1)),
        // Existing listitem normalizes C/PX complex tags; keep slow path.
        IF(OR(EQ(letterOf(ADD(v('pr788i'),num(1)),s()),txt('C')),GT(ADD(v('pr788i'),num(1)),lenOf(s()))),[setV('pr788ok',num(0))])
      ])]),
      IF(EQ(v('pr788pick'),num(1)),[setV('pr788out',JOIN(v('pr788out'),ch()))]),chgV('pr788i',num(1))
    ]),
    IF(OR(NOT(EQ(MOD(v('pr788n'),num(2)),num(0))),AND(GT(lenOf(s()),num(0)),NOT(EQ(letterOf(num(1),s()),v('lsep'))))),[setV('pr788ok',num(0))]),
    IF(EQ(v('pr788ok'),num(1)),[setV('ev',v('pr788out')),setV('evK',txt('')),setV('evtype',txt('L'))])
  ]);
  for(const [p,parity] of [['dictkeys %s',1],['dictvals %s',0]]){
    insertBeforeStmt(BL()[defIdOf(p)].next,[IF(GT(lenOf(s()),num(64)),[call('dictProject788 %s %s',s(),num(parity)),IF(EQ(v('pr788ok'),num(1)),[stop()])])]);
  }
  const i=()=>v('su788i'),field=()=>v('su788field'),total=()=>v('su788total');
  const safe=x=>AND(AND(LT(lenOf(x()),num(16)),EQ(JOIN(txt('x'),x()),JOIN(txt('x'),FLOOR(x())))),AND(GT(x(),num(-999999999999999)),LT(x(),num(999999999999999))));
  attachBody(newProc('sumInts788 %s',['s']).defId,[
    setV('su788i',num(1)),setV('su788total',num(0)),setV('su788ok',num(1)),
    REPEATU(OR(GT(i(),lenOf(s())),EQ(v('su788ok'),num(0))),[
      IFELSE(AND(EQ(letterOf(i(),s()),v('lsep')),EQ(letterOf(ADD(i(),num(1)),s()),txt('N'))),[
        chgV('su788i',num(2)),setV('su788field',txt('')),
        REPEATU(OR(GT(i(),lenOf(s())),EQ(letterOf(i(),s()),v('lsep'))),[setV('su788field',JOIN(field(),letterOf(i(),s()))),chgV('su788i',num(1))]),
        IFELSE(safe(field),[setV('su788total',ADD(total(),field())),IF(NOT(safe(total)),[setV('su788ok',num(0))])],[setV('su788ok',num(0))])
      ],[setV('su788ok',num(0))])
    ]),
    IF(EQ(v('su788ok'),num(1)),[setV('ev',total()),setV('evtype',txt('N')),setV('evK',txt(''))])
  ]);
  for(const id of ['bdatase_168qb5djp','bwr_oy45rvxak'])spliceAfter(id,chain([
    IF(AND(EQ(v('error'),txt('')),AND(GT(lenOf(v('ltmp')),num(64)),OR(EQ(v('evtype'),txt('L')),EQ(v('evtype'),txt('T'))))),[
      call('sumInts788 %s',v('ltmp')),IF(EQ(v('su788ok'),num(1)),[setV('pending',num(1)),stop()])
    ])
  ]));
});

// P789: cache a fully validated, unchanged numeric dictionary record for
// repeated bracket lookups. Mixed/float/large-integer records use old lookup.
patch('P789 repeated numeric dictionary lookup',()=>{
  const a=n=>argOf(n),v=n=>VAR(n),call=(p,...args)=>callProc(p,args);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});
  const rawEq=(x,y)=>EQ(JOIN(txt('x'),x),JOIN(txt('x'),y));
  const safe=x=>AND(AND(LT(lenOf(x()),num(16)),rawEq(x(),FLOOR(x()))),AND(GT(x(),num(-999999999999999)),LT(x(),num(999999999999999))));
  for(const l of ['DNKeys789','DNVals789'])B.addList(IT,l,[]);
  for(const n of ['dn789record','dn789reject','dn789valid','dn789seenReject','dn789i','dn789n','dn789field','dn789pos','dn789handled'])newVar(n,0);
  spliceAfter('bdatade_vej52uqnt',chain([clearL('DNKeys789'),clearL('DNVals789'),setV('dn789valid',num(0)),setV('dn789seenReject',num(0)),setV('dn789record',txt('')),setV('dn789reject',txt(''))]));
  const s=()=>a('rec'),i=()=>v('dn789i'),field=()=>v('dn789field');
  attachBody(newProc('dictNumericBuild789 %s',['rec']).defId,[
    setV('dn789valid',num(1)),clearL('DNKeys789'),clearL('DNVals789'),setV('dn789n',num(0)),setV('dn789i',num(1)),
    REPEATU(OR(GT(i(),lenOf(s())),EQ(v('dn789valid'),num(0))),[
      IFELSE(AND(EQ(letterOf(i(),s()),v('lsep')),EQ(letterOf(ADD(i(),num(1)),s()),txt('N'))),[
        chgV('dn789i',num(2)),setV('dn789field',txt('')),
        REPEATU(OR(GT(i(),lenOf(s())),EQ(letterOf(i(),s()),v('lsep'))),[setV('dn789field',JOIN(field(),letterOf(i(),s()))),chgV('dn789i',num(1))]),
        IFELSE(safe(field),[
          chgV('dn789n',num(1)),IFELSE(EQ(MOD(v('dn789n'),num(2)),num(1)),[addTo('DNKeys789',field())],[addTo('DNVals789',field())])
        ],[setV('dn789valid',num(0))])
      ],[setV('dn789valid',num(0))])
    ]),
    IF(NOT(EQ(llen('DNKeys789'),llen('DNVals789'))),[setV('dn789valid',num(0))]),
    IFELSE(EQ(v('dn789valid'),num(1)),[setV('dn789record',s())],[clearL('DNKeys789'),clearL('DNVals789'),setV('dn789reject',s()),setV('dn789seenReject',num(1))])
  ]);
  attachBody(newProc('dictNumericGet789 %s %s',['rec','key']).defId,[
    setV('dn789handled',num(0)),IF(NOT(safe(()=>a('key'))),[stop()]),
    IF(NOT(AND(EQ(v('dn789valid'),num(1)),rawEq(s(),v('dn789record')))),[
      IF(AND(EQ(v('dn789seenReject'),num(1)),rawEq(s(),v('dn789reject'))),[stop()]),
      call('dictNumericBuild789 %s',s()),IF(NOT(EQ(v('dn789valid'),num(1))),[stop()])
    ]),
    setV('dn789handled',num(1)),setV('dn789pos',I('data_itemnumoflist',{fields:B.LISTF('DNKeys789'),inputs:{ITEM:B.REP(a('key'),[10,''])}})),
    IFELSE(GT(v('dn789pos'),num(0)),[setV('ev',item('DNVals789',v('dn789pos'))),setV('evtype',txt('N')),setV('evK',txt(''))],[call('ex25key %s %s',a('key'),txt('N'))])
  ]);
  for(const id of ['bproced_4aes87ix0','bproced_4bf65o9r7'])insertBeforeStmt(id,[
    IF(AND(EQ(v('dgkt'),txt('N')),GT(lenOf(v('xa')),num(64))),[
      call('dictNumericGet789 %s %s',v('xa'),v('dgkey')),IF(EQ(v('dn789handled'),num(1)),[stop()])
    ])
  ]);
});

// P790: generator resume fixes for fresh-send recovery and suspended throw handlers.
// Scope deliberately excludes yield-from throw and dict views.
patch('P790 generator resume after send/throw',()=>{
  const v=n=>VAR(n);
  const idOf=b=>{for(const id of allIds())if(BL()[id]===b)return id;throw new Error('block id not found')};
  const gmy=()=>v('gmy');

  // P591 initializes a fresh generator with pc=GHpc, while the executor's
  // first dispatch advances once before executing a source line. Rewind only
  // a never-started generator; resumed generators retain their saved pc.
  const pcCandidates=find(inDef('calluser %s %s %s'),b=>b.opcode==='data_setvariableto'
    && b.fields?.VARIABLE?.[0]==='pc' && b.inputs?.VALUE &&
    JSON.stringify([...reach(idOf(b))].map(x=>BL()[x])).includes('GHpc') && b.next);
  if(pcCandidates.length!==1)throw new Error('[P790] calluser GHpc pc init='+pcCandidates.length);
  spliceAfter(pcCandidates[0],IF(AND(GT(gmy(),num(0)),EQ(item('GHStarted',gmy()),num(0))),[chgV('pc',num(-1))]));

  // P783 injects an exception and immediately calls trycatch in the same
  // calluser invocation. trycatch changes pc to the matched handler, but the
  // remainder still carries the old token/line view and skips the handler's
  // first side-effect statement. Stop here and dispatch the handler normally.
  const injected=find(inDef('calluser %s %s %s'),b=>b.opcode==='control_if'
    && b.inputs?.CONDITION
    && JSON.stringify([...reach(b.inputs.CONDITION[1])].map(x=>BL()[x])).includes('GHInject783')
    && b.inputs?.SUBSTACK
    && [...reach(b.inputs.SUBSTACK[1])].some(x=>BL()[x]?.opcode==='procedures_call' && BL()[x].mutation?.proccode==='trycatch'));
  if(injected.length!==1)throw new Error('[P790] injection guard='+injected.length);
  const tc=find(reach(BL()[injected[0]].inputs.SUBSTACK[1]),b=>b.opcode==='procedures_call' && b.mutation?.proccode==='trycatch');
  if(tc.length!==1)throw new Error('[P790] injected trycatch='+tc.length);
  spliceAfter(tc[0],I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}}));
});




// P791: minimal delegated-generator throw forwarding fix for v4.248 / P783.
//
// Scope: only the gen-L4-01 case:
//   outer.throw(ValueError(...)) while outer is suspended in `yield from sub()`;
//   sub catches ValueError and yields a recovery value.
//
// Root cause in P783 (genResumeException783): when the delegated child is
// resumed with throw(), a child-side handled exception clears `error` and
// leaves the child alive with its new yield in `ev/evtype`. P783 then clears
// the outer GHyfOn flag and resumes the OUTER generator with the same
// exception, bypassing the child's catch continuation.
//
// This patch installs a narrow pre-dispatch arm before P783's G.throw arm.
// It parses the throw argument using the same ex232args/genThrowArg783 path,
// injects the exception into GHyfG, and, only when the child handled it and
// yielded, returns that child yield directly as the outer.throw result.
//
// Deliberate limits:
//   * throw() only; close(), 3-argument throw(), and non-yielding child
//     completion remain on the original P783 path.
//   * If the child does not handle the exception (error remains non-empty),
//     the original P783 path is allowed to propagate it.
//   * No changes are made to existing files by this script itself.
patch('P791 delegated yield-from throw forwarding (minimal)',()=>{
  const call=(p,...args)=>callProc(p,args);
  const a=n=>argOf(n),v=n=>VAR(n);
  const stop=()=>I('control_stop',{fields:{STOP_OPTION:['this script',null]},mutation:{tagName:'mutation',children:[],hasnext:'false'}});

  for(const n of ['p791id','p791args','p791handled'])newVar(n,0);

  attachBody(newProc('yfThrowP791 %s %s %s',['xa','lo','hi']).defId,[
    setV('p791handled',num(0)),
    // xa is the parsed G#<gid> handle, matching genExceptionMeth783.
    call('substr %s %s %s',a('xa'),num(3),lenOf(a('xa'))),
    setV('p791id',v('ev')),
    IF(AND(GT(v('p791id'),num(0)),AND(
      EQ(item('GHyfOn',v('p791id')),num(1)),
      EQ(item('GHyfL',v('p791id')),num(0))
    )),[
      // Preserve P783's exact throw-argument parsing and validation.
      IF(GT(a('lo'),a('hi')),[
        // Leave malformed calls to the original P783 dispatcher.
      ],[
        call('ex232args %s %s',a('lo'),a('hi')),
        IF(EQ(v('error'),txt('')),[
          setV('p791args',v('ev')),
          call('listlen %s',v('p791args')),
          IF(EQ(v('ev'),num(1)),[
            call('listitem %s %s',v('p791args'),num(1)),
            call('genThrowArg783 %s %s',v('ev'),v('evtype')),
            IF(EQ(v('error'),txt('')),[
              // Inject into the delegated child, not the outer generator.
              call('genResumeException783 %s %s %s',item('GHyfG',v('p791id')),v('ev'),num(0)),
              // A caught exception that yields leaves the child alive and
              // places the recovery value in the shared ev/evtype result.
              IF(AND(EQ(v('error'),txt('')),EQ(item('GHdead',item('GHyfG',v('p791id'))),num(0))),[
                setV('evK',txt('')),
                setV('p791handled',num(1))
              ])
            ])
          ])
        ])
      ])
    ])
  ]);

  // Run before P783's existing G.close/G.throw dispatcher. A handled child
  // yield stops this script with ev/evtype intact; all other cases fall
  // through unchanged to genExceptionMeth783.
  insertBeforeStmt('bcontro_1aaal3ess',[
    IF(EQ(v('xb'),txt('G')),[
      call('nameEq776 %s %s',item('Tok',ADD(a('lo'),num(2))),txt('throw')),
      IF(EQ(v('cs776ok'),num(1)),[
        call('yfThrowP791 %s %s %s',v('xa'),ADD(a('lo'),num(4)),SUB(a('hi'),num(1))),
        IF(EQ(v('p791handled'),num(1)),[stop()])
      ])
    ])
  ]);

  console.log('[P791] minimal delegated yield-from throw forwarding installed');
});

// ---- DEBUG (V41_TRACE=1): record every executed line and the frame depth
if (process.env.V41_TRACE) {
  patch('PDEBUG trace', () => {
    B.addList(IT, 'Trace', []);
    newVar('tdbg', 0);
    const ex = defIdOf('execute');
    const first = BL()[ex].next;
    insertBeforeStmt(first, [
      addTo('Trace', JOIN(JOIN(JOIN(txt('EXEC pc='), VAR('pc')), JOIN(txt(' c='), VAR('cdepth'))), JOIN(txt(' head='), VAR('head'))))
    ]);
    let lastId = first; let g = 0;
    while (BL()[lastId].next && g++ < 5000) lastId = BL()[lastId].next;
    spliceAfter(lastId, chain([
      addTo('Trace', JOIN(JOIN(JOIN(txt('EXECEND pc='), VAR('pc')), JOIN(txt(' c='), VAR('cdepth'))), JOIN(txt(' err='), VAR('error'))))
    ]));
    const runDef = (() => { for (const id of allIds()) { const b = BL()[id]; if (b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION && b.fields.BROADCAST_OPTION[0] === 'RUN') return id; } throw new Error('RUN hat not found'); })();
    spliceAfter(runDef, chain([clearL('Trace')]));
    console.log('[trace] enabled');
  });
}

// ---------------------------------------------------------------- main
relinkParents();
for (const p of PATCHES) { if (!patchEnabled(p.name)) { console.log('[skip] ' + p.name); continue; } p.fn(); }
const dropped = pruneUnreachable();
relinkParents();

// web-safe normalisation: no reporter block may have more than one owner,
// otherwise the community importer leaves dangling references behind.
const webReport = normalizeProject(project);
console.log('[webfix] multi-owned reporters inlined=' + webReport.inlinedMulti.length +
  ' cloned=' + webReport.cloned.length + ' shadow-flag-fixed=' + webReport.shadowFixed.length +
  ' dangling=' + webReport.dangling.length +
  ' (next-shared blocks left as-is: ' + webReport.multiNext.length + ')');
if (webReport.dangling.length) {
  console.error('WEBFIX ERROR: project already has dangling block references');
  for (const d of webReport.dangling.slice(0, 8)) console.error('  DANGLING ' + d.target + ' ' + d.id + ' <- ' + JSON.stringify(d.refs).slice(0, 200));
  process.exit(1);
}
relinkParents();

// structural check: every non-top-level block must have a parent
let orphans = 0;
for (const id of allIds()) { const b = BL()[id]; if (!b.topLevel && !b.parent) orphans++; }

if (project.meta) project.meta.agent = STAMP;

const outEntries = entries.map((e) => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);
zipWrite(outEntries, OUT);
fs.writeFileSync(OUT_JSON, JSON.stringify(project));
let total = 0;
for (const t of project.targets) { const n = Object.keys(t.blocks || {}).length; total += n; console.log('  ' + t.name.padEnd(14) + ' blocks=' + String(n).padStart(6) + ' vars=' + String(Object.keys(t.variables || {}).length).padStart(4) + ' lists=' + Object.keys(t.lists || {}).length); }
console.log('[build] pruned=' + dropped + ' orphans=' + orphans + ' total=' + total + ' -> ' + OUT);
if (orphans) { console.error('STRUCTURE ERROR: ' + orphans + ' non-top blocks without parent'); process.exit(1); }
