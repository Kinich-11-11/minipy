
'use strict';
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite, makeBuilder } = require('./sb3lib.js');

const SRC = 'D:/编程/scratch/ai/minipython/MiniPy_v3.sb3';
const WORK = 'D:/编程/scratch/ai/minipython/_work';
const OUT_DIR = path.join(WORK, 'v4.1');
const OUT_JSON = path.join(OUT_DIR, 'project.json');
const OUT_SB3 = 'D:/编程/scratch/ai/minipython/MiniPy_v4.1.sb3';

// ---- load ----
const entries = zipRead(SRC);
const projEntry = entries.find(e => e.name === 'project.json');
const project = JSON.parse(projEntry.data.toString('utf8'));
const B = makeBuilder(project);

function T(name) { return project.targets.find(t => t.name === name); }
function blockOf(target, id) { return T(target).blocks[id]; }
function findBlocks(target, pred) {
  return Object.entries(T(target).blocks).filter(([id, b]) => pred(b, id));
}
// find the procedures_definition block id for a given proccode in a target
function findDef(targetName, proccode) {
  const t = T(targetName);
  for (const [id, b] of Object.entries(t.blocks)) {
    if (b.opcode === 'procedures_definition' && b.inputs && b.inputs.custom_block) {
      const proto = t.blocks[b.inputs.custom_block[1]];
      if (proto && proto.mutation && proto.mutation.proccode === proccode) return id;
    }
  }
  throw new Error('definition not found: ' + proccode);
}

// ============ PATCH 1: console starts at the TOP row ============
// log %s : outpage = length(Output) - 6  ->  - 8   (console shows 9 rows)
(function patchOutpage() {
  const logDef = 'W=:SYKDB/gAVf{OVP~Lc';
  const interp = T('Interpreter');
  // walk the definition body
  let id = interp.blocks[logDef].next;
  let found = null;
  while (id) {
    const b = interp.blocks[id];
    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'outpage') { found = b; break; }
    id = b.next;
  }
  if (!found) throw new Error('outpage setter not found');
  const subId = found.inputs.VALUE[1];
  const sub = interp.blocks[subId];
  if (sub.opcode !== 'operator_subtract') throw new Error('unexpected outpage expr ' + sub.opcode);
  if (sub.inputs.NUM2[1][1] !== '6') throw new Error('unexpected outpage offset ' + JSON.stringify(sub.inputs.NUM2));
  sub.inputs.NUM2 = [1, [4, '8']];
  console.log('[patch1] outpage offset 6 -> 8');
})();

// ============ PATCH 0: remove O- / O+ shortcut hint ============
(function patchShortcutHint() {
  let removed = 0;
  for (const target of project.targets) for (const block of Object.values(target.blocks || {})) {
    for (const input of Object.values(block.inputs || {})) {
      if (Array.isArray(input) && input[0] === 1 && Array.isArray(input[1]) && input[1][1] === 'O-/O+: console page') {
        input[1][1] = '';
        removed++;
      }
    }
  }
  console.log('[patch0] removed O-/O+ hint:', removed);
})();

// ============ PATCH 3: export merges all code into ONE line ============
(function patchExport() {
  const def = findDef('Controller', 'exportCode');
  const ctrl = T('Controller');
  const oldBody = [];
  let id = ctrl.blocks[def].next;
  while (id) { oldBody.push(id); id = ctrl.blocks[id].next; }
  // remove old body blocks
  for (const bid of oldBody) delete ctrl.blocks[bid];
  B.setCtx('Controller');
  const mkV = (n) => B.VAR(n);
  const joinOf = (a, b) => B.B('Controller', 'operator_join', { inputs: { STRING1: B.REP(a), STRING2: B.REP(b) } });
  const blocks = [];
  blocks.push(B.B('Controller', 'data_deletealloflist', { fields: B.LISTF('Export') }));
  blocks.push(B.B('Controller', 'data_setvariableto', { fields: B.VARF('ut'), inputs: { VALUE: B.txt('') } }));
  blocks.push(B.B('Controller', 'data_setvariableto', { fields: B.VARF('ui'), inputs: { VALUE: B.num(1) } }));
  // repeat (length of Code) { if ui>1 { ut = ut | } ; ut = ut + item ui of Code ; ui+1 }
  const lenCode = B.B('Controller', 'data_lengthoflist', { fields: B.LISTF('Code') });
  const itemCode = B.B('Controller', 'data_itemoflist', { fields: B.LISTF('Code'), inputs: { INDEX: mkV('ui') } });
  const cond = B.B('Controller', 'operator_gt', { inputs: { OPERAND1: mkV('ui'), OPERAND2: B.num(1) } });
  const setJoin = B.B('Controller', 'data_setvariableto', { fields: B.VARF('ut'), inputs: { VALUE: B.REP(joinOf(mkV('ut'), B.txt('|'))) } });
  const condIf = B.B('Controller', 'control_if', { inputs: { CONDITION: B.BOOL(cond) } });
  B.sub('Controller', condIf, 'SUBSTACK', setJoin);
  const setAcc = B.B('Controller', 'data_setvariableto', { fields: B.VARF('ut'), inputs: { VALUE: B.REP(joinOf(mkV('ut'), itemCode)) } });
  const uiPlus = B.B('Controller', 'data_changevariableby', { fields: B.VARF('ui'), inputs: { VALUE: B.num(1) } });
  const inner = B.chain('Controller', [condIf, setAcc, uiPlus]);
  const rep = B.B('Controller', 'control_repeat', { inputs: { TIMES: B.REP(lenCode) } });
  B.sub('Controller', rep, 'SUBSTACK', inner);
  blocks.push(rep);
  blocks.push(B.B('Controller', 'data_addtolist', { fields: B.LISTF('Export'), inputs: { ITEM: B.REP(mkV('ut')) } }));
  blocks.push(B.B('Controller', 'data_showlist', { fields: B.LISTF('Export') }));
  blocks.push(B.B('Controller', 'data_setvariableto', { fields: B.VARF('exportShown'), inputs: { VALUE: B.txt('1') } }));
  blocks.push(B.B('Controller', 'data_setvariableto', { fields: B.VARF('status'), inputs: { VALUE: B.txt('Export: whole program on 1 line ( | = newline )') } }));
  blocks.push(B.B('Controller', 'data_setvariableto', { fields: B.VARF('dirty'), inputs: { VALUE: B.txt('1') } }));
  const first = B.chain('Controller', blocks);
  ctrl.blocks[def].next = first;
  ctrl.blocks[first].parent = def;
  console.log('[patch3] exportCode rewritten ->', blocks.length, 'blocks');
})();


// ============ PATCH 2: pointer-directed 1-line scrolling ============
(function patchScroll() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const setV = (n, v) => C('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const chgV = (n, v) => C('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const cmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => C('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => C('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const MX = () => C('sensing_mousex');
  const MY = () => C('sensing_mousey');
  const lenOf = (list) => C('data_lengthoflist', { fields: B.LISTF(list) });
  const ifB = (cond, ids) => { const id = C('control_if', { inputs: { CONDITION: B.BOOL(cond) } }); B.sub('Controller', id, 'SUBSTACK', B.chain('Controller', ids)); return id; };
  const ifElse = (cond, a, b) => { const id = C('control_if_else', { inputs: { CONDITION: B.BOOL(cond) } }); B.sub('Controller', id, 'SUBSTACK', B.chain('Controller', a)); B.sub('Controller', id, 'SUBSTACK2', B.chain('Controller', b)); return id; };

  // new sprite-local variables
  B.addVar('Controller', 'mpx', 0);
  B.addVar('Controller', 'mpy', 0);
  B.addVar('Controller', 'macc', 0);
  B.addVar('Controller', 'mzone', 0);
  B.addVar('Controller', 'mzone2', 0);
  B.addVar('Controller', 'mchg', 0);

  // ---- custom block: scrollone (dir) ----
  const sc = B.makeProcedure('Controller', 'scrollone %s', ['dir'], true);
  const dir = () => B.argReporter('Controller', 'dir');
  const scBody = [];
  // zone 1 = variables panel
  scBody.push(ifB(cmp('equals', B.VAR('mzone'), B.num(1)), [
    chgV('varpage', dir()),
    ifB(cmp('gt', B.VAR('varpage'), C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Names'), [4, '0']), NUM2: B.num(3) } })), [
      setV('varpage', C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Names'), [4, '0']), NUM2: B.num(3) } }))
    ]),
    ifB(cmp('lt', B.VAR('varpage'), B.num(1)), [setV('varpage', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  // zone 2 = console panel
  scBody.push(ifB(cmp('equals', B.VAR('mzone'), B.num(2)), [
    chgV('outpage', dir()),
    ifB(cmp('gt', B.VAR('outpage'), C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Output'), [4, '0']), NUM2: B.num(8) } })), [
      setV('outpage', C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Output'), [4, '0']), NUM2: B.num(8) } }))
    ]),
    ifB(cmp('lt', B.VAR('outpage'), B.num(1)), [setV('outpage', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  // zone 3 = code line-number gutter
  scBody.push(ifB(cmp('equals', B.VAR('mzone'), B.num(3)), [
    chgV('page', dir()),
    ifB(cmp('gt', B.VAR('page'), C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Code'), [4, '0']), NUM2: B.num(15) } })), [
      setV('page', C('operator_subtract', { inputs: { NUM1: B.REP(lenOf('Code'), [4, '0']), NUM2: B.num(15) } }))
    ]),
    ifB(cmp('lt', B.VAR('page'), B.num(1)), [setV('page', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  const scFirst = B.chain('Controller', scBody);
  const scDef = B.T['Controller'].blocks[sc.defId];
  scDef.next = scFirst; B.T['Controller'].blocks[scFirst].parent = sc.defId;

  // ---- the pointer only selects WHICH panel scrolls; the arrow keys do the scrolling ----
  const zoneBlocks = () => {
    const inConsole = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),
                          AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(29))));
    const inVars = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),
                       AND(cmp('gt', MY(), B.num(29)), cmp('lt', MY(), B.num(118))));
    const inGutter = AND(AND(cmp('gt', MX(), B.num(-230)), cmp('lt', MX(), B.num(-206))),
                         AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(118))));
    return [
      setV('mzone', B.num(0)),
      ifB(inConsole, [setV('mzone', B.num(2))]),
      ifB(inVars, [setV('mzone', B.num(1))]),
      ifB(inGutter, [setV('mzone', B.num(3))])
    ];
  };
  function patchArrow(keyName, dir) {
    const t = B.T['Controller'];
    let hatId = null;
    for (const [id, b] of Object.entries(t.blocks)) {
      if (b.topLevel && b.opcode === 'event_whenkeypressed' && b.fields.KEY_OPTION && b.fields.KEY_OPTION[0] === keyName) hatId = id;
    }
    if (!hatId) throw new Error('key hat not found: ' + keyName);
    const oldBody = t.blocks[hatId].next;
    const scrollCall = B.callProc('Controller', 'scrollone %s', sc.argIds, [B.num(dir)], true);
    const branch = ifElse(cmp('gt', B.VAR('mzone'), B.num(0)), [scrollCall], oldBody ? [oldBody] : []);
    const head = B.chain('Controller', [...zoneBlocks(), branch]);
    t.blocks[hatId].next = head;
    t.blocks[head].parent = hatId;
    if (oldBody) t.blocks[oldBody].parent = branch;
    console.log('[patch2] ' + keyName + ' -> scroll zone or edit');
  }
  patchArrow('up arrow', -1);
  patchArrow('down arrow', 1);
  console.log('[patch2] pointer scrolling installed');
})();


// ============ PATCH 4a: multiple (tuple) + chained assignment ============
(function patchMultiAssign() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const tokAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
  const kindAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Kind'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
  const lenOf = (n) => I('data_lengthoflist', { fields: B.LISTF(n) });
  const iIf = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', ids)); return id; };
  const iIfElse = (c, a, b) => { const id = I('control_if_else', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', a)); B.sub('Interpreter', id, 'SUBSTACK2', B.chain('Interpreter', b)); return id; };
  // call an existing custom block, reusing its declared argument ids
  function callExisting(proccode, args) {
    const t = B.T['Interpreter'];
    const defId = findDef('Interpreter', proccode);
    const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
    return I('procedures_call', { inputs, mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: proto.mutation.argumentids, warp: 'true' } });
  }
  const fail = (msg) => callExisting('fail %s', [B.txt(msg)]);

  // new sprite-local variables + lists
  B.addVar('Interpreter', 'eqi', 0);
  B.addVar('Interpreter', 'mi', 0);
  B.addVar('Interpreter', 'mj', 0);
  B.addList('Interpreter', 'AName', []);
  B.addList('Interpreter', 'AVal', []);
  B.addList('Interpreter', 'AType', []);
  B.addList('Interpreter', 'AComma', []);

  // ---------- new custom block: assignlist %s ----------
  const proc = B.makeProcedure('Interpreter', 'assignlist %s', ['eqi'], true);
  const eqi = () => B.argReporter('Interpreter', 'eqi');
  const bodyA = [];
  bodyA.push(I('data_deletealloflist', { fields: B.LISTF('AName') }));
  bodyA.push(I('data_deletealloflist', { fields: B.LISTF('AVal') }));
  bodyA.push(I('data_deletealloflist', { fields: B.LISTF('AType') }));
  bodyA.push(iSet('mi', B.num(1)));
  // collect assignment targets (odd positions 1..eqi-1)
  const nameLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('mi'), I('operator_subtract', { inputs: { NUM1: B.REP(eqi(), [4, '0']), NUM2: B.num(1) } }))) } });
  B.sub('Interpreter', nameLoop, 'SUBSTACK', B.chain('Interpreter', [
    iIf(NOT(iCmp('equals', kindAt(B.VAR('mi')), B.txt('I'))), [fail('SyntaxError: invalid assignment target')]),
    I('data_addtolist', { fields: B.LISTF('AName'), inputs: { ITEM: B.REP(tokAt(B.VAR('mi')), [10, '']) } }),
    iChg('mi', B.num(2))
  ]));
  bodyA.push(nameLoop);
  // values
  const tupleBranch = [];
  tupleBranch.push(I('data_deletealloflist', { fields: B.LISTF('AComma') }));
  tupleBranch.push(iSet('ed', B.num(0)));
  tupleBranch.push(iSet('mi', I('operator_add', { inputs: { NUM1: B.REP(eqi(), [4, '0']), NUM2: B.num(1) } })));
  const commaLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('mi'), B.VAR('count'))) } });
  B.sub('Interpreter', commaLoop, 'SUBSTACK', B.chain('Interpreter', [
    iSet('eop', tokAt(B.VAR('mi'))),
    iIf(OR(iCmp('equals', B.VAR('eop'), B.txt('(')), iCmp('equals', B.VAR('eop'), B.txt('['))), [iChg('ed', B.num(1))]),
    iIf(OR(iCmp('equals', B.VAR('eop'), B.txt(')')), iCmp('equals', B.VAR('eop'), B.txt(']'))), [iChg('ed', B.num(-1))]),
    iIf(AND(iCmp('equals', B.VAR('ed'), B.num(0)), iCmp('equals', B.VAR('eop'), B.txt(','))), [
      I('data_addtolist', { fields: B.LISTF('AComma'), inputs: { ITEM: B.REP(B.VAR('mi'), [4, '0']) } })
    ]),
    iChg('mi', B.num(1))
  ]));
  tupleBranch.push(commaLoop);
  tupleBranch.push(iIf(NOT(iCmp('equals', I('operator_add', { inputs: { NUM1: B.REP(lenOf('AComma'), [4, '0']), NUM2: B.num(1) } }), lenOf('AName'))), [
    fail('ValueError: unpack count mismatch')
  ]));
  tupleBranch.push(iSet('mj', B.num(1)));
  tupleBranch.push(iSet('plo', I('operator_add', { inputs: { NUM1: B.REP(eqi(), [4, '0']), NUM2: B.num(1) } })));
  const evalLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('mj'), lenOf('AComma'))) } });
  B.sub('Interpreter', evalLoop, 'SUBSTACK', B.chain('Interpreter', [
    iSet('phi', I('operator_subtract', { inputs: { NUM1: B.REP(I('data_itemoflist', { fields: B.LISTF('AComma'), inputs: { INDEX: B.REP(B.VAR('mj'), [4, '0']) } }), [4, '0']), NUM2: B.num(1) } })),
    callExisting('eval %s %s', [B.VAR('plo'), B.VAR('phi')]),
    iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } })]),
    I('data_addtolist', { fields: B.LISTF('AVal'), inputs: { ITEM: B.REP(B.VAR('ev'), [10, '']) } }),
    I('data_addtolist', { fields: B.LISTF('AType'), inputs: { ITEM: B.REP(B.VAR('evtype'), [10, '']) } }),
    iSet('plo', I('operator_add', { inputs: { NUM1: B.REP(I('data_itemoflist', { fields: B.LISTF('AComma'), inputs: { INDEX: B.REP(B.VAR('mj'), [4, '0']) } }), [4, '0']), NUM2: B.num(1) } })),
    iChg('mj', B.num(1))
  ]));
  tupleBranch.push(evalLoop);
  tupleBranch.push(callExisting('eval %s %s', [B.VAR('plo'), B.VAR('count')]));
  tupleBranch.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } })]));
  tupleBranch.push(I('data_addtolist', { fields: B.LISTF('AVal'), inputs: { ITEM: B.REP(B.VAR('ev'), [10, '']) } }));
  tupleBranch.push(I('data_addtolist', { fields: B.LISTF('AType'), inputs: { ITEM: B.REP(B.VAR('evtype'), [10, '']) } }));
  // chained branch
  const chainBranch = [];
  chainBranch.push(callExisting('eval %s %s', [I('operator_add', { inputs: { NUM1: B.REP(eqi(), [4, '0']), NUM2: B.num(1) } }), B.VAR('count')]));
  chainBranch.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } })]));
  chainBranch.push(iSet('mj', B.num(1)));
  const dupLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('mj'), lenOf('AName'))) } });
  B.sub('Interpreter', dupLoop, 'SUBSTACK', B.chain('Interpreter', [
    I('data_addtolist', { fields: B.LISTF('AVal'), inputs: { ITEM: B.REP(B.VAR('ev'), [10, '']) } }),
    I('data_addtolist', { fields: B.LISTF('AType'), inputs: { ITEM: B.REP(B.VAR('evtype'), [10, '']) } }),
    iChg('mj', B.num(1))
  ]));
  chainBranch.push(dupLoop);
  bodyA.push(iIfElse(iCmp('equals', tokAt(B.num(2)), B.txt(',')), tupleBranch, chainBranch));
  // perform assignments
  bodyA.push(iSet('mi', B.num(1)));
  const assignLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('mi'), lenOf('AName'))) } });
  B.sub('Interpreter', assignLoop, 'SUBSTACK', B.chain('Interpreter', [
    callExisting('assign %s %s %s', [
      I('data_itemoflist', { fields: B.LISTF('AName'), inputs: { INDEX: B.REP(B.VAR('mi'), [4, '0']) } }),
      I('data_itemoflist', { fields: B.LISTF('AVal'), inputs: { INDEX: B.REP(B.VAR('mi'), [4, '0']) } }),
      I('data_itemoflist', { fields: B.LISTF('AType'), inputs: { INDEX: B.REP(B.VAR('mi'), [4, '0']) } })
    ]),
    iChg('mi', B.num(1))
  ]));
  bodyA.push(assignLoop);
  const firstA = B.chain('Interpreter', bodyA);
  B.T['Interpreter'].blocks[proc.defId].next = firstA;
  B.T['Interpreter'].blocks[firstA].parent = proc.defId;

  // ---------- guard the simple assignment branch ----------
  const simpleAssign = 'Xv,cuWTQ6Nig_hZTchGj';
  const simpleCond = B.T['Interpreter'].blocks[simpleAssign].inputs.CONDITION[1];
  const notChained = NOT(iCmp('equals', tokAt(B.num(4)), B.txt('=')));
  const guarded = AND(simpleCond, notChained);
  B.T['Interpreter'].blocks[simpleAssign].inputs.CONDITION = [2, guarded];

  // ---------- new dispatch branches in execute ----------
  const scanEq = (last) => {
    const ids = [];
    ids.push(iSet('eqi', B.num(0)));
    ids.push(iSet('ed', B.num(0)));
    ids.push(iSet('ek', B.num(1)));
    const loop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('ek'), B.VAR('count'))) } });
    const inner = [
      iSet('eop', tokAt(B.VAR('ek'))),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt('(')), iCmp('equals', B.VAR('eop'), B.txt('['))), [iChg('ed', B.num(1))]),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt(')')), iCmp('equals', B.VAR('eop'), B.txt(']'))), [iChg('ed', B.num(-1))]),
      iIf(AND(iCmp('equals', B.VAR('ed'), B.num(0)), iCmp('equals', B.VAR('eop'), B.txt('='))), [
        last ? iIf(iCmp('gt', B.VAR('ek'), B.VAR('eqi')), [iSet('eqi', B.VAR('ek'))])
             : iIf(iCmp('equals', B.VAR('eqi'), B.num(0)), [iSet('eqi', B.VAR('ek'))])
      ]),
      iChg('ek', B.num(1))
    ];
    B.sub('Interpreter', loop, 'SUBSTACK', B.chain('Interpreter', inner));
    ids.push(loop);
    ids.push(iIfElse(iCmp('gt', B.VAR('eqi'), B.num(2)), [B.callProc('Interpreter', 'assignlist %s', proc.argIds, [B.VAR('eqi')], true)], [fail('SyntaxError: assignment')]));
    ids.push(iSet('pending', B.num(1)));
    return ids;
  };
  const tupleBranchExec = iIf(AND(iCmp('equals', kindAt(B.num(1)), B.txt('I')), iCmp('equals', tokAt(B.num(2)), B.txt(','))), scanEq(false));
  const chainBranchExec = iIf(AND(AND(iCmp('equals', kindAt(B.num(1)), B.txt('I')), iCmp('equals', tokAt(B.num(2)), B.txt('='))), iCmp('equals', tokAt(B.num(4)), B.txt('='))), scanEq(true));
  const delBlock = 'ed8b674925984dba8dc8';
  const interp = B.T['Interpreter'];
  const afterDel = interp.blocks[delBlock].next;
  const chainIds = B.chain('Interpreter', [tupleBranchExec, chainBranchExec]);
  interp.blocks[delBlock].next = chainIds;
  interp.blocks[chainIds].parent = delBlock;
  interp.blocks[chainBranchExec].next = afterDel;
  if (afterDel) interp.blocks[afterDel].parent = chainBranchExec;
  console.log('[patch4a] tuple/chained assignment installed');
})();


// ============ PATCH 4b: string indexing s[i] and slicing s[a:b] ============
(function patchIndexing() {
  B.setCtx('Interpreter');
  const BT = String.fromCharCode(96);
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const tokAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
  const lenOf = (n) => I('data_lengthoflist', { fields: B.LISTF(n) });
  const iIf = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', ids)); return id; };
  const iIfElse = (c, a, b) => { const id = I('control_if_else', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', a)); B.sub('Interpreter', id, 'SUBSTACK2', B.chain('Interpreter', b)); return id; };
  function callExisting(proccode, args) {
    const t = B.T['Interpreter'];
    const defId = findDef('Interpreter', proccode);
    const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
    return I('procedures_call', { inputs, mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: proto.mutation.argumentids, warp: 'true' } });
  }
  const fail = (msg) => callExisting('fail %s', [B.txt(msg)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });

  B.addVar('Interpreter', 'xi', 0);
  B.addVar('Interpreter', 'xa', '');
  B.addVar('Interpreter', 'xb', '');
  B.addVar('Interpreter', 'xcol', 0);
  B.addVar('Interpreter', 'xlo', 0);
  B.addVar('Interpreter', 'xhi', 0);
  B.addVar('Interpreter', 'xlen', 0);
  B.addVar('Interpreter', 'yb', '');
  B.addVar('Interpreter', 'yr', 0);

  // ---- substr %s %s %s : set ev to letters a..b of s ----
  const sub = B.makeProcedure('Interpreter', 'substr %s %s %s', ['s', 'a', 'b'], true);
  {
    const argS = () => B.argReporter('Interpreter', 's');
    const argA = () => B.argReporter('Interpreter', 'a');
    const argB = () => B.argReporter('Interpreter', 'b');
    const body = [];
    body.push(iSet('yb', B.txt('')));
    body.push(iSet('yr', argA()));
    const loop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('yr'), argB())) } });
    B.sub('Interpreter', loop, 'SUBSTACK', B.chain('Interpreter', [
      iSet('yb', JOIN(B.VAR('yb'), I('operator_letter_of', { inputs: { LETTER: B.REP(B.VAR('yr'), [4, '0']), STRING: B.REP(argS(), [10, '']) } }))),
      iChg('yr', B.num(1))
    ]));
    body.push(loop);
    body.push(iSet('ev', B.VAR('yb')));
    body.push(iSet('evtype', B.txt('S')));
    const first = B.chain('Interpreter', body);
    B.T['Interpreter'].blocks[sub.defId].next = first;
    B.T['Interpreter'].blocks[first].parent = sub.defId;
  }

  // ---- indexget %s %s : evaluate Tok[lo..hi] of the form A[ ... ] ----
  const ig = B.makeProcedure('Interpreter', 'indexget %s %s', ['lo', 'hi'], true);
  {
    const argLo = () => B.argReporter('Interpreter', 'lo');
    const argHi = () => B.argReporter('Interpreter', 'hi');
    const body = [];
    body.push(callExisting('eval %s %s', [argLo(), argLo()]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iSet('xa', B.VAR('ev')));
    body.push(iSet('xb', B.VAR('evtype')));
    body.push(iIf(NOT(iCmp('equals', B.VAR('xb'), B.txt('S'))), [fail('TypeError: string index required')]));
    body.push(iSet('xlen', I('operator_length', { inputs: { STRING: B.REP(B.VAR('xa'), [10, '']) } })));
    body.push(iSet('ed', B.num(0)));
    body.push(iSet('xcol', B.num(0)));
    body.push(iSet('xi', ADD(argLo(), B.num(2))));
    const colLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('xi'), SUB(argHi(), B.num(1)))) } });
    B.sub('Interpreter', colLoop, 'SUBSTACK', B.chain('Interpreter', [
      iSet('eop', tokAt(B.VAR('xi'))),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt('(')), iCmp('equals', B.VAR('eop'), B.txt('['))), [iChg('ed', B.num(1))]),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt(')')), iCmp('equals', B.VAR('eop'), B.txt(']'))), [iChg('ed', B.num(-1))]),
      iIf(AND(iCmp('equals', B.VAR('ed'), B.num(0)), iCmp('equals', B.VAR('eop'), B.txt(':'))), [
        iIf(iCmp('equals', B.VAR('xcol'), B.num(0)), [iSet('xcol', B.VAR('xi'))])
      ]),
      iChg('xi', B.num(1))
    ]));
    body.push(colLoop);
    const idxA = [];
    idxA.push(callExisting('eval %s %s', [ADD(argLo(), B.num(2)), SUB(argHi(), B.num(1))]));
    idxA.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    idxA.push(iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: index must be an integer')]));
    idxA.push(iSet('xi', B.VAR('ev')));
    idxA.push(iIf(iCmp('lt', B.VAR('xi'), B.num(0)), [iSet('xi', ADD(B.VAR('xi'), B.VAR('xlen')))]));
    idxA.push(iIf(OR(iCmp('lt', B.VAR('xi'), B.num(0)), iCmp('gt', B.VAR('xi'), SUB(B.VAR('xlen'), B.num(1)))), [fail('IndexError: string index out of range')]));
    idxA.push(B.callProc('Interpreter', 'substr %s %s %s', sub.argIds, [B.VAR('xa'), ADD(B.VAR('xi'), B.num(1)), ADD(B.VAR('xi'), B.num(1))], true));
    const idxB = [];
    idxB.push(iSet('xlo', B.num(0)));
    idxB.push(iSet('xhi', B.VAR('xlen')));
    idxB.push(iIf(iCmp('gt', B.VAR('xcol'), ADD(argLo(), B.num(2))), [
      callExisting('eval %s %s', [ADD(argLo(), B.num(2)), SUB(B.VAR('xcol'), B.num(1))]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: slice indices must be integers')]),
      iSet('xlo', B.VAR('ev'))
    ]));
    idxB.push(iIf(iCmp('lt', B.VAR('xcol'), SUB(argHi(), B.num(1))), [
      callExisting('eval %s %s', [ADD(B.VAR('xcol'), B.num(1)), SUB(argHi(), B.num(1))]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: slice indices must be integers')]),
      iSet('xhi', B.VAR('ev'))
    ]));
    idxB.push(iIf(iCmp('lt', B.VAR('xlo'), B.num(0)), [iSet('xlo', ADD(B.VAR('xlo'), B.VAR('xlen')))]));
    idxB.push(iIf(iCmp('lt', B.VAR('xhi'), B.num(0)), [iSet('xhi', ADD(B.VAR('xhi'), B.VAR('xlen')))]));
    idxB.push(iIf(iCmp('lt', B.VAR('xlo'), B.num(0)), [iSet('xlo', B.num(0))]));
    idxB.push(iIf(iCmp('gt', B.VAR('xhi'), B.VAR('xlen')), [iSet('xhi', B.VAR('xlen'))]));
    idxB.push(B.callProc('Interpreter', 'substr %s %s %s', sub.argIds, [B.VAR('xa'), ADD(B.VAR('xlo'), B.num(1)), B.VAR('xhi')], true));
    body.push(iIfElse(iCmp('equals', B.VAR('xcol'), B.num(0)), idxA, idxB));
    const first = B.chain('Interpreter', body);
    B.T['Interpreter'].blocks[ig.defId].next = first;
    B.T['Interpreter'].blocks[first].parent = ig.defId;
  }

  const interp = B.T['Interpreter'];
  const openParen = 'zl#T{s0{/lT+J==dG+2x';
  const closeParen = ')dr2teJ6?}V_y6Ef_j5[';
  const openBr = iIf(iCmp('equals', B.VAR('eop'), B.txt('[')), [iChg('ed', B.num(1))]);
  const closeBr = iIf(iCmp('equals', B.VAR('eop'), B.txt(']')), [iChg('ed', B.num(-1))]);
  const afterClose = interp.blocks[closeParen].next;
  interp.blocks[closeParen].next = openBr;
  interp.blocks[openBr].parent = closeParen;
  interp.blocks[openBr].next = closeBr;
  interp.blocks[closeBr].parent = openBr;
  interp.blocks[closeBr].next = afterClose;
  if (afterClose) interp.blocks[afterClose].parent = closeBr;
  console.log('[patch4b.1] bracket depth added to eval scan');

  const callfnElse = 'tJy:^jGB4+#6n' + BT + ',VS,[)';
  const failBlock = interp.blocks[callfnElse].inputs.SUBSTACK2[1];
  const bracketTest = AND(iCmp('equals', tokAt(ADD(B.argReporter('Interpreter', 'lo'), B.num(1))), B.txt('[')),
                          iCmp('equals', tokAt(B.argReporter('Interpreter', 'hi')), B.txt(']')));
  const igCall = B.callProc('Interpreter', 'indexget %s %s', ig.argIds, [B.argReporter('Interpreter', 'lo'), B.argReporter('Interpreter', 'hi')], true);
  const newIf = iIfElse(bracketTest, [igCall], [failBlock]);
  interp.blocks[failBlock].parent = newIf;
  interp.blocks[callfnElse].inputs.SUBSTACK2 = [2, newIf];
  interp.blocks[newIf].parent = callfnElse;
  console.log('[patch4b.2] index dispatch added to eval');
})();


// ============ PATCH 4c: for ch in string ============

(function patchStrFor() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const tokAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
  const lenOf = (n) => I('data_lengthoflist', { fields: B.LISTF(n) });
  const itemAt = (n, idx) => I('data_itemoflist', { fields: B.LISTF(n), inputs: { INDEX: B.REP(idx, [4, '0']) } });
  const iIf = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', ids)); return id; };
  const iIfElse = (c, a, b) => { const id = I('control_if_else', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', a)); B.sub('Interpreter', id, 'SUBSTACK2', B.chain('Interpreter', b)); return id; };
  function callExisting(proccode, args) {
    const t = B.T['Interpreter'];
    const defId = findDef('Interpreter', proccode);
    const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
    return I('procedures_call', { inputs, mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: proto.mutation.argumentids, warp: 'true' } });
  }
  const fail = (msg) => callExisting('fail %s', [B.txt(msg)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];
  B.addList('Interpreter', 'LoopText', []);
  const pushDef = findDef('Interpreter', 'pushLoop %s %s %s %s %s');
  {
    let id = interp.blocks[pushDef].next, last = null;
    while (id) { last = id; id = interp.blocks[id].next; }
    const add = I('data_addtolist', { fields: B.LISTF('LoopText'), inputs: { ITEM: B.txt('') } });
    interp.blocks[last].next = add; interp.blocks[add].parent = last;
  }
  const popDef = findDef('Interpreter', 'popLoop');
  {
    let id = interp.blocks[popDef].next, last = null;
    while (id) { last = id; id = interp.blocks[id].next; }
    const del = I('data_deleteoflist', { fields: B.LISTF('LoopText'), inputs: { INDEX: B.REP(lenOf('LoopText'), [4, '0']) } });
    interp.blocks[last].next = del; interp.blocks[del].parent = last;
  }
  const runLoopStep = '%Mp.X]]%R' + String.fromCharCode(96) + ',JqZJR)aj]';
  {
    const after = interp.blocks[runLoopStep].next;
    const clr = I('data_deletealloflist', { fields: B.LISTF('LoopText') });
    interp.blocks[runLoopStep].next = clr; interp.blocks[clr].parent = runLoopStep;
    interp.blocks[clr].next = after; if (after) interp.blocks[after].parent = clr;
  }
  const boundaryDef = findDef('Interpreter', 'boundary');
  {
    const repUntil = interp.blocks[interp.blocks[boundaryDef].next].next;
    const kindIfElse = interp.blocks[repUntil].inputs.SUBSTACK[1];
    const forBranch = interp.blocks[kindIfElse].inputs.SUBSTACK2[1];
    const strBranch = [
      iSet('lv', ADD(itemAt('LoopValue', B.VAR('lc')), B.num(1))),
      iIfElse(iCmp('lt', itemAt('LoopStop', B.VAR('lc')), B.VAR('lv')), [
        callExisting('popLoop', [])
      ], [
        I('data_replaceitemoflist', { fields: B.LISTF('LoopValue'), inputs: { INDEX: B.REP(B.VAR('lc'), [4, '0']), ITEM: B.REP(B.VAR('lv'), [4, '0']) } }),
        callExisting('assign %s %s %s', [
          itemAt('LoopName', B.VAR('lc')),
          I('operator_letter_of', { inputs: { LETTER: B.REP(B.VAR('lv'), [4, '0']), STRING: B.REP(itemAt('LoopText', B.VAR('lc')), [10, '']) } }),
          B.txt('S')
        ]),
        iSet('pc', ADD(itemAt('LoopHead', B.VAR('lc')), B.num(1)))
      ])
    ];
    const newIf = iIfElse(iCmp('equals', itemAt('LoopKind', B.VAR('lc')), B.txt('str')), strBranch, [forBranch]);
    interp.blocks[forBranch].parent = newIf;
    interp.blocks[kindIfElse].inputs.SUBSTACK2 = [2, newIf];
    interp.blocks[newIf].parent = kindIfElse;
  }
  const forDef = findDef('Interpreter', 'forloop');
  {
    const outerIf = interp.blocks[forDef].next;
    const rangeBranch = interp.blocks[outerIf].inputs.SUBSTACK2[1];
    interp.blocks[outerIf].inputs.CONDITION = [2, OR(NOT(iCmp('equals', tokAt(B.num(3)), B.txt('in'))), NOT(iCmp('equals', tokAt(B.VAR('count')), B.txt(':'))))];
    const strBody = [
      iSet('name', tokAt(B.num(2))),
      callExisting('eval %s %s', [B.num(4), SUB(B.VAR('count'), B.num(1))]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('S'))), [fail('TypeError: for expects a string')]),
      iIfElse(iCmp('gt', I('operator_length', { inputs: { STRING: B.REP(B.VAR('ev'), [10, '']) } }), B.num(0)), [
        callExisting('assign %s %s %s', [
          B.VAR('name'),
          I('operator_letter_of', { inputs: { LETTER: B.num(1), STRING: B.REP(B.VAR('ev'), [10, '']) } }),
          B.txt('S')
        ]),
        callExisting('pushLoop %s %s %s %s %s', [B.txt('str'), B.VAR('name'), B.num(1), I('operator_length', { inputs: { STRING: B.REP(B.VAR('ev'), [10, '']) } }), B.num(1)]),
        I('data_replaceitemoflist', { fields: B.LISTF('LoopText'), inputs: { INDEX: B.REP(lenOf('LoopText'), [4, '0']), ITEM: B.REP(B.VAR('ev'), [10, '']) } })
      ], [
        iSet('dest', itemAt('Ends', B.VAR('pc')))
      ])
    ];
    const strIf = iIfElse(AND(AND(iCmp('equals', tokAt(B.num(4)), B.txt('range')), iCmp('equals', tokAt(B.num(5)), B.txt('('))),
                             iCmp('equals', tokAt(SUB(B.VAR('count'), B.num(1))), B.txt(')'))), [rangeBranch], strBody);
    interp.blocks[rangeBranch].parent = strIf;
    interp.blocks[outerIf].inputs.SUBSTACK2 = [2, strIf];
    interp.blocks[strIf].parent = outerIf;
  }
  console.log('[patch4c] for..in string installed');
})();

// ---- validate project graph and package assets ----
function validateProjectGraph(p) {
  let checkedInputs = 0;
  for (const target of p.targets) {
    const blocks = target.blocks || {};
    const has = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(blocks, id);
    for (const [id, b] of Object.entries(blocks)) {
      if (b.next !== null && !has(b.next)) throw new Error(`${target.name}:${id} next -> missing ${b.next}`);
      if (b.parent !== null && !has(b.parent)) throw new Error(`${target.name}:${id} parent -> missing ${b.parent}`);
      if (b.topLevel && b.parent !== null) throw new Error(`${target.name}:${id} topLevel has parent`);
      if (!b.topLevel && b.parent === null) throw new Error(`${target.name}:${id} orphan non-topLevel block`);
      for (const [slot, input] of Object.entries(b.inputs || {})) {
        if (!Array.isArray(input)) continue;
        const kind = input[0];
        const ref = input[1];
        if ((kind === 1 || kind === 2 || kind === 3) && typeof ref === 'string' && has(ref)) {
          checkedInputs++;
          const child = blocks[ref];
          if (child.parent !== id) throw new Error(`${target.name}:${id}.${slot} child ${ref} parent is ${child.parent}`);
        } else if (kind === 2 || (kind === 1 && typeof ref === 'string')) {
          // A block-shaped input must resolve to a block; primitive [1,[type,value]] is allowed.
          if (kind === 2 || (typeof ref === 'string' && !has(ref))) throw new Error(`${target.name}:${id}.${slot} -> missing ${ref}`);
        }
      }
    }
  }
  if (!checkedInputs) throw new Error('no block inputs checked');
  return checkedInputs;
}
function validateZipAssets(filePath, p) {
  const es = zipRead(filePath);
  const names = new Set(es.map(e => e.name));
  if (!names.has('project.json')) throw new Error('package missing project.json');
  const pj = JSON.parse(es.find(e => e.name === 'project.json').data.toString('utf8'));
  if (JSON.stringify(pj) !== JSON.stringify(p)) throw new Error('packaged project.json differs from build model');
  for (const t of p.targets) for (const c of (t.costumes || [])) if (c.assetId && !names.has(`${c.assetId}.${c.dataFormat}`)) throw new Error(`missing costume asset ${c.assetId}`);
  for (const t of p.targets) for (const s of (t.sounds || [])) if (s.assetId && !names.has(`${s.assetId}.${s.dataFormat}`)) throw new Error(`missing sound asset ${s.assetId}`);
  return es.length;
}
// Rebuild ownership from reachable top-level trees. Clone shared reporter trees,
// remove disconnected remnants of replaced scripts, and normalize raw input IDs.
for (const t of project.targets) {
  const source = t.blocks, result = {}, used = new Set(); let serial = 0;
  function visit(id, parent, active = new Set()) {
    if (!source[id]) throw new Error('missing block '+id);
    if (active.has(id)) throw new Error('cyclic block '+id);
    const nextActive = new Set(active); nextActive.add(id);
    const newId = used.has(id) ? 'v41clone_'+(++serial) : id; used.add(id);
    const b = JSON.parse(JSON.stringify(source[id])); result[newId] = b;
    b.parent = parent; b.topLevel = parent === null;
    for (const [slot, raw] of Object.entries(b.inputs || {})) {
      const inp = typeof raw === 'string' ? [3, raw, [10,'']] : raw;
      b.inputs[slot] = inp;
      for (let j=1;j<inp.length;j++) if (typeof inp[j] === 'string' && source[inp[j]]) inp[j] = visit(inp[j], newId, nextActive);
    }
    if (b.next) b.next = visit(b.next, newId, nextActive);
    return newId;
  }
  for (const [id,b] of Object.entries(source)) if (b.topLevel) visit(id,null);
  t.blocks = result;
}
const checkedInputs = validateProjectGraph(project);
// ---- write ----
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(project));
const outEntries = entries.map(e => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);
zipWrite(outEntries, OUT_SB3);
const packageEntries = validateZipAssets(OUT_SB3, project);
console.log('validated', checkedInputs, 'block inputs;', packageEntries, 'zip entries');
console.log('wrote', OUT_SB3, JSON.stringify(project).length, 'bytes json');