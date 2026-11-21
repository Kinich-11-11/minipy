
'use strict';
const fs = require('fs');
const path = require('path');
const { zipRead, zipWrite, makeBuilder } = require('./sb3lib.js');

const SRC = 'D:/编程/scratch/ai/minipython/MiniPy_v3.sb3';
const WORK = 'D:/编程/scratch/ai/minipython/_work';
const OUT_JSON = path.join(WORK, 'build', 'project.json');
const OUT_SB3 = 'D:/编程/scratch/ai/minipython/MiniPy_v4.sb3';

// ---- load ----
const entries = zipRead(SRC);
const projEntry = entries.find(e => e.name === 'project.json');
const project = JSON.parse(projEntry.data.toString('utf8'));
const B = makeBuilder(project);
const SHARED = {};

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


  // ---- custom block: scrollone (zone, dir) ----
  // The zone is passed as an ARGUMENT, never through a shared variable, so two key
  // scripts (or a restarted script) can never scroll each other's panel.
  const sc = B.makeProcedure('Controller', 'scrollone %s %s', ['zone', 'dir'], true);
  const SUB = (a, b) => C('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const argZone = () => B.argReporter('Controller', 'zone');
  const argDir = () => B.argReporter('Controller', 'dir');
  const scBody = [];
  // zone 2 = console panel
  scBody.push(ifB(cmp('equals', argZone(), B.num(2)), [
    chgV('outpage', argDir()),
    ifB(cmp('gt', B.VAR('outpage'), SUB(lenOf('Output'), B.num(8))), [setV('outpage', SUB(lenOf('Output'), B.num(8)))]),
    ifB(cmp('lt', B.VAR('outpage'), B.num(1)), [setV('outpage', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  // zone 1 = variables panel
  scBody.push(ifB(cmp('equals', argZone(), B.num(1)), [
    chgV('varpage', argDir()),
    ifB(cmp('gt', B.VAR('varpage'), SUB(lenOf('Names'), B.num(3))), [setV('varpage', SUB(lenOf('Names'), B.num(3)))]),
    ifB(cmp('lt', B.VAR('varpage'), B.num(1)), [setV('varpage', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  // zone 3 = code line-number gutter
  scBody.push(ifB(cmp('equals', argZone(), B.num(3)), [
    chgV('page', argDir()),
    ifB(cmp('gt', B.VAR('page'), SUB(lenOf('Code'), B.num(15))), [setV('page', SUB(lenOf('Code'), B.num(15)))]),
    ifB(cmp('lt', B.VAR('page'), B.num(1)), [setV('page', B.num(1))]),
    setV('dirty', B.txt('1'))
  ]));
  const scFirst = B.chain('Controller', scBody);
  B.T['Controller'].blocks[sc.defId].next = scFirst;
  B.T['Controller'].blocks[scFirst].parent = sc.defId;

  // ---- each arrow-key script tests the three panels itself and passes the zone on ----
  const regionTests = () => {
    const console1 = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),
                         AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(29))));
    const vars1 = AND(AND(cmp('gt', MX(), B.num(67)), cmp('lt', MX(), B.num(230))),
                      AND(cmp('gt', MY(), B.num(29)), cmp('lt', MY(), B.num(118))));
    const gutter1 = AND(AND(cmp('gt', MX(), B.num(-230)), cmp('lt', MX(), B.num(-206))),
                        AND(cmp('gt', MY(), B.num(-118)), cmp('lt', MY(), B.num(118))));
    return { console1, vars1, gutter1 };
  };
  function patchArrow(keyName, dir) {
    const t = B.T['Controller'];
    let hatId = null;
    for (const [id, b] of Object.entries(t.blocks)) {
      if (b.topLevel && b.opcode === 'event_whenkeypressed' && b.fields.KEY_OPTION && b.fields.KEY_OPTION[0] === keyName) hatId = id;
    }
    if (!hatId) throw new Error('key hat not found: ' + keyName);
    const oldBody = t.blocks[hatId].next;
    const scrollIn = (zone) => B.callProc('Controller', 'scrollone %s %s', sc.argIds, [B.num(zone), B.num(dir)], true);
    const r = regionTests();
    const ladder = ifElse(r.console1, [scrollIn(2)], [
      ifElse(r.vars1, [scrollIn(1)], [
        ifElse(r.gutter1, [scrollIn(3)], [oldBody])
      ])
    ]);
    t.blocks[hatId].next = ladder;
    t.blocks[ladder].parent = hatId;
    if (oldBody) t.blocks[oldBody].parent = ladder;
    console.log('[patch2] ' + keyName + ' -> scroll the hovered panel one line');
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


// ============ PATCH 4d (part 1): charset + ord/chr in callfn ============
(function patchBuiltins1() {
  B.setCtx('Interpreter');
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
  const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const DIV = (a, b) => I('operator_divide', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LET = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
  const tokAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
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

  B.addVar('Interpreter', 'qcut', 0);
  B.addVar('Interpreter', 'narg', 0);
  B.addVar('Interpreter', 'argi', 0);
  B.addVar('Interpreter', 'qpow', 1);
  B.addVar('Interpreter', 'cs', '');
  let charset = '';
  for (let c = 32; c <= 126; c++) charset += String.fromCharCode(c);

  // ---- initialise the character set when prepare runs ----
  const prepDef = findDef('Interpreter', 'prepare');
  {
    const first = interp.blocks[prepDef].next;
    const setCs = iSet('cs', B.txt(charset));
    interp.blocks[prepDef].next = setCs;
    interp.blocks[setCs].parent = prepDef;
    interp.blocks[setCs].next = first;
    if (first) interp.blocks[first].parent = setCs;
  }

  // ---- ord() and chr() inside callfn ----
  const boolIf = '2c5a5acbcd214b3b898e';
  const pendingCheck = '5s^3~uK(Jxy1Bu:?;P=2';
  const ordB = [];
  ordB.push(iSet('xi', B.num(1)));
  ordB.push(iSet('found', B.num(0)));
  const searchLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(OR(iCmp('gt', B.VAR('xi'), B.num(95)), iCmp('equals', B.VAR('found'), B.num(1)))) } });
  B.sub('Interpreter', searchLoop, 'SUBSTACK', B.chain('Interpreter', [
    callExisting('compareText %s %s', [LET(B.VAR('xi'), B.VAR('cs')), B.VAR('ev')]),
    iIfElse(iCmp('equals', B.VAR('cmp'), B.num(0)), [iSet('found', B.num(1))], [iChg('xi', B.num(1))])
  ]));
  ordB.push(searchLoop);
  ordB.push(iIf(iCmp('equals', B.VAR('found'), B.num(0)), [fail('ValueError: ord() expected a character')]));
  ordB.push(iSet('ev', ADD(B.VAR('xi'), B.num(31))));
  ordB.push(iSet('evtype', B.txt('N')));
  ordB.push(iSet('pending', B.num(1)));
  const ordIf = iIf(iCmp('equals', B.argReporter('Interpreter', 'fn'), B.txt('ord')), ordB);
  const chkB = [];
  chkB.push(iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: chr() requires an integer')]));
  chkB.push(iIf(OR(iCmp('lt', B.VAR('ev'), B.num(32)), iCmp('gt', B.VAR('ev'), B.num(126))), [fail('ValueError: chr() arg not in range(32, 127)')]));
  chkB.push(iSet('ev', LET(SUB(B.VAR('ev'), B.num(31)), B.VAR('cs'))));
  chkB.push(iSet('evtype', B.txt('S')));
  chkB.push(iSet('pending', B.num(1)));
  const chkIf = iIf(iCmp('equals', B.argReporter('Interpreter', 'fn'), B.txt('chr')), chkB);
  const afterBool = interp.blocks[boolIf].next;
  interp.blocks[boolIf].next = ordIf;
  interp.blocks[ordIf].parent = boolIf;
  interp.blocks[ordIf].next = chkIf;
  interp.blocks[chkIf].parent = ordIf;
  interp.blocks[chkIf].next = afterBool;
  if (afterBool) interp.blocks[afterBool].parent = chkIf;
  console.log('[patch4d.1] ord/chr + charset installed');
})();
// ============ PATCH 4d (part 2): max/min/pow/round(x, n) ============
(function patchBuiltins2() {
  B.setCtx('Interpreter');
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
  const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const DIV = (a, b) => I('operator_divide', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
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

  // ---- builtin2 %s %s %s %s  (fn, lo, cut, hi) : 2-argument builtin, nesting safe ----
  const p2 = B.makeProcedure('Interpreter', 'builtin2 %s %s %s %s', ['fn', 'lo', 'cut', 'hi'], true);
  const p2b = B.makeProcedure('Interpreter', 'builtin2b %s %s %s %s %s', ['fn', 'a1v', 'a1t', 'lo2', 'hi'], true);
  {
    const A = (n) => B.argReporter('Interpreter', n);
    const body = [];
    body.push(callExisting('eval %s %s', [A('lo'), SUB(A('cut'), B.num(1))]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(B.callProc('Interpreter', 'builtin2b %s %s %s %s %s', p2b.argIds, [A('fn'), B.VAR('ev'), B.VAR('evtype'), ADD(A('cut'), B.num(1)), A('hi')], true));
    const first = B.chain('Interpreter', body);
    interp.blocks[p2.defId].next = first; interp.blocks[first].parent = p2.defId;
  }
  {
    const A = (n) => B.argReporter('Interpreter', n);
    const body = [];
    body.push(callExisting('eval %s %s', [A('lo2'), A('hi')]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iSet('pending', B.num(0)));
    // max
    body.push(iIf(iCmp('equals', A('fn'), B.txt('max')), [
      iIf(OR(NOT(iCmp('equals', A('a1t'), B.txt('N'))), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))), [fail('TypeError: max requires numbers')]),
      iIf(iCmp('gt', A('a1v'), B.VAR('ev')), [iSet('ev', A('a1v'))]),
      iSet('evtype', B.txt('N')),
      iSet('pending', B.num(1))
    ]));
    // min
    body.push(iIf(iCmp('equals', A('fn'), B.txt('min')), [
      iIf(OR(NOT(iCmp('equals', A('a1t'), B.txt('N'))), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))), [fail('TypeError: min requires numbers')]),
      iIf(iCmp('lt', A('a1v'), B.VAR('ev')), [iSet('ev', A('a1v'))]),
      iSet('evtype', B.txt('N')),
      iSet('pending', B.num(1))
    ]));
    // pow(a, b)
    const powBody = [];
    powBody.push(iIf(OR(NOT(iCmp('equals', A('a1t'), B.txt('N'))), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))), [fail('TypeError: pow requires numbers')]));
    powBody.push(iIf(NOT(iCmp('equals', I('operator_mod', { inputs: { NUM1: B.REP(B.VAR('ev'), [4, '0']), NUM2: B.num(1) } }), B.num(0))), [fail('ValueError: pow() needs an integer exponent')]));
    powBody.push(iSet('qpow', B.num(1)));
    const powLoop = I('control_repeat', { inputs: { TIMES: B.REP(I('operator_mathop', { fields: { OPERATOR: ['abs', null] }, inputs: { NUM: B.REP(B.VAR('ev'), [4, '0']) } }), [4, '0']) } });
    B.sub('Interpreter', powLoop, 'SUBSTACK', B.chain('Interpreter', [iSet('qpow', MUL(B.VAR('qpow'), A('a1v')))]));
    powBody.push(powLoop);
    powBody.push(iIfElse(iCmp('lt', B.VAR('ev'), B.num(0)), [
      iSet('ev', DIV(B.num(1), B.VAR('qpow')))
    ], [
      iSet('ev', B.VAR('qpow'))
    ]));
    powBody.push(iSet('evtype', B.txt('N')));
    powBody.push(iSet('pending', B.num(1)));
    body.push(iIf(iCmp('equals', A('fn'), B.txt('pow')), powBody));
    // round(x, n)
    const rBody = [];
    rBody.push(iIf(OR(NOT(iCmp('equals', A('a1t'), B.txt('N'))), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))), [fail('TypeError: round requires numbers')]));
    rBody.push(iSet('qpow', B.num(1)));
    const tenLoop = I('control_repeat', { inputs: { TIMES: B.REP(I('operator_mathop', { fields: { OPERATOR: ['abs', null] }, inputs: { NUM: B.REP(B.VAR('ev'), [4, '0']) } }), [4, '0']) } });
    B.sub('Interpreter', tenLoop, 'SUBSTACK', B.chain('Interpreter', [iSet('qpow', MUL(B.VAR('qpow'), B.num(10)))]));
    rBody.push(tenLoop);
    rBody.push(iIfElse(iCmp('lt', B.VAR('ev'), B.num(0)), [
      iSet('ev', MUL(I('operator_round', { inputs: { NUM: B.REP(DIV(A('a1v'), B.VAR('qpow')), [4, '0']) } }), B.VAR('qpow')))
    ], [
      iSet('ev', DIV(I('operator_round', { inputs: { NUM: B.REP(MUL(A('a1v'), B.VAR('qpow')), [4, '0']) } }), B.VAR('qpow')))
    ]));
    rBody.push(iSet('evtype', B.txt('N')));
    rBody.push(iSet('pending', B.num(1)));
    body.push(iIf(iCmp('equals', A('fn'), B.txt('round')), rBody));
    body.push(iIf(iCmp('equals', B.VAR('pending'), B.num(0)), [fail(JOIN(B.txt('NameError: function '), A('fn')))]));
    const first = B.chain('Interpreter', body);
    interp.blocks[p2b.defId].next = first; interp.blocks[first].parent = p2b.defId;
  }
  SHARED.builtin2 = p2;
  console.log('[patch4d.2] builtin2/builtin2b installed');
})();

// ============ PATCH 4d (part 3): dispatch multi-argument calls in eval ============
(function patchBuiltins3() {
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
  const interp = B.T['Interpreter'];
  const argLo = () => B.argReporter('Interpreter', 'lo');
  const argHi = () => B.argReporter('Interpreter', 'hi');

  const callIf = 'tJy:^jGB4+#6n' + BT + ',VS,[)';   // if_else( Tok[lo+1]="(" and Tok[hi]=")" ) { callfn } else { index }
  const oldSub = interp.blocks[callIf].inputs.SUBSTACK[1];
  const blocks = [];
  blocks.push(iSet('ed', B.num(0)));
  blocks.push(iSet('narg', B.num(0)));
  blocks.push(iSet('qcut', B.num(0)));
  blocks.push(iSet('argi', ADD(argLo(), B.num(2))));
  const scan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('argi'), SUB(argHi(), B.num(1)))) } });
  B.sub('Interpreter', scan, 'SUBSTACK', B.chain('Interpreter', [
    iSet('eop', tokAt(B.VAR('argi'))),
    iIf(OR(iCmp('equals', B.VAR('eop'), B.txt('(')), iCmp('equals', B.VAR('eop'), B.txt('['))), [iChg('ed', B.num(1))]),
    iIf(OR(iCmp('equals', B.VAR('eop'), B.txt(')')), iCmp('equals', B.VAR('eop'), B.txt(']'))), [iChg('ed', B.num(-1))]),
    iIf(AND(iCmp('equals', B.VAR('ed'), B.num(0)), iCmp('equals', B.VAR('eop'), B.txt(','))), [
      iChg('narg', B.num(1)),
      iIf(iCmp('equals', B.VAR('qcut'), B.num(0)), [iSet('qcut', B.VAR('argi'))])
    ]),
    iChg('argi', B.num(1))
  ]));
  blocks.push(scan);
  const fnIsMulti = OR(OR(iCmp('equals', tokAt(argLo()), B.txt('max')), iCmp('equals', tokAt(argLo()), B.txt('min'))),
                       OR(iCmp('equals', tokAt(argLo()), B.txt('pow')), iCmp('equals', tokAt(argLo()), B.txt('round'))));
  const multi = I('procedures_call', {
    inputs: (function () {
      const ids = SHARED.builtin2.argIds, vals = [tokAt(argLo()), ADD(argLo(), B.num(2)), B.VAR('qcut'), SUB(argHi(), B.num(1))];
      const o = {};
      for (let i = 0; i < ids.length; i++) o[ids[i]] = B.REP(vals[i], [4, '0']);
      return o;
    })(),
    mutation: { tagName: 'mutation', children: [], proccode: 'builtin2 %s %s %s %s', argumentids: JSON.stringify(SHARED.builtin2.argIds), warp: 'true' }
  });
  const callOne = callExisting('callfn %s %s %s', [tokAt(argLo()), ADD(argLo(), B.num(2)), SUB(argHi(), B.num(1))]);
  const bad = fail(JOIN(B.txt('TypeError: bad arguments for '), tokAt(argLo())));
  blocks.push(iIfElse(iCmp('equals', B.VAR('narg'), B.num(0)), [callOne], [
    iIfElse(AND(iCmp('equals', B.VAR('narg'), B.num(1)), fnIsMulti), [multi], [bad])
  ]));
  const first = B.chain('Interpreter', blocks);
  interp.blocks[callIf].inputs.SUBSTACK = [2, first];
  interp.blocks[first].parent = callIf;
  console.log('[patch4d.3] multi-argument dispatch installed');
})();


// ============ PATCH 4e: 'not in' operator ============
(function patchNotIn() {
  B.setCtx('Interpreter');
  const BT = String.fromCharCode(96);
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const tokAt = (idx) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(idx, [4, '0']) } });
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
  const interp = B.T['Interpreter'];

  // 1) eval scan: turn the two tokens  not in  into the single operator "notin"
  const rankCall = 'vgX13_r[(z##6L#' + BT + 'FxL!';
  const edIf = interp.blocks[rankCall].parent;
  // 'not in' becomes the single operator 'notin'; a bare 'in' directly after 'not' is skipped
  const noteIf = iIfElse(AND(iCmp('equals', B.VAR('eop'), B.txt('not')), iCmp('equals', tokAt(ADD(B.VAR('ek'), B.num(1))), B.txt('in'))), [
    iSet('eop', B.txt('notin'))
  ], [
    iIf(AND(iCmp('equals', B.VAR('eop'), B.txt('in')), iCmp('equals', tokAt(SUB(B.VAR('ek'), B.num(1))), B.txt('not'))), [iSet('eop', B.txt('skip'))])
  ]);
  interp.blocks[edIf].inputs.SUBSTACK = [2, noteIf];
  interp.blocks[noteIf].parent = edIf;
  interp.blocks[noteIf].next = rankCall;
  interp.blocks[rankCall].parent = noteIf;

  // 2) rank(): give "notin" the comparison rank
  const inRank = '776e11d0bf5247c4b356';
  const notinRank = iIf(iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('notin')), [iSet('erank', B.num(3))]);
  {
    const after = interp.blocks[inRank].next;
    interp.blocks[inRank].next = notinRank;
    interp.blocks[notinRank].parent = inRank;
    interp.blocks[notinRank].next = after;
    if (after) interp.blocks[after].parent = notinRank;
  }

  // 3) pair(): right hand side starts two tokens later for "notin"
  const shortIf = 'wP;5Ke:[h=2T6euJyNtY';
  const oldRight = interp.blocks[shortIf].inputs.SUBSTACK[1];
  const notinRight = callExisting('rightside %s %s %s %s %s', [
    B.VAR('ev'), B.VAR('evtype'), B.txt('notin'),
    ADD(B.argReporter('Interpreter', 'cut'), B.num(2)), B.argReporter('Interpreter', 'hi')
  ]);
  const rightIf = iIfElse(AND(iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('not')), iCmp('equals', tokAt(ADD(B.argReporter('Interpreter', 'cut'), B.num(1))), B.txt('in'))), [notinRight], [oldRight]);
  interp.blocks[oldRight].parent = rightIf;
  interp.blocks[shortIf].inputs.SUBSTACK = [2, rightIf];
  interp.blocks[rightIf].parent = shortIf;

  // 4) rightside(): accept "notin" and negate the result
  const inIf = 'a9934c62dae24942a1fa';
  const oldCond = interp.blocks[inIf].inputs.CONDITION[1];
  const errOperandId = interp.blocks[oldCond].inputs.OPERAND1[1];
  interp.blocks[inIf].inputs.CONDITION = [2, AND(errOperandId, OR(iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('in')), iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('notin'))))];
  {
    const inBody = interp.blocks[inIf].inputs.SUBSTACK[1];
    let last = inBody; while (interp.blocks[last].next) last = interp.blocks[last].next;
    const neg = iIf(iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('notin')), [
      iSet('ev', SUB(B.num(1), B.VAR('ev')))
    ]);
    interp.blocks[last].next = neg; interp.blocks[neg].parent = last;
  }
  console.log('[patch4e] not in operator installed');
})();


// ============ PATCH 5: help text + 4th demo ============
(function patchHelpDemo() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const iSet = (n, v) => C('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const ctrl = B.T['Controller'];
  const BT = String.fromCharCode(96);

  const helpText = [
    'QUICK HELP',
    'Click code then type directly',
    'Enter splits / BK deletes / TAB=4 sp',
    'Arrows: caret / hover a panel to scroll',
    'IMPORT: | means newline',
    'EXPORT: whole program on one line',
    'if/elif/else/while/for range or string',
    'break/continue/pass/assert/del name',
    'assign: = += -= *= /= %= / a,b = b,a',
    'print input len str int float bool',
    'abs round ord chr max min pow',
    's[i] s[a:b] / not in / and or not'
  ];
  const helpDef = findDef('Controller', 'help');
  {
    let id = ctrl.blocks[helpDef].next, n = 0;
    while (id) {
      const b = ctrl.blocks[id];
      if (b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'Output') {
        if (n < helpText.length) b.inputs.ITEM = B.txt(helpText[n]);
        n++;
      }
      id = b.next;
    }
    console.log('[patch5] help lines updated:', n);
  }

  // ---- demo 4 ----
  const exDef = findDef('Controller', 'example');
  {
    // find the "if demo = 3" block inside the example body
    let id = ctrl.blocks[exDef].next, demoIf3 = null, prev = null;
    while (id) {
      const b = ctrl.blocks[id];
      if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
        const cond = ctrl.blocks[b.inputs.CONDITION[1]];
        if (cond && cond.opcode === 'operator_equals' && cond.inputs.OPERAND2 && cond.inputs.OPERAND2[1] && cond.inputs.OPERAND2[1][1] === '3') demoIf3 = id;
      }
      id = b.next;
    }
    if (!demoIf3) throw new Error('demo 3 branch not found');
    const lines = [
      '# New: unpack, index, string loop',
      'a, b = 1, 2',
      'a, b = b, a',
      "word = 'Python'",
      'print(word[0] + word[-1])',
      'print(word[0:3])',
      'up = 0',
      'for ch in word:',
      '    if ch not in "aeiou":',
      '        up = up + 1',
      'print(up)',
      "print('max=' + str(max(a, b)))",
      "print('pow=' + str(pow(2, 8)))"
    ];
    const blocks = [];
    const cond4 = iCmp('equals', B.VAR('demo'), B.num(4));
    const if4 = C('control_if', { inputs: { CONDITION: B.BOOL(cond4) } });
    let listIds = [];
    for (const l of lines) listIds.push(C('data_addtolist', { fields: B.LISTF('Code'), inputs: { ITEM: B.txt(l) } }));
    B.sub('Controller', if4, 'SUBSTACK', B.chain('Controller', listIds));
    // insert right before "change demo by 1" (the block after the demo=3 if)
    const after3 = ctrl.blocks[demoIf3].next;
    ctrl.blocks[demoIf3].next = if4;
    ctrl.blocks[if4].parent = demoIf3;
    ctrl.blocks[if4].next = after3;
    if (after3) ctrl.blocks[after3].parent = if4;
    // wrap demo at 4
    let id2 = ctrl.blocks[exDef].next;
    while (id2) {
      const b = ctrl.blocks[id2];
      if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
        const cond = ctrl.blocks[b.inputs.CONDITION[1]];
        if (cond && cond.opcode === 'operator_gt' && cond.inputs.OPERAND2 && cond.inputs.OPERAND2[1] && cond.inputs.OPERAND2[1][1] === '3') {
          cond.inputs.OPERAND2 = [1, [4, '4']];
        }
      }
      id2 = b_next(id2);
    }
    function b_next(x) { return ctrl.blocks[x].next; }
    console.log('[patch5] demo 4 added');
  }
})();


// ============ cleanup: drop blocks orphaned by rewrites ============
function pruneUnreachable(project) {
  let removed = 0;
  for (const t of project.targets) {
    const blocks = t.blocks;
    const keep = new Set();
    const visit = (id) => {
      if (!id || keep.has(id) || !blocks[id]) return;
      keep.add(id);
      const b = blocks[id];
      if (b.next) visit(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) {
          if (typeof inp[1] === "string") visit(inp[1]);
          if (typeof inp[2] === "string") visit(inp[2]);
        }
      }
    };
    for (const [id, b] of Object.entries(blocks)) if (b.topLevel) visit(id);
    for (const id of Object.keys(blocks)) if (!keep.has(id)) { delete blocks[id]; removed++; }
    for (const b of Object.values(blocks)) {
      if (b.parent && !blocks[b.parent]) b.parent = null;
      if (b.next && !blocks[b.next]) b.next = null;
    }
  }
  return removed;
}
const pruned = pruneUnreachable(project);
console.log('[cleanup] removed', pruned, 'orphan blocks');

// ============ PATCH 6: remove the O- / O+ console page buttons ============
(function patchRemoveOButtons() {
  B.setCtx('Controller');
  const ctrl = B.T['Controller'];
  const crypto = require('crypto');

  // ---- 1) drop the two click handlers (second button row, slots 11 and 12) ----
  const rowIfElse = 'f7ce5332fe3040c891ea';      // if_else (uy > -138) { row 1 } else { row 2 }
  const elseFirst = ctrl.blocks[rowIfElse].inputs.SUBSTACK2[1];
  let prev = null, cur = elseFirst;
  const dropped = [];
  while (cur) {
    const b = ctrl.blocks[cur];
    const condId = b.inputs && b.inputs.CONDITION ? b.inputs.CONDITION[1] : null;
    const cond = condId ? ctrl.blocks[condId] : null;
    let isOButton = false;
    if (b.opcode === 'control_if' && cond && cond.opcode === 'operator_equals') {
      const o2 = cond.inputs.OPERAND2;
      const val = o2 && o2[1] && o2[1][1];
      if (val === '11' || val === '12') isOButton = true;
    }
    if (isOButton) {
      dropped.push(cur);
      if (prev) ctrl.blocks[prev].next = b.next;
      else ctrl.blocks[rowIfElse].inputs.SUBSTACK2 = b.next ? [2, b.next] : [2, null];
      if (b.next) ctrl.blocks[b.next].parent = prev || rowIfElse;
    } else {
      prev = cur;
    }
    cur = b.next;
  }
  console.log('[patch6] removed O-/O+ handlers:', dropped.length);

  // ---- 2) remove the two button graphics from the stage backdrop ----
  const stage = project.targets.find(t => t.isStage);
  const costume = stage.costumes[0];
  const oldName = costume.md5ext;
  const entry = entries.find(e => e.name === oldName);
  if (!entry) throw new Error('backdrop asset not found: ' + oldName);
  let svg = entry.data.toString('utf8');
  const before = svg.length;
  svg = svg.split('\n').filter(line => !(line.includes('>O-<') || line.includes('>O+<'))).join('\n');
  if (svg.length === before) console.log('[patch6] WARNING: O-/O+ graphics not found in the backdrop');
  const buf = Buffer.from(svg, 'utf8');
  const newHash = crypto.createHash('md5').update(buf).digest('hex');
  const newName = newHash + '.svg';
  costume.assetId = newHash;
  costume.md5ext = newName;
  const idx = entries.indexOf(entry);
  entries[idx] = { name: newName, data: buf };
  console.log('[patch6] backdrop rewritten:', oldName, '->', newName, '(' + before + ' -> ' + svg.length + ' bytes)');
  const pruned2 = pruneUnreachable(project);
  console.log('[patch6] pruned', pruned2, 'orphan blocks left by the removed handlers');
})();


// ============ PATCH 7: make the symbol palette dispatch robust ============
(function patchPaletteIndex() {
  B.setCtx('Controller');
  const ctrl = B.T['Controller'];
  const upalId = B.addVar('Controller', 'upal', 0);
  const rowIfElse = 'f7ce5332fe3040c891ea';      // if_else (uy > -138) { row 1 } else { row 2 }
  // 1) stash the palette index in its own variable right before the dispatch,
  //    because insert/newline/backspace reuse "ui" as a loop counter.
  let before = null;
  for (const [id, b] of Object.entries(ctrl.blocks)) {
    if (b.next === rowIfElse) { before = id; break; }
  }
  if (!before) throw new Error('palette dispatch predecessor not found');
  const stash = B.B('Controller', 'data_setvariableto', { fields: B.VARF('upal'), inputs: { VALUE: B.REP(B.VAR('ui'), [10, '']) } });
  const after = ctrl.blocks[rowIfElse].next;
  ctrl.blocks[before].next = stash;
  ctrl.blocks[stash].parent = before;
  ctrl.blocks[stash].next = rowIfElse;
  ctrl.blocks[rowIfElse].parent = stash;
  // 2) point every palette condition at the stash instead of at "ui"
  let patched = 0;
  for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
    let cur = ctrl.blocks[rowIfElse].inputs[slot] ? ctrl.blocks[rowIfElse].inputs[slot][1] : null;
    while (cur) {
      const b = ctrl.blocks[cur];
      const condId = b.inputs && b.inputs.CONDITION ? b.inputs.CONDITION[1] : null;
      const cond = condId ? ctrl.blocks[condId] : null;
      if (b.opcode === 'control_if' && cond && cond.opcode === 'operator_equals') {
        const o1 = cond.inputs.OPERAND1;
        if (o1 && o1[0] === 3 && Array.isArray(o1[1]) && o1[1][0] === 12 && o1[1][1] === 'ui') {
          cond.inputs.OPERAND1 = [3, [12, 'upal', upalId], [10, '']];
          patched++;
        }
      }
      cur = b.next;
    }
  }
  console.log('[patch7] palette conditions switched to the stash:', patched);
})();


// ============ PATCH 8a: help text that fits the 30-column console ============
(function patchHelp2() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const helpText = [
    'QUICK HELP',
    'Click a line, then type',
    'ENT=new line BK=del TAB=4sp',
    'Arrows: caret / pick a panel',
    'Hover a panel + UP/DOWN key',
    '  = scroll that panel 1 line',
    'Aa button = A/a case switch',
    'IMPORT: | between lines',
    'EXPORT: whole program, 1 line',
    'if/elif/else/while/for range',
    "for c in 'text': break cont",
    'a,b = b,a   s[i]   s[a:b]',
    '= += -= *= /= %=   not in',
    'print input len str int float',
    'abs round ord chr max min pow',
    'a=[1,2] a[0] len(a) sum(a)',
    'a.append(x) a.pop() a.clear()',
    'for x in a:  print(x * 2)',
    'DEMO button: 9 samples'
  ];
  const helpDef = findDef('Controller', 'help');
  const adds = [];
  let id = ctrl.blocks[helpDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'Output') adds.push(id);
    id = b.next;
  }
  for (let i = 0; i < adds.length && i < helpText.length; i++) {
    ctrl.blocks[adds[i]].inputs.ITEM = B.txt(helpText[i]);
  }
  const extra = helpText.slice(adds.length);
  if (extra.length) {
    const newIds = extra.map(t => C('data_addtolist', { fields: B.LISTF('Output'), inputs: { ITEM: B.txt(t) } }));
    B.chain('Controller', newIds);
    const anchor = adds[adds.length - 1];
    const after = ctrl.blocks[anchor].next;
    ctrl.blocks[anchor].next = newIds[0];
    ctrl.blocks[newIds[0]].parent = anchor;
    ctrl.blocks[newIds[newIds.length - 1]].next = after;
    if (after) ctrl.blocks[after].parent = newIds[newIds.length - 1];
  }
  const tooLong = helpText.filter(t => t.length > 30);
  console.log('[patch8a] help lines:', helpText.length, 'over 30 chars:', tooLong.length);
})();


// ============ PATCH 8b: A/a case switch button + letter keys honour it ============
(function patchCaps() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const crypto = require('crypto');
  const cmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const JOIN = (a, b) => C('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const setV = (n, v) => C('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });

  B.addVar('Controller', 'caps', 0);

  // ---- palette slot 2/11 becomes the A/a switch ----
  const rowIfElse = 'f7ce5332fe3040c891ea';
  const elseFirst = ctrl.blocks[rowIfElse].inputs.SUBSTACK2[1];
  let last = elseFirst;
  while (ctrl.blocks[last].next) last = ctrl.blocks[last].next;
  const cond = cmp('equals', B.VAR('upal'), B.txt('11'));
  const onIf = C('control_if_else', { inputs: { CONDITION: B.BOOL(cmp('equals', B.VAR('caps'), B.num(1))) } });
  B.sub('Controller', onIf, 'SUBSTACK', B.chain('Controller', [setV('status', B.txt('Case UPPER on  (Aa lit)'))]));
  B.sub('Controller', onIf, 'SUBSTACK2', B.chain('Controller', [setV('status', B.txt('Case lower on  (Aa off)'))]));
  const capsIf = C('control_if', { inputs: { CONDITION: B.BOOL(cond) } });
  B.sub('Controller', capsIf, 'SUBSTACK', B.chain('Controller', [
    setV('caps', C('operator_subtract', { inputs: { NUM1: B.num(1), NUM2: B.REP(B.VAR('caps'), [4, '0']) } })),
    onIf,
    setV('dirty', B.txt('1'))
  ]));
  ctrl.blocks[last].next = capsIf;
  ctrl.blocks[capsIf].parent = last;

  // ---- letter keys insert the upper case letter when the switch is on ----
  const insDef = findDef('Controller', 'insert %s');
  const insProto = ctrl.blocks[ctrl.blocks[insDef].inputs.custom_block[1]];
  const insArgs = JSON.parse(insProto.mutation.argumentids);
  const insertCall = (ch) => C('procedures_call', {
    inputs: (function () { const o = {}; o[insArgs[0]] = B.txt(ch); return o; })(),
    mutation: { tagName: 'mutation', children: [], proccode: 'insert %s', argumentids: insProto.mutation.argumentids, warp: 'true' }
  });
  let switched = 0;
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
    let hatId = null;
    for (const [id, b] of Object.entries(ctrl.blocks)) {
      if (b.topLevel && b.opcode === 'event_whenkeypressed' && b.fields.KEY_OPTION && b.fields.KEY_OPTION[0] === letter) hatId = id;
    }
    if (!hatId) continue;
    const lowerCall = ctrl.blocks[hatId].next;
    const branch = C('control_if_else', { inputs: { CONDITION: B.BOOL(cmp('equals', B.VAR('caps'), B.num(1))) } });
    B.sub('Controller', branch, 'SUBSTACK', B.chain('Controller', [insertCall(letter.toUpperCase())]));
    B.sub('Controller', branch, 'SUBSTACK2', B.chain('Controller', [lowerCall]));
    if (lowerCall) ctrl.blocks[lowerCall].parent = branch;
    ctrl.blocks[hatId].next = branch;
    ctrl.blocks[branch].parent = hatId;
    switched++;
  }
  console.log('[patch8b] letter keys with case switch:', switched);

  // ---- draw the Aa button in the freed palette slot ----
  const stage = project.targets.find(t => t.isStage);
  const costume = stage.costumes[0];
  const entry = entries.find(e => e.name === costume.md5ext);
  let svg = entry.data.toString('utf8');
  const bt = '<rect x="440.50" y="318" width="13.25" height="15" fill="#fcfcfc" stroke="#d6d6d6" stroke-width="0.6"/><text x="447.12" y="328.3">Aa</text>';
  if (!svg.includes('>Aa<')) {
    svg = svg.replace('</g>\n</svg>', bt + '\n</g>\n</svg>');
  }
  const buf = Buffer.from(svg, 'utf8');
  const newHash = crypto.createHash('md5').update(buf).digest('hex');
  const oldName = costume.md5ext;
  costume.assetId = newHash;
  costume.md5ext = newHash + '.svg';
  entries[entries.indexOf(entry)] = { name: costume.md5ext, data: buf };
  console.log('[patch8b] backdrop:', oldName, '->', costume.md5ext, '| Aa drawn:', svg.includes('>Aa<'));
})();


// ============ PATCH 8c: four more demos (total 8) ============
(function patchMoreDemos() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const cmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const setV = (n, v) => C('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const demos = {
    5: [
      '# Case and characters',
      "word = 'MiniPy'",
      'print(word[0:4])',
      'print(word[-2:])',
      'big = 0',
      'for ch in word:',
      "    if ch not in 'abcdefghijklmnopqrstuvwxyz':",
      '        big = big + 1',
      'print(big)',
      "print(chr(ord('a') - 32) + chr(ord('z') - 32))"
    ],
    6: [
      '# Input and maths',
      "n = int(input('Number?'))",
      'total = 0',
      'for i in range(1, n + 1):',
      '    total = total + i',
      "print('sum=' + str(total))",
      "print('max=' + str(max(n, total)))",
      "print('pow=' + str(pow(n, 3)))"
    ],
    7: [
      '# Search and slice',
      "text = 'hello world'",
      'pos = 0',
      'for i in range(1, len(text) + 1):',
      "    if text[i - 1] == ' ' :",
      '        pos = i',
      'print(pos)',
      'print(text[:pos - 1])',
      'print(text[pos:])'
    ],
    8: [
      '# Mixed practice',
      'a, b = 3, 4',
      'print(pow(a, 2) + pow(b, 2))',
      "s = 'abcdef'",
      'i = len(s)',
      "out = ''",
      'while i > 0:',
      '    out = out + s[i - 1]',
      '    i = i - 1',
      'print(out)',
      "print('bye')"
    ]
  };
  const exDef = findDef('Controller', 'example');
  // find the "if demo = 4" branch added earlier
  let demo4 = null;
  let id = ctrl.blocks[exDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
      const c = ctrl.blocks[b.inputs.CONDITION[1]];
      if (c && c.opcode === 'operator_equals' && c.inputs.OPERAND2 && c.inputs.OPERAND2[1] && c.inputs.OPERAND2[1][1] === '4') demo4 = id;
    }
    id = b.next;
  }
  if (!demo4) throw new Error('demo 4 branch not found');
  // build 5..8 in order, inserting them right after the demo 4 branch
  const chainTop = [];
  for (const n of [5, 6, 7, 8]) {
    const ifN = C('control_if', { inputs: { CONDITION: B.BOOL(cmp('equals', B.VAR('demo'), B.num(n))) } });
    const adds = demos[n].map(l => C('data_addtolist', { fields: B.LISTF('Code'), inputs: { ITEM: B.txt(l) } }));
    B.sub('Controller', ifN, 'SUBSTACK', B.chain('Controller', adds));
    chainTop.push(ifN);
  }
  B.chain('Controller', chainTop);
  const after4 = ctrl.blocks[demo4].next;
  ctrl.blocks[demo4].next = chainTop[0];
  ctrl.blocks[chainTop[0]].parent = demo4;
  ctrl.blocks[chainTop[chainTop.length - 1]].next = after4;
  if (after4) ctrl.blocks[after4].parent = chainTop[chainTop.length - 1];
  // wrap at 8 instead of 4
  id = ctrl.blocks[exDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
      const c = ctrl.blocks[b.inputs.CONDITION[1]];
      if (c && c.opcode === 'operator_gt' && c.inputs.OPERAND2 && c.inputs.OPERAND2[1] && c.inputs.OPERAND2[1][1] === '4') {
        c.inputs.OPERAND2 = [1, [4, '8']];
      }
    }
    id = b.next;
  }
  // status shows which demo was loaded: replace the "Example loaded" text
  id = ctrl.blocks[exDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'status') {
      const v = b.inputs.VALUE;
      if (v && v[1] && v[1][0] === 10 && v[1][1] === 'Example loaded') {
        b.inputs.VALUE = B.REP(C('operator_join', { inputs: { STRING1: B.txt('Demo '), STRING2: B.REP(C('operator_subtract', { inputs: { NUM1: B.REP(B.VAR('demo'), [4, '0']), NUM2: B.num(1) } }), [4, '0']) } }), [10, '']);
      }
    }
    id = b.next;
  }
  console.log('[patch8c] demos 5-8 added');
})();


// ============ PATCH 9: make "in" / "not in" case sensitive (Python semantics) ============
(function patchCaseSensitiveIn() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
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
  const interp = B.T['Interpreter'];
  B.addVar('Interpreter', 'si', 0);
  const argOp = () => B.argReporter('Interpreter', 'op');
  const argLeft = () => B.argReporter('Interpreter', 'leftval');
  const argLeftType = () => B.argReporter('Interpreter', 'lefttype');

  // haystack is in ev; scan every position and compare case sensitively with compareText
  const scan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(OR(iCmp('gt', B.VAR('si'), ADD(SUB(LEN(B.VAR('tmp')), LEN(argLeft())), B.num(1))), iCmp('equals', B.VAR('found'), B.num(1)))) } });
  B.sub('Interpreter', scan, 'SUBSTACK', B.chain('Interpreter', [
    callExisting('substr %s %s %s', [B.VAR('tmp'), B.VAR('si'), ADD(B.VAR('si'), SUB(LEN(argLeft()), B.num(1)))]),
    callExisting('compareText %s %s', [B.VAR('ev'), argLeft()]),
    iIf(iCmp('equals', B.VAR('cmp'), B.num(0)), [iSet('found', B.num(1))]),
    iChg('si', B.num(1))
  ]));
  const inBody = [
    iSet('tmp', B.VAR('ev')),
    iSet('found', B.num(0)),
    iSet('si', B.num(1)),
    scan,
    iSet('ev', B.VAR('found')),
    iSet('evtype', B.txt('N')),
    iIf(iCmp('equals', argOp(), B.txt('notin')), [iSet('ev', SUB(B.num(1), B.VAR('ev')))])
  ];
  const inIf = 'a9934c62dae24942a1fa';           // if (error = "" and (op = "in" or op = "notin"))
  const branch = iIfElse(AND(iCmp('equals', argLeftType(), B.txt('S')), iCmp('equals', B.VAR('evtype'), B.txt('S'))), inBody, [
    callExisting('fail %s', [B.txt('TypeError: in requires strings')])
  ]);
  const old = interp.blocks[inIf].inputs.SUBSTACK[1];
  interp.blocks[inIf].inputs.SUBSTACK = [2, branch];
  interp.blocks[branch].parent = inIf;
  void old;
  const pruned = pruneUnreachable(project);
  console.log('[patch9] case sensitive in/not in installed, pruned', pruned, 'blocks');
})();











// ============ PATCH 10a: interpreter speed, safety limits and console follow ============
(function patchInterpPerf() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);

  function findInProc(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const ABS = (a) => I('operator_mathop', { fields: { OPERATOR: ['abs', null] }, inputs: { NUM: B.REP(a, [4, '0']) } });
  const iIf = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', ids)); return id; };
  function callExisting(proccode, args) {
    const t = B.T['Interpreter'];
    const defId = findDef('Interpreter', proccode);
    const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
    return I('procedures_call', { inputs, mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: proto.mutation.argumentids, warp: 'true' } });
  }
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const interp = B.T['Interpreter'];
  B.addVar('Interpreter', 'otgt', 0);

  // ---- P0-2: cheap pre-filter before the expensive compareText in lookup ----
  {
    const lookupDef = findDef('Interpreter', 'lookup %s');
    const cmpCall = findInProc('Interpreter', lookupDef, b => b.opcode === 'procedures_call' && b.mutation.proccode === 'compareText %s %s');
    if (!cmpCall) throw new Error('compareText call in lookup not found');
    const after = interp.blocks[cmpCall].next;          // the "if not (cmp = 0) -> found++" block
    const parentId = interp.blocks[cmpCall].parent;
    const argVn = () => B.argReporter('Interpreter', 'vn');
    const itemFound = () => I('data_itemoflist', { fields: B.LISTF('Names'), inputs: { INDEX: B.VAR('found') } });
    const pre = I('control_if_else', { inputs: { CONDITION: B.BOOL(AND(iCmp('equals', LEN(itemFound()), LEN(argVn())), iCmp('equals', itemFound(), argVn()))) } });
    B.sub('Interpreter', pre, 'SUBSTACK', B.chain('Interpreter', [cmpCall]));
    B.sub('Interpreter', pre, 'SUBSTACK2', B.chain('Interpreter', [iSet('cmp', B.num(1))]));
    interp.blocks[cmpCall].parent = pre;
    // splice "pre" exactly where the compareText call used to be, keeping the rest of the loop body
    let spliced = false;
    if (parentId && interp.blocks[parentId].next === cmpCall) { interp.blocks[parentId].next = pre; spliced = true; }
    if (parentId) {
      for (const [slot, inp] of Object.entries(interp.blocks[parentId].inputs || {})) {
        if (Array.isArray(inp) && inp[1] === cmpCall) { interp.blocks[parentId].inputs[slot] = [2, pre]; spliced = true; }
      }
    }
    if (!spliced) throw new Error('could not splice the lookup pre-filter');
    interp.blocks[pre].parent = parentId;
    interp.blocks[pre].next = after;
    if (after) interp.blocks[after].parent = pre;
    console.log('[patch10a] lookup pre-filter installed (loop body kept)');
  }

  // ---- P0-4: bound the loop counts of pow() and round(x, n) ----
  function insertBeforeBlock(targetId, newId) {
    const t = interp;
    const blk = t.blocks[targetId];
    const pid = blk.parent;
    const p = pid ? t.blocks[pid] : null;
    if (p && p.next === targetId) {
      p.next = newId; t.blocks[newId].parent = pid; t.blocks[newId].next = targetId; blk.parent = newId; return true;
    }
    if (p) {
      for (const [slot, inp] of Object.entries(p.inputs || {})) {
        if (Array.isArray(inp) && inp[1] === targetId) {
          p.inputs[slot] = [2, newId]; t.blocks[newId].parent = pid; t.blocks[newId].next = targetId; blk.parent = newId; return true;
        }
      }
    }
    return false;
  }
  {
    const p2bDef = findDef('Interpreter', 'builtin2b %s %s %s %s %s');
    const loops = [];
    for (const [id, b] of Object.entries(interp.blocks)) {
      if (b.opcode !== 'control_repeat') continue;
      const timesId = b.inputs.TIMES && b.inputs.TIMES[1];
      const inner = timesId ? interp.blocks[timesId] : null;
      if (!inner || inner.opcode !== 'operator_mathop') continue;
      let p = b.parent, hops = 0, inP2b = false;
      while (p && hops++ < 200) { if (p === p2bDef) { inP2b = true; break; } p = interp.blocks[p] ? interp.blocks[p].parent : null; }
      if (inP2b) loops.push(id);
    }
    const guardPow = iIf(iCmp('gt', ABS(B.VAR('ev')), B.num(1024)), [fail('ValueError: pow() exponent too large')]);
    const guardRound = iIf(iCmp('gt', ABS(B.VAR('ev')), B.num(15)), [fail('ValueError: round() ndigits out of range')]);
    const okPow = loops[0] ? insertBeforeBlock(loops[0], guardPow) : false;
    const okRound = loops[1] ? insertBeforeBlock(loops[1], guardRound) : false;
    console.log('[patch10a] pow guard:', okPow, '| round guard:', okRound, '| loops found:', loops.length);
  }

  // ---- P2-3: wider expression-depth budget (24 broke sums of 25+ terms) ----
  {
    const evalDef = findDef('Interpreter', 'eval %s %s');
    const check = findInProc('Interpreter', evalDef, b => {
      if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.CONDITION[1]) return false;
      const c = interp.blocks[b.inputs.CONDITION[1]];
      return c && c.opcode === 'operator_gt' && c.inputs.OPERAND2 && c.inputs.OPERAND2[1] && c.inputs.OPERAND2[1][1] === '24';
    });
    if (check) {
      interp.blocks[interp.blocks[check].inputs.CONDITION[1]].inputs.OPERAND2 = [1, [4, '64']];
      console.log('[patch10a] expression depth limit 24 -> 64');
    }
  }

  // ---- P2-4: the console only auto-follows while the user is at the bottom ----
  {
    const logDef = findDef('Interpreter', 'log %s');
    const setter = findInProc('Interpreter', logDef, b => {
      if (b.opcode !== 'data_setvariableto' || !b.fields.VARIABLE || b.fields.VARIABLE[0] !== 'outpage') return false;
      const v = b.inputs.VALUE;
      return v && v[1] && interp.blocks[v[1]] && interp.blocks[v[1]].opcode === 'operator_subtract';
    });
    if (!setter) throw new Error('log outpage setter not found');
    const target = interp.blocks[setter].inputs.VALUE[1];
    const tail = interp.blocks[setter].next;
    const parent = interp.blocks[setter].parent;
    const newChain = [
      iSet('otgt', target),
      iIf(iCmp('lt', B.VAR('otgt'), B.num(1)), [iSet('otgt', B.num(1))]),
      iIf(iCmp('gt', B.VAR('outpage'), SUB(B.VAR('otgt'), B.num(3))), [iSet('outpage', B.VAR('otgt'))])
    ];
    const head = B.chain('Interpreter', newChain);
    interp.blocks[parent].next = head;
    interp.blocks[head].parent = parent;
    interp.blocks[newChain[newChain.length - 1]].next = tail;
    if (tail) interp.blocks[tail].parent = newChain[newChain.length - 1];
    console.log('[patch10a] console follow lock installed');
  }
})();

// ============ PATCH 10b: fast/slow run mode in the RUN loop ============
(function patchRunSpeed() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  function findInProc(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const interp = B.T['Interpreter'];
  B.setCtx('Stage');
  B.addVar('Stage', 'speed', 1);   // 1 = fast, 0 = one line per frame
  B.setCtx('Interpreter');
  const speedVar = () => B.VAR('speed');
  const runHat = Object.entries(interp.blocks).find(([id, b]) =>
    b.topLevel && b.opcode === 'event_whenbroadcastreceived' && b.fields.BROADCAST_OPTION[0] === 'RUN')[0];

  // ---- step limit scales with the run mode ----
  {
    const limIf = findInProc('Interpreter', runHat, b => {
      if (b.opcode !== 'control_if_else' || !b.inputs.CONDITION || !b.inputs.CONDITION[1]) return false;
      const c = interp.blocks[b.inputs.CONDITION[1]];
      return c && c.opcode === 'operator_gt' && c.inputs.OPERAND1 && c.inputs.OPERAND1[1] && c.inputs.OPERAND1[1][0] === 12 && c.inputs.OPERAND1[1][1] === 'steps';
    });
    if (!limIf) throw new Error('step limit check not found');
    interp.blocks[interp.blocks[limIf].inputs.CONDITION[1]].inputs.OPERAND2 = [3, ADD(B.num(10000), MUL(speedVar(), B.num(90000))), [4, '0']];
    // friendlier message
    const failCall = findInProc('Interpreter', runHat, b => {
      if (b.opcode !== 'procedures_call' || b.mutation.proccode !== 'fail %s') return false;
      const v = Object.values(b.inputs)[0];
      return v && v[1] && v[1][0] === 10 && String(v[1][1]).indexOf('LimitError: 10000') === 0;
    });
    if (failCall) interp.blocks[failCall].inputs[Object.keys(interp.blocks[failCall].inputs)[0]] = B.txt('LimitError: step limit reached');
    console.log('[patch10b] step limit 10k slow / 100k fast');
  }

  // ---- yield (and repaint) every 50 lines while running fast ----
  {
    // the run loop tail is: set dirty to 1 ; wait 0 - pick the dirty setter whose next is that wait
    let dirtySetter = null, waitBlock = null;
    for (const [id, b] of Object.entries(interp.blocks)) {
      if (b.opcode !== 'data_setvariableto' || !b.fields.VARIABLE || b.fields.VARIABLE[0] !== 'dirty') continue;
      const nx = b.next ? interp.blocks[b.next] : null;
      if (nx && nx.opcode === 'control_wait') { dirtySetter = id; waitBlock = b.next; }
    }
    if (!dirtySetter) throw new Error('run-loop dirty setter not found');
    if (!waitBlock) throw new Error('run-loop wait not found');
    const parent = interp.blocks[dirtySetter].parent;
    const speedCond = OR(iCmp('equals', speedVar(), B.num(0)),
                         iCmp('equals', I('operator_mod', { inputs: { NUM1: B.REP(B.VAR('steps'), [4, '0']), NUM2: B.num(50) } }), B.num(0)));
    const guard = I('control_if', { inputs: { CONDITION: B.BOOL(speedCond) } });
    B.sub('Interpreter', guard, 'SUBSTACK', B.chain('Interpreter', [dirtySetter, waitBlock]));
    interp.blocks[dirtySetter].parent = guard;
    interp.blocks[waitBlock].parent = dirtySetter;
    // re-attach the guard in place of the old setter inside its parent chain
    if (parent) {
      if (interp.blocks[parent].next === dirtySetter) interp.blocks[parent].next = guard;
      for (const [bid, b] of Object.entries(interp.blocks)) {
        for (const [slot, inp] of Object.entries(b.inputs || {})) {
          if (Array.isArray(inp) && inp[1] === dirtySetter && bid !== guard) b.inputs[slot] = [2, guard];
        }
      }
      interp.blocks[guard].parent = parent;
    }
    console.log('[patch10b] run loop now yields every 50 lines in fast mode');
  }
})();

// ============ PATCH 10c: speed button, line editor entry, help ============
(function patchUiExtras() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const crypto = require('crypto');
  const cmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => C('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => C('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => C('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const setV = (n, v) => C('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [10, '']) } });
  const ifB = (c, ids) => { const id = C('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Controller', id, 'SUBSTACK', B.chain('Controller', ids)); return id; };
  const ifElse = (c, a, b) => { const id = C('control_if_else', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Controller', id, 'SUBSTACK', B.chain('Controller', a)); B.sub('Controller', id, 'SUBSTACK2', B.chain('Controller', b)); return id; };

  // ---- stage: the speed flag (1 = fast) ----
  const stage = project.targets.find(t => t.isStage);
  B.setCtx('Stage');
  const speedId = B.addVar('Stage', 'speed', 1);
  B.setCtx('Controller');
  {
    // set it on green flag next to the other initial values
    const flagHat = Object.entries(stage.blocks).find(([id, b]) => b.topLevel && b.opcode === 'event_whenflagclicked')[0];
    let id = stage.blocks[flagHat].next, anchor = null;
    while (id) {
      const b = stage.blocks[id];
      if (b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'stopreq') anchor = id;
      id = b.next;
    }
    const setter = B.B('Stage', 'data_setvariableto', { fields: { VARIABLE: ['speed', speedId] }, inputs: { VALUE: B.txt('1') } });
    const after = stage.blocks[anchor].next;
    stage.blocks[anchor].next = setter;
    stage.blocks[setter].parent = anchor;
    stage.blocks[setter].next = after;
    if (after) stage.blocks[after].parent = setter;
  }

  // ---- palette slot 12 = speed toggle ----
  const rowIfElse = 'f7ce5332fe3040c891ea';
  const elseFirst = ctrl.blocks[rowIfElse].inputs.SUBSTACK2[1];
  let last = elseFirst;
  while (ctrl.blocks[last].next) last = ctrl.blocks[last].next;
  const cond = cmp('equals', B.VAR('upal'), B.txt('12'));
  const onIf = ifElse(cmp('equals', B.VAR('speed'), B.num(1)),
    [setV('status', B.txt('Speed FAST  (>> lit)'))],
    [setV('status', B.txt('Speed SLOW  (1 line/frame)'))]);
  const speedIf = ifB(cond, [
    setV('speed', C('operator_subtract', { inputs: { NUM1: B.num(1), NUM2: B.REP(B.VAR('speed'), [4, '0']) } })),
    onIf,
    setV('dirty', B.txt('1'))
  ]);
  ctrl.blocks[last].next = speedIf;
  ctrl.blocks[speedIf].parent = last;

  // ---- double click the line-number gutter to edit that line through the ask box ----
  B.addVar('Controller', 'lastclick', -99);
  const editDef = findDef('Controller', 'editLine');
  const timer = () => C('sensing_timer');
  const inGutter = AND(AND(cmp('gt', B.VAR('uy'), B.num(-118)), cmp('lt', B.VAR('uy'), B.num(118))),
                       AND(cmp('gt', B.VAR('ux'), B.num(-230)), cmp('lt', B.VAR('ux'), B.num(-206))));
  const dbl = cmp('lt', C('operator_subtract', { inputs: { NUM1: B.REP(timer(), [4, '0']), NUM2: B.REP(B.VAR('lastclick'), [4, '0']) } }), B.num(0.5));
  const gutterIf = ifB(inGutter, [
    ifElse(dbl, [
      setV('lastclick', B.num(-99)),
      C('procedures_call', { inputs: {}, mutation: { tagName: 'mutation', children: [], proccode: 'editLine', argumentids: '[]', warp: 'false' } })
    ], [
      setV('lastclick', timer())
    ])
  ]);
  // find the "if (busy = 0 and running = 0)" guard inside the click procedure
  function refsVar(blockId, varName, depth) {
    if (!blockId || depth > 8) return false;
    const b = ctrl.blocks[blockId];
    if (!b) return false;
    for (const inp of Object.values(b.inputs || {})) {
      if (!Array.isArray(inp)) continue;
      if (Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === varName) return true;
      if (typeof inp[1] === 'string' && refsVar(inp[1], varName, depth + 1)) return true;
    }
    return false;
  }
  const clickDef = findDef('Controller', 'click');
  function findInProc(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b, id)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  // the editor guard is the FIRST busy-guarded if in the click body chain (the palette
  // dispatch comes later and is guarded by a longer condition)
  let guardId = null;
  {
    let id = ctrl.blocks[clickDef].next;
    while (id && !guardId) {
      const b = ctrl.blocks[id];
      if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] && refsVar(b.inputs.CONDITION[1], 'busy', 0)) guardId = id;
      id = b.next;
    }
  }
  if (!guardId) throw new Error('busy guard inside click not found');
  let gLast = ctrl.blocks[guardId].inputs.SUBSTACK[1];
  while (gLast && ctrl.blocks[gLast].next) gLast = ctrl.blocks[gLast].next;
  if (!gLast) throw new Error('busy guard body empty');
  ctrl.blocks[gLast].next = gutterIf;
  ctrl.blocks[gutterIf].parent = gLast;
  console.log('[patch10c] speed button + gutter double-click editor hooked');

  // ---- one more help line ----
  const helpDef = findDef('Controller', 'help');
  let h = ctrl.blocks[helpDef].next, lastAdd = null;
  while (h) {
    const b = ctrl.blocks[h];
    if (b.opcode === 'data_addtolist' && b.fields.LIST && b.fields.LIST[0] === 'Output') lastAdd = h;
    h = b.next;
  }
  const extra1 = C('data_addtolist', { fields: B.LISTF('Output'), inputs: { ITEM: B.txt('Double-click line no.: edit') } });
  const extra2 = C('data_addtolist', { fields: B.LISTF('Output'), inputs: { ITEM: B.txt('>> button = fast / slow run') } });
  const extra3 = C('data_addtolist', { fields: B.LISTF('Output'), inputs: { ITEM: B.txt('IMPORT keep | as \\| in code') } });
  B.chain('Controller', [extra1, extra2, extra3]);
  const afterHelp = ctrl.blocks[lastAdd].next;
  ctrl.blocks[lastAdd].next = extra1;
  ctrl.blocks[extra1].parent = lastAdd;
  ctrl.blocks[extra3].next = afterHelp;
  if (afterHelp) ctrl.blocks[afterHelp].parent = extra3;

  // ---- draw the >> button ----
  const costume = stage.costumes[0];
  const entry = entries.find(e => e.name === costume.md5ext);
  let svg = entry.data.toString('utf8');
  const bt = '<rect x="453.75" y="318" width="13.25" height="15" fill="#fcfcfc" stroke="#d6d6d6" stroke-width="0.6"/><text x="460.38" y="328.3">&gt;&gt;</text>';
  if (!svg.includes('&gt;&gt;')) svg = svg.replace('</g>\n</svg>', bt + '\n</g>\n</svg>');
  const buf = Buffer.from(svg, 'utf8');
  const newHash = crypto.createHash('md5').update(buf).digest('hex');
  costume.assetId = newHash;
  costume.md5ext = newHash + '.svg';
  entries[entries.indexOf(entry)] = { name: costume.md5ext, data: buf };
  console.log('[patch10c] >> button drawn:', svg.includes('&gt;&gt;'));
})();

// ============ PATCH 10d: cleanup, IMPORT escape, meta ============
(function patchCleanup() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const interp = B.T['Interpreter'];
  const stage = project.targets.find(t => t.isStage);

  // ---- P1-2a: drop the constant-false guard left over from v3 ----
  {
    let removed = 0;
    for (const t of project.targets) {
      for (const [id, b] of Object.entries(t.blocks)) {
        if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.CONDITION[1]) continue;
        const cond = t.blocks[b.inputs.CONDITION[1]];
        if (cond && cond.opcode === 'operator_equals' && cond.inputs.OPERAND1 && cond.inputs.OPERAND2) {
          const a = cond.inputs.OPERAND1[1], c = cond.inputs.OPERAND2[1];
          if (a && c && a[0] === 4 && c[0] === 4 && a[1] === '1' && c[1] === '0') {
            const prev = t.blocks[b.parent];
            if (prev && prev.next === id) { prev.next = b.next; if (b.next) t.blocks[b.next].parent = b.parent; }
            else if (b.parent === null) { /* top level: leave it */ }
            else if (prev && prev.inputs && prev.inputs.SUBSTACK && prev.inputs.SUBSTACK[1] === id) { prev.inputs.SUBSTACK = b.next ? [2, b.next] : [2, null]; if (b.next) t.blocks[b.next].parent = prev; }
            removed++;
          }
        }
      }
    }
    console.log('[patch10d] constant-false guards removed:', removed);
  }

  // ---- P1-2b: delete variables that nothing references ----
  {
    const ids = new Set();
    for (const t of project.targets) {
      for (const b of Object.values(t.blocks)) {
        for (const f of ['VARIABLE', 'LIST']) {
          if (b.fields && b.fields[f] && typeof b.fields[f][1] === 'string') ids.add(b.fields[f][1]);
        }
        for (const inp of Object.values(b.inputs || {})) {
          if (Array.isArray(inp) && Array.isArray(inp[1]) && (inp[1][0] === 12 || inp[1][0] === 13)) ids.add(inp[1][2]);
        }
      }
    }
    let dropped = 0;
    for (const t of project.targets) {
      for (const [id, v] of Object.entries(t.variables || {})) if (!ids.has(id)) { delete t.variables[id]; dropped++; }
    }
    console.log('[patch10d] unused variable declarations removed:', dropped);
  }

  // ---- P1-3: IMPORT understands a backslash-escaped pipe ----
  {
    const loadDef = findDef('Controller', 'loadCode %s');
    // inside: if uc = "|" { add ut to Code ; ut = "" } else { ut = join(ut, uc) }
    let splitIf = null;
    {
      const seen = new Set();
      const stack = [ctrl.blocks[loadDef].next];
      while (stack.length) {
        const id = stack.pop();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const b = ctrl.blocks[id];
        if (!b) continue;
        if (b.opcode === 'control_if_else' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
          const cond = ctrl.blocks[b.inputs.CONDITION[1]];
          if (cond && cond.opcode === 'operator_equals' && cond.inputs.OPERAND2 && cond.inputs.OPERAND2[1] && cond.inputs.OPERAND2[1][1] === '|') splitIf = id;
        }
        if (b.next) stack.push(b.next);
        for (const inp of Object.values(b.inputs || {})) {
          if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
        }
      }
    }
    if (!splitIf) throw new Error('loadCode split branch not found');
    const elseFirst = ctrl.blocks[splitIf].inputs.SUBSTACK2[1];
    const backslash = String.fromCharCode(92);
    const escIf = (function () {
      const c = C('operator_equals', { inputs: { OPERAND1: B.REP(B.VAR('uc'), [10, '']), OPERAND2: B.txt(backslash) } });
      const inner = C('control_if_else', { inputs: { CONDITION: B.BOOL(c) } });
      const take = [
        C('data_changevariableby', { fields: B.VARF('ui'), inputs: { VALUE: B.num(1) } }),
        (function () {
          const add = C('data_setvariableto', { fields: B.VARF('ut'), inputs: { VALUE: B.REP(C('operator_join', { inputs: { STRING1: B.REP(B.VAR('ut'), [10, '']), STRING2: B.REP(C('operator_letter_of', { inputs: { LETTER: B.REP(B.VAR('ui'), [4, '0']), STRING: B.REP(B.argReporter('Controller', 'source'), [10, '']) } }), [10, '']) } }), [10, '']) } });
          return add;
        })()
      ];
      B.sub('Controller', inner, 'SUBSTACK', B.chain('Controller', take));
      B.sub('Controller', inner, 'SUBSTACK2', B.chain('Controller', [elseFirst]));
      if (elseFirst) ctrl.blocks[elseFirst].parent = inner;
      return inner;
    })();
    ctrl.blocks[splitIf].inputs.SUBSTACK2 = [2, escIf];
    ctrl.blocks[escIf].parent = splitIf;
    console.log('[patch10d] loadCode escape branch installed');
  }

  // ---- meta: record what produced this file ----
  if (project.meta) {
    project.meta.agent = 'MiniPy v4 (review pass) - built ' + new Date().toISOString().slice(0, 16).replace('T', ' ');
  } else {
    project.meta = { semver: '3.0.0', vm: '0.2.0', agent: 'MiniPy v4 (review pass) built ' + new Date().toISOString().slice(0, 16).replace('T', ' ') };
  }

  // ---- P1-1: rebuild every parent link before writing ----
  function relink(project) {
    let fixed = 0;
    for (const t of project.targets) {
      const B2 = t.blocks;
      const attach = (child, parent) => { if (child && B2[child] && B2[child].parent !== parent) { B2[child].parent = parent; fixed++; } };
      for (const id in B2) {
        const b = B2[id];
        if (b.topLevel) { if (b.parent !== null) { b.parent = null; fixed++; } }
        if (typeof b.next === 'string') attach(b.next, id);
        for (const k in b.inputs) {
          const inp = b.inputs[k];
          if (!Array.isArray(inp)) continue;
          for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') attach(inp[i], id);
        }
      }
    }
    return fixed;
  }
  const fixed = relink(project);
  console.log('[patch10d] parent links fixed:', fixed);
})();



// ============ PATCH 11a: rename the speed button to SP, drop the "/ next >" label ============
(function patchSpAndLabel() {
  const crypto = require('crypto');
  const stage = project.targets.find(t => t.isStage);
  const ctrl = B.T['Controller'];
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);

  // ---- 1) the speed button label: >> -> SP ----
  {
    const costume = stage.costumes[0];
    const entry = entries.find(e => e.name === costume.md5ext);
    let svg = entry.data.toString('utf8');
    const before = svg.length;
    svg = svg.split('&gt;&gt;').join('SP');
    // ---- 2) the "/ next >" hint next to VARIABLES goes away with its click handler ----
    svg = svg.replace(/<text x="393" y="80"[^>]*>\/ next &gt;<\/text>/, '');
    if (svg.length === before) console.log('[patch11a] WARNING: nothing changed in the backdrop');
    const buf = Buffer.from(svg, 'utf8');
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    costume.assetId = hash;
    costume.md5ext = hash + '.svg';
    entries[entries.indexOf(entry)] = { name: costume.md5ext, data: buf };
    console.log('[patch11a] backdrop:', 'SP drawn:', svg.includes('>SP<'), '| next hint removed:', !svg.includes('next &gt;'));
  }

  // ---- status texts and the help line ----
  for (const b of Object.values(ctrl.blocks)) {
    if (b.opcode !== 'data_setvariableto' || !b.fields.VARIABLE || b.fields.VARIABLE[0] !== 'status') continue;
    const v = b.inputs.VALUE;
    if (!v || !v[1] || v[1][0] !== 10) continue;
    if (String(v[1][1]).indexOf('(>> lit)') > 0) v[1][1] = 'Speed FAST  (SP lit)';
  }
  for (const b of Object.values(ctrl.blocks)) {
    if (b.opcode !== 'data_addtolist' || !b.fields.LIST || b.fields.LIST[0] !== 'Output') continue;
    const v = b.inputs.ITEM;
    if (v && v[1] && v[1][0] === 10 && String(v[1][1]).indexOf('>> button') === 0) v[1][1] = 'SP button = fast / slow run';
  }

  function findInProc(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b, id)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  // ---- remove the "varpage += 4" handler that belonged to the / next > label ----
  function refsVar(blockId, name, depth) {
    if (!blockId || depth > 8) return false;
    const b = ctrl.blocks[blockId];
    if (!b) return false;
    for (const inp of Object.values(b.inputs || {})) {
      if (!Array.isArray(inp)) continue;
      if (Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === name) return true;
      if (typeof inp[1] === 'string' && refsVar(inp[1], name, depth + 1)) return true;
    }
    return false;
  }
  let clickDef = null;
  for (const [id, b] of Object.entries(ctrl.blocks)) {
    if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
      const proto = ctrl.blocks[b.inputs.custom_block[1]];
      if (proto && proto.mutation.proccode === 'click') clickDef = id;
    }
  }
  const victim = findInProc('Controller', clickDef, (b) => {
    if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.CONDITION[1]) return false;
    if (!refsVar(b.inputs.CONDITION[1], 'uy', 0) || !refsVar(b.inputs.CONDITION[1], 'ux', 0)) return false;
    // the branch that adds 4 to varpage
    let s = b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
    while (s) { const sb = ctrl.blocks[s]; if (sb.opcode === 'data_changevariableby' && sb.fields.VARIABLE && sb.fields.VARIABLE[0] === 'varpage') return true; s = sb.next; }
    return false;
  });
  if (victim) {
    const parent = ctrl.blocks[victim].parent;
    if (parent && ctrl.blocks[parent].next === victim) {
      ctrl.blocks[parent].next = ctrl.blocks[victim].next;
      if (ctrl.blocks[victim].next) ctrl.blocks[ctrl.blocks[victim].next].parent = parent;
      console.log('[patch11a] varpage += 4 handler removed');
    } else {
      console.log('[patch11a] WARNING: could not unlink the varpage handler');
    }
  } else {
    console.log('[patch11a] WARNING: varpage += 4 handler not found');
  }
  const pruned = pruneUnreachable(project);
  console.log('[patch11a] pruned', pruned, 'blocks');
})();

// ============ PATCH 11b: more Python syntax (** , string * , type()) ============
(function patchMoreSyntax() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const MUL = (a, b) => I('operator_multiply', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const MOD = (a, b) => I('operator_mod', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const ABS = (a) => I('operator_mathop', { fields: { OPERATOR: ['abs', null] }, inputs: { NUM: B.REP(a, [4, '0']) } });
  const MATHOP = (name, a) => I('operator_mathop', { fields: { OPERATOR: [name, null] }, inputs: { NUM: B.REP(a, [4, '0']) } });
  const CONTAINS = (a, b) => I('operator_contains', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
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
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const interp = B.T['Interpreter'];
  function findInProc2(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b, id)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  const findInProc = findInProc2;
  B.addVar('Interpreter', 'qpow', 1);

  // ---------- 1) tokenizer: recognise ** as one operator ----------
  {
    const tokDef = findDef('Interpreter', 'tokenize %s');
    // find the control_if whose condition tests  ec = "/" and en = "/"  (the // rule)
    const countSlash = (id, d) => {
      if (!id || d > 5) return 0;
      const b = interp.blocks[id];
      if (!b) return 0;
      let n = 0;
      for (const inp of Object.values(b.inputs || {})) {
        if (!Array.isArray(inp)) continue;
        if (Array.isArray(inp[1]) && inp[1][0] === 10 && inp[1][1] === '/') n++;
        else if (typeof inp[1] === 'string') n += countSlash(inp[1], d + 1);
      }
      return n;
    };
    const tokIf = findInProc2('Interpreter', tokDef, b => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] && countSlash(b.inputs.CONDITION[1], 0) >= 2);
    if (!tokIf) throw new Error('tokenizer two-char operator rule not found');
    const oldCond = interp.blocks[tokIf].inputs.CONDITION[1];
    const starTest = AND(iCmp('equals', B.VAR('ec'), B.txt('*')), iCmp('equals', B.VAR('en'), B.txt('*')));
    interp.blocks[tokIf].inputs.CONDITION = [2, OR(oldCond, starTest)];
    console.log('[patch11b] tokenizer now accepts **');
  }

  // ---------- 2) rank: ** binds tighter than * ----------
  {
    const rankDef = findDef('Interpreter', 'rank %s');
    const anchor = findInProc('Interpreter', rankDef, b => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] &&
      interp.blocks[b.inputs.CONDITION[1]] && interp.blocks[b.inputs.CONDITION[1]].opcode === 'operator_or' &&
      (function chk(id, d) { if (!id || d > 4) return false; const bb = interp.blocks[id]; if (!bb) return false; for (const inp of Object.values(bb.inputs || {})) { if (!Array.isArray(inp)) continue; if (Array.isArray(inp[1]) && inp[1][0] === 10 && inp[1][1] === '//') return true; if (typeof inp[1] === 'string' && chk(inp[1], d + 1)) return true; } return false; })(b.inputs.CONDITION[1], 0));
    if (!anchor) throw new Error('rank * rule not found');
    const powIf = iIf(iCmp('equals', B.argReporter('Interpreter', 'op'), B.txt('**')), [iSet('erank', B.num(6))]);
    const after = interp.blocks[anchor];
    // place right after the * rule so it overrides it for **
    powIf;
    const second = after.next;
    interp.blocks[anchor].next = powIf;
    interp.blocks[powIf].parent = anchor;
    interp.blocks[powIf].next = second;
    if (second) interp.blocks[second].parent = powIf;
    console.log('[patch11b] rank(**)=6 installed');
  }

  // ---------- 3) evaluate ** , and allow string * number ----------
  {
    const rsDef = findDef('Interpreter', 'rightside %s %s %s %s %s');
    const argOp = () => B.argReporter('Interpreter', 'op');
    const argLeft = () => B.argReporter('Interpreter', 'leftval');
    const argLeftType = () => B.argReporter('Interpreter', 'lefttype');
    // (a) numeric block: keep it, but exclude the string-repeat case
    const numIf = findInProc('Interpreter', rsDef, b => {
      if (b.opcode !== 'control_if' || !b.inputs.CONDITION || !b.inputs.CONDITION[1]) return false;
      const c = interp.blocks[b.inputs.CONDITION[1]];
      if (!c) return false;
      const chk = (id, d) => { if (!id || d > 4) return false; const bb = interp.blocks[id]; if (!bb) return false; for (const inp of Object.values(bb.inputs || {})) { if (!Array.isArray(inp)) continue; if (Array.isArray(inp[1]) && inp[1][0] === 10 && inp[1][1] === '//') return true; if (typeof inp[1] === 'string' && chk(inp[1], d + 1)) return true; } return false; };
      return c.opcode === 'operator_or' && chk(b.inputs.CONDITION[1], 0);
    });
    if (!numIf) throw new Error('rightside numeric block not found');
    const repeatCase = AND(iCmp('equals', argOp(), B.txt('*')), OR(iCmp('equals', argLeftType(), B.txt('S')), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))));
    const oldCond = interp.blocks[numIf].inputs.CONDITION[1];
    interp.blocks[numIf].inputs.CONDITION = [2, AND(oldCond, B.BOOL(NOT(repeatCase)))];
    // (b) string repetition, inserted right before the numeric block
    const strRepeat = [
      iSet('yb', B.txt('')),
      iIfElse(iCmp('equals', argLeftType(), B.txt('S')),
        [ iIf(iCmp('gt', B.VAR('ev'), B.num(0)), [
            I('control_repeat', { inputs: { TIMES: B.REP(B.VAR('ev'), [4, '0']), SUBSTACK: [2, I('data_setvariableto', { fields: B.VARF('yb'), inputs: { VALUE: B.REP(JOIN(B.VAR('yb'), argLeft()), [10, '']) } })] } })
          ]) ],
        [ iIf(iCmp('gt', argLeft(), B.num(0)), [
            I('control_repeat', { inputs: { TIMES: B.REP(argLeft(), [4, '0']), SUBSTACK: [2, I('data_setvariableto', { fields: B.VARF('yb'), inputs: { VALUE: B.REP(JOIN(B.VAR('yb'), B.VAR('ev')), [10, '']) } })] } })
          ]) ]),
      iSet('ev', B.VAR('yb')),
      iSet('evtype', B.txt('S'))
    ];
    const repeatIf = iIf(AND(iCmp('equals', argOp(), B.txt('*')), OR(iCmp('equals', argLeftType(), B.txt('S')), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))))), strRepeat);
    const numParent = interp.blocks[numIf].parent;
    if (numParent && interp.blocks[numParent].next === numIf) {
      interp.blocks[numParent].next = repeatIf;
      interp.blocks[repeatIf].parent = numParent;
      interp.blocks[repeatIf].next = numIf;
      interp.blocks[numIf].parent = repeatIf;
    } else {
      throw new Error('could not splice the string-repeat branch');
    }
    // (c) power operator
    const powerIf = iIf(iCmp('equals', argOp(), B.txt('**')), [
      iIf(OR(NOT(iCmp('equals', argLeftType(), B.txt('N'))), NOT(iCmp('equals', B.VAR('evtype'), B.txt('N')))), [fail('TypeError: numeric operands')]),
      iIfElse(AND(iCmp('equals', MOD(B.VAR('ev'), B.num(1)), B.num(0)), NOT(iCmp('gt', ABS(B.VAR('ev')), B.num(1024)))), [
        iSet('qpow', B.num(1)),
        I('control_repeat', { inputs: { TIMES: B.REP(ABS(B.VAR('ev')), [4, '0']), SUBSTACK: [2, I('data_setvariableto', { fields: B.VARF('qpow'), inputs: { VALUE: B.REP(MUL(B.VAR('qpow'), argLeft()), [4, '0']) } })] } }),
        iIfElse(iCmp('lt', B.VAR('ev'), B.num(0)),
          [iSet('ev', I('operator_divide', { inputs: { NUM1: B.num(1), NUM2: B.REP(B.VAR('qpow'), [4, '0']) } }))],
          [iSet('ev', B.VAR('qpow'))])
      ], [
        iIf(NOT(iCmp('gt', argLeft(), B.num(0))), [fail('ValueError: math domain error')]),
        iSet('ev', MATHOP('e ^', MUL(B.VAR('ev'), MATHOP('ln', argLeft()))))
      ]),
      iSet('evtype', B.txt('N'))
    ]);
    const pParent = interp.blocks[numIf].parent;   // now the repeatIf
    interp.blocks[repeatIf].next = powerIf;
    interp.blocks[powerIf].parent = repeatIf;
    interp.blocks[powerIf].next = numIf;
    interp.blocks[numIf].parent = powerIf;
    console.log('[patch11b] ** and string * installed');
  }

  // ---------- 4) type() ----------
  {
    const callfnDef = findDef('Interpreter', 'callfn %s %s %s');
    const boolIf = findInProc('Interpreter', callfnDef, b => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] &&
      (function chk(id, d) { if (!id || d > 4) return false; const bb = interp.blocks[id]; if (!bb) return false; for (const inp of Object.values(bb.inputs || {})) { if (!Array.isArray(inp)) continue; if (Array.isArray(inp[1]) && inp[1][0] === 10 && inp[1][1] === 'bool') return true; if (typeof inp[1] === 'string' && chk(inp[1], d + 1)) return true; } return false; })(b.inputs.CONDITION[1], 0));
    if (!boolIf) throw new Error('callfn bool branch not found');
    const typeIf = iIf(iCmp('equals', B.argReporter('Interpreter', 'fn'), B.txt('type')), [
      iIfElse(iCmp('equals', B.VAR('evtype'), B.txt('S')),
        [iSet('ev', B.txt('str'))],
        [iIfElse(CONTAINS(B.VAR('ev'), B.txt('.')), [iSet('ev', B.txt('float'))], [iSet('ev', B.txt('int'))])]),
      iSet('evtype', B.txt('S')),
      iSet('pending', B.num(1))
    ]);
    const after = interp.blocks[boolIf].next;
    interp.blocks[boolIf].next = typeIf;
    interp.blocks[typeIf].parent = boolIf;
    interp.blocks[typeIf].next = after;
    if (after) interp.blocks[after].parent = typeIf;
    console.log('[patch11b] type() installed');
  }
})();




// ============ PATCH 12: -/after ** is unary, and really drop the / next > handler ============
(function patchFixups() {
  function findInProc(targetName, defId, pred) {
    const t = B.T[targetName];
    const seen = new Set();
    const stack = [t.blocks[defId].next];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = t.blocks[id];
      if (!b) continue;
      if (pred(b, id)) return id;
      if (b.next) stack.push(b.next);
      for (const inp of Object.values(b.inputs || {})) {
        if (Array.isArray(inp)) for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') stack.push(inp[i]);
      }
    }
    return null;
  }
  function unlink(targetName, blockId) {
    const t = B.T[targetName];
    const b = t.blocks[blockId];
    if (!b) return false;
    const parent = b.parent ? t.blocks[b.parent] : null;
    if (parent && parent.next === blockId) {
      parent.next = b.next;
      if (b.next) t.blocks[b.next].parent = b.parent;
      return true;
    }
    if (parent) {
      for (const [slot, inp] of Object.entries(parent.inputs || {})) {
        if (Array.isArray(inp) && inp[1] === blockId) {
          parent.inputs[slot] = b.next ? [2, b.next] : [2, null];
          if (b.next) t.blocks[b.next].parent = b.parent;
          return true;
        }
      }
    }
    return false;
  }

  // ---- 1) the "-" right after "**" must be read as unary ----
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const interp = B.T['Interpreter'];
  {
    const evalDef = findDef('Interpreter', 'eval %s %s');
    const refsEprev = (id, d) => {
      if (!id || d > 6) return false;
      const b = interp.blocks[id];
      if (!b) return false;
      for (const inp of Object.values(b.inputs || {})) {
        if (!Array.isArray(inp)) continue;
        if (Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === 'eprev') return true;
        if (typeof inp[1] === 'string' && refsEprev(inp[1], d + 1)) return true;
      }
      return false;
    };
    const unaryIf = findInProc('Interpreter', evalDef, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] && refsEprev(b.inputs.CONDITION[1], 0));
    if (!unaryIf) throw new Error('unary previous-token rule not found');
    const oldCond = interp.blocks[unaryIf].inputs.CONDITION[1];
    const extra = iCmp('equals', B.VAR('eprev'), B.txt('**'));
    interp.blocks[unaryIf].inputs.CONDITION = [2, I('operator_or', { inputs: { OPERAND1: B.BOOL(oldCond), OPERAND2: B.BOOL(extra) } })];
    console.log('[patch12] "-" after "**" is now unary');
  }

  // ---- 2) remove the "/ next >" click handler for good ----
  {
    const ctrl = B.T['Controller'];
    B.setCtx('Controller');
    let clickDef = null;
    for (const [id, b] of Object.entries(ctrl.blocks)) {
      if (b.opcode === 'procedures_definition' && b.inputs.custom_block) {
        const proto = ctrl.blocks[b.inputs.custom_block[1]];
        if (proto && proto.mutation.proccode === 'click') clickDef = id;
      }
    }
    const hasNum = (id, val, d) => {
      if (!id || d > 6) return false;
      const b = ctrl.blocks[id];
      if (!b) return false;
      for (const inp of Object.values(b.inputs || {})) {
        if (!Array.isArray(inp)) continue;
        if (Array.isArray(inp[1]) && String(inp[1][1]) === String(val)) return true;
        if (typeof inp[1] === 'string' && hasNum(inp[1], val, d + 1)) return true;
      }
      return false;
    };
    // walk the real click body chain and unlink the uy<112 / uy>94 / ux>65 branch in place
    let prev = null, cur = ctrl.blocks[clickDef].next, removed = false;
    while (cur) {
      const b = ctrl.blocks[cur];
      const isTarget = b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] &&
        hasNum(b.inputs.CONDITION[1], 112, 0) && hasNum(b.inputs.CONDITION[1], 94, 0) && hasNum(b.inputs.CONDITION[1], 65, 0);
      if (isTarget) {
        if (prev) {
          ctrl.blocks[prev].next = b.next;
          if (b.next) ctrl.blocks[b.next].parent = prev;
        } else {
          ctrl.blocks[clickDef].next = b.next;
          if (b.next) ctrl.blocks[b.next].parent = clickDef;
        }
        removed = true;
        break;
      }
      prev = cur;
      cur = b.next;
    }
    console.log('[patch12] / next > handler removed:', removed);
    const pruned = pruneUnreachable(project);
    console.log('[patch12] pruned', pruned, 'blocks');
    // re-link every parent pointer after the surgery
    let fixed = 0;
    for (const t of project.targets) {
      const B2 = t.blocks;
      const attach = (child, parent) => { if (child && B2[child] && B2[child].parent !== parent) { B2[child].parent = parent; fixed++; } };
      for (const id in B2) {
        const b = B2[id];
        if (b.topLevel) { if (b.parent !== null) { b.parent = null; fixed++; } }
        if (typeof b.next === 'string') attach(b.next, id);
        for (const k in b.inputs) {
          const inp = b.inputs[k];
          if (!Array.isArray(inp)) continue;
          for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') attach(inp[i], id);
        }
      }
    }
    console.log('[patch12] parent links fixed:', fixed);
  }
})();






















// ============ PATCH 13a: Python lists (value = SEP + typechar + element, repeated) ============
(function patchListProcs() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LET = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
  const TOK = (i) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const SEPV = () => B.VAR('lsep');
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
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];
  ['li', 'ln', 'lacc', 'lstart', 'lcount', 'lidx', 'lplo', 'lphi', 'lpi', 'ltmp', 'lsum'].forEach(n => B.addVar('Interpreter', n, '0'));
  B.addList('Interpreter', 'LComm', []);
  B.addList('Interpreter', 'LOut', []);
  B.setCtx('Stage');
  B.addVar('Stage', 'lsep', String.fromCharCode(31));
  B.setCtx('Interpreter');
  function mk(name, args, build) {
    const proc = B.makeProcedure('Interpreter', name, args, true);
    const A = (n) => B.argReporter('Interpreter', n);
    const first = B.chain('Interpreter', build(A, proc));
    interp.blocks[proc.defId].next = first;
    interp.blocks[first].parent = proc.defId;
    return proc;
  }

  // ---- listlit lo hi : evaluate comma separated elements lo..hi -> ev (encoded), evtype = L ----
  mk('listlit %s %s', ['lo', 'hi'], (A) => {
    const scan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('ek'), A('hi'))) } });
    B.sub('Interpreter', scan, 'SUBSTACK', B.chain('Interpreter', [
      iSet('eop', TOK(B.VAR('ek'))),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt('(')), iCmp('equals', B.VAR('eop'), B.txt('['))), [iChg('ed', B.num(1))]),
      iIf(OR(iCmp('equals', B.VAR('eop'), B.txt(')')), iCmp('equals', B.VAR('eop'), B.txt(']'))), [iChg('ed', B.num(-1))]),
      iIf(AND(iCmp('equals', B.VAR('ed'), B.num(0)), iCmp('equals', B.VAR('eop'), B.txt(','))), [
        I('data_addtolist', { fields: B.LISTF('LComm'), inputs: { ITEM: B.REP(B.VAR('ek'), [4, '0']) } })
      ]),
      iChg('ek', B.num(1))
    ]));
    const addElem = () => I('data_addtolist', { fields: B.LISTF('LOut'), inputs: { ITEM: B.REP(JOIN(SEPV(), JOIN(B.VAR('evtype'), B.VAR('ev'))), [10, '']) } });
    const evalLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lpi'), I('data_lengthoflist', { fields: B.LISTF('LComm') }))) } });
    B.sub('Interpreter', evalLoop, 'SUBSTACK', B.chain('Interpreter', [
      iSet('lphi', SUB(I('data_itemoflist', { fields: B.LISTF('LComm'), inputs: { INDEX: B.VAR('lpi') } }), B.num(1))),
      callExisting('eval %s %s', [B.VAR('lplo'), B.VAR('lphi')]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      addElem(),
      iSet('lplo', ADD(I('data_itemoflist', { fields: B.LISTF('LComm'), inputs: { INDEX: B.VAR('lpi') } }), B.num(1))),
      iChg('lpi', B.num(1))
    ]));
    const joinLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lpi'), I('data_lengthoflist', { fields: B.LISTF('LOut') }))) } });
    B.sub('Interpreter', joinLoop, 'SUBSTACK', B.chain('Interpreter', [
      iSet('lacc', JOIN(B.VAR('lacc'), I('data_itemoflist', { fields: B.LISTF('LOut'), inputs: { INDEX: B.VAR('lpi') } }))),
      iChg('lpi', B.num(1))
    ]));
    return [
      iSet('ev', B.txt('')),
      iSet('evtype', B.txt('L')),
      iIf(NOT(iCmp('gt', A('lo'), A('hi'))), [
        I('data_deletealloflist', { fields: B.LISTF('LComm') }),
        I('data_deletealloflist', { fields: B.LISTF('LOut') }),
        iSet('ed', B.num(0)),
        iSet('ek', A('lo')),
        scan,
        iSet('lpi', B.num(1)),
        iSet('lplo', A('lo')),
        evalLoop,
        callExisting('eval %s %s', [B.VAR('lplo'), A('hi')]),
        iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
        addElem(),
        iSet('lacc', B.txt('')),
        iSet('lpi', B.num(1)),
        joinLoop,
        iSet('ev', B.VAR('lacc')),
        iSet('evtype', B.txt('L'))
      ])
    ];
  });

  // ---- listlen s : number of elements ----
  mk('listlen %s', ['s'], (A) => {
    const body = [iSet('ln', B.num(0)), iSet('li', B.num(1))];
    const loop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('li'), LEN(A('s')))) } });
    B.sub('Interpreter', loop, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', LET(B.VAR('li'), A('s')), SEPV()), [iChg('ln', B.num(1))]),
      iChg('li', B.num(1))
    ]));
    body.push(loop, iSet('ev', B.VAR('ln')), iSet('evtype', B.txt('N')));
    return body;
  });

  // ---- listitem s idx : idx is 1 based; sets ev / evtype (empty when out of range) ----
  mk('listitem %s %s', ['s', 'idx'], (A) => {
    const body = [];
    body.push(iSet('ev', B.txt('')));
    body.push(iSet('evtype', B.txt('S')));
    body.push(iSet('lstart', B.num(0)));
    body.push(iSet('lcount', B.num(0)));
    body.push(iSet('li', B.num(1)));
    const seek = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(OR(iCmp('gt', B.VAR('li'), LEN(A('s'))), iCmp('equals', B.VAR('lcount'), A('idx')))) } });
    B.sub('Interpreter', seek, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', LET(B.VAR('li'), A('s')), SEPV()), [
        iChg('lcount', B.num(1)),
        iIf(iCmp('equals', B.VAR('lcount'), A('idx')), [iSet('lstart', B.VAR('li'))])
      ]),
      iChg('li', B.num(1))
    ]));
    body.push(seek);
    const grab = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(OR(iCmp('gt', B.VAR('li'), LEN(A('s'))), iCmp('equals', LET(B.VAR('li'), A('s')), SEPV()))) } });
    B.sub('Interpreter', grab, 'SUBSTACK', B.chain('Interpreter', [
      iSet('lacc', JOIN(B.VAR('lacc'), LET(B.VAR('li'), A('s')))),
      iChg('li', B.num(1))
    ]));
    body.push(iIf(iCmp('gt', B.VAR('lstart'), B.num(0)), [
      iSet('lacc', B.txt('')),
      // the seek loop already stopped on lstart + 1: point li straight at the type char
      iSet('li', ADD(B.VAR('lstart'), B.num(1))),
      grab,
      iIf(iCmp('gt', LEN(B.VAR('lacc')), B.num(0)), [
        callExisting('substr %s %s %s', [B.VAR('lacc'), B.num(2), LEN(B.VAR('lacc'))]),
        iSet('evtype', LET(B.num(1), B.VAR('lacc')))
      ])
    ]));
    return body;
  });

  // ---- listfmt s : render an encoded list as [a, b, c] ----
  mk('listfmt %s', ['s'], (A) => {
    const body = [];
    body.push(iSet('lacc', B.txt('[')));
    body.push(iSet('lcount', B.num(0)));
    body.push(iSet('li', B.num(1)));
    const loop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('li'), LEN(A('s')))) } });
    const inner = I('control_if_else', { inputs: { CONDITION: B.BOOL(iCmp('equals', LET(B.VAR('li'), A('s')), SEPV())) } });
    B.sub('Interpreter', inner, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('gt', B.VAR('lcount'), B.num(0)), [iSet('lacc', JOIN(B.VAR('lacc'), B.txt(', ')))]),
      iChg('lcount', B.num(1)),
      iChg('li', B.num(1))
    ]));
    B.sub('Interpreter', inner, 'SUBSTACK2', B.chain('Interpreter', [
      iSet('lacc', JOIN(B.VAR('lacc'), LET(B.VAR('li'), A('s'))))
    ]));
    B.sub('Interpreter', loop, 'SUBSTACK', B.chain('Interpreter', [inner, iChg('li', B.num(1))]));
    body.push(loop, iSet('ev', JOIN(B.VAR('lacc'), B.txt(']'))), iSet('evtype', B.txt('S')));
    return body;
  });
  console.log('[patch13a] list procedures installed');
})();


// ============ PATCH 13c: list hooks (literal, index, len/sum/str, print, for x in list) ============
(function patchListHooks() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const TOK = (i) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const itemAt = (n, idx) => I('data_itemoflist', { fields: B.LISTF(n), inputs: { INDEX: B.REP(idx, [4, '0']) } });
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
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];

  function walkChain(startId, visit) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = interp.blocks[id];
      if (!b) continue;
      visit(b, id);
      if (b.next) stack.push(b.next);
      for (const v of Object.values(b.inputs || {})) {
        if (!Array.isArray(v)) continue;
        for (let i = 1; i < v.length; i++) if (typeof v[i] === 'string') stack.push(v[i]);
      }
    }
  }
  function findIn(defId, pred) {
    let hit = null;
    walkChain(interp.blocks[defId].next, (b, id) => { if (hit === null && pred(b, id)) hit = id; });
    return hit;
  }
  function litOf(inp) { return (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1].length === 2 && typeof inp[1][1] === 'string') ? inp[1][1] : null; }
  function blkOf(inp) { return (Array.isArray(inp) && typeof inp[1] === 'string') ? interp.blocks[inp[1]] : null; }
  function isVar(inp, name) {
    if (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][0] === 12) return inp[1][1] === name;
    const b = blkOf(inp);
    return !!(b && b.opcode === 'data_variable' && b.fields.VARIABLE[0] === name);
  }
  function isTokItem(inp) { const b = blkOf(inp); return !!(b && b.opcode === 'data_itemoflist' && b.fields.LIST[0] === 'Tok'); }
  function condLits(id, out) {
    const b = interp.blocks[id];
    if (!b) return out;
    for (const v of Object.values(b.inputs || {})) {
      if (!Array.isArray(v)) continue;
      if (Array.isArray(v[1]) && v[1].length === 2 && typeof v[1][1] === 'string') out.push(v[1][1]);
      else if (typeof v[1] === 'string') condLits(v[1], out);
    }
    return out;
  }
  function insertBefore(targetId, newId) {
    const blk = interp.blocks[targetId];
    const pid = blk.parent;
    const p = pid ? interp.blocks[pid] : null;
    if (!p || p.next !== targetId) throw new Error('insertBefore: ' + targetId + ' is not in a plain chain');
    p.next = newId; interp.blocks[newId].parent = pid;
    interp.blocks[newId].next = targetId; blk.parent = newId;
  }
  function setSlot(holderId, targetId, newId) {
    const p = interp.blocks[holderId];
    for (const [k, v] of Object.entries(p.inputs || {})) {
      if (Array.isArray(v) && v[1] === targetId) { p.inputs[k] = [2, newId]; interp.blocks[newId].parent = holderId; return k; }
    }
    throw new Error('setSlot: slot holding ' + targetId + ' not found on ' + holderId);
  }
  // wrap the body of an if/if_else: the old chain stays as the else branch
  function wrapSubstack(holderId, slot, cond, newIds) {
    const old = interp.blocks[holderId].inputs[slot][1];
    const nw = iIfElse(cond, newIds, [old]);
    interp.blocks[old].parent = nw;
    interp.blocks[holderId].inputs[slot] = [2, nw];
    interp.blocks[nw].parent = holderId;
    return nw;
  }

  // ---- 1) printargs: count [ ] while scanning for top level commas ----
  {
    const paDef = findDef('Interpreter', 'printargs');
    const eqClose = findIn(paDef, (b) => b.opcode === 'operator_equals' && litOf(b.inputs.OPERAND2) === ')' && isTokItem(b.inputs.OPERAND1));
    if (!eqClose) throw new Error('printargs: ) test not found');
    const closeIf = interp.blocks[eqClose].parent;
    if (!closeIf || interp.blocks[closeIf].opcode !== 'control_if') throw new Error('printargs: ) branch not found');
    const opening = iIf(iCmp('equals', TOK(B.VAR('ek')), B.txt('[')), [iChg('ed', B.num(1))]);
    const closing = iIf(iCmp('equals', TOK(B.VAR('ek')), B.txt(']')), [iChg('ed', B.num(-1))]);
    const after = interp.blocks[closeIf].next;
    interp.blocks[closeIf].next = opening; interp.blocks[opening].parent = closeIf;
    interp.blocks[opening].next = closing; interp.blocks[closing].parent = opening;
    interp.blocks[closing].next = after; if (after) interp.blocks[after].parent = closing;
    console.log('[patch13c.1] printargs bracket depth installed');
  }

  // ---- 2) eval: [a, b, c] literal, spliced in front of the A[i] dispatch ----
  {
    const evalDef = findDef('Interpreter', 'eval %s %s');
    const igCall = findIn(evalDef, (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'indexget %s %s');
    if (!igCall) throw new Error('eval: indexget dispatch not found');
    const idxIf = interp.blocks[igCall].parent;
    const holderId = interp.blocks[idxIf].parent;
    if (!holderId) throw new Error('eval: index dispatch has no parent');
    const lo = () => B.argReporter('Interpreter', 'lo'), hi = () => B.argReporter('Interpreter', 'hi');
    const litIf = iIfElse(AND(iCmp('equals', TOK(lo()), B.txt('[')), iCmp('equals', TOK(hi()), B.txt(']'))),
      [callExisting('listlit %s %s', [ADD(lo(), B.num(1)), SUB(hi(), B.num(1))])],
      [idxIf]);
    setSlot(holderId, idxIf, litIf);
    interp.blocks[idxIf].parent = litIf;
    console.log('[patch13c.2] list literal installed');
  }

  // ---- 3) indexget: a[i] on a list ----
  {
    const igDef = findDef('Interpreter', 'indexget %s %s');
    const typeEq = findIn(igDef, (b) => b.opcode === 'operator_equals' && isVar(b.inputs.OPERAND1, 'xb') && litOf(b.inputs.OPERAND2) === 'S');
    if (!typeEq) throw new Error('indexget: base type test not found');
    const typeIf = interp.blocks[interp.blocks[typeEq].parent].parent;
    interp.blocks[typeIf].inputs.CONDITION = [2, NOT(OR(iCmp('equals', B.VAR('xb'), B.txt('S')), iCmp('equals', B.VAR('xb'), B.txt('L'))))];
    const xcolEq = findIn(igDef, (b) => b.opcode === 'operator_equals' && isVar(b.inputs.OPERAND1, 'xcol') &&
      interp.blocks[b.parent] && interp.blocks[b.parent].opcode === 'control_if_else');
    if (!xcolEq) throw new Error('indexget: xcol dispatch not found');
    const singleIf = interp.blocks[xcolEq].parent;
    const lo = B.argReporter('Interpreter', 'lo'), hi = B.argReporter('Interpreter', 'hi');
    wrapSubstack(singleIf, 'SUBSTACK', iCmp('equals', B.VAR('xb'), B.txt('L')), [
      callExisting('eval %s %s', [ADD(lo, B.num(2)), SUB(hi, B.num(1))]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: list index must be an integer')]),
      iSet('lidx', B.VAR('ev')),
      callExisting('listlen %s', [B.VAR('xa')]),
      iSet('ln', B.VAR('ev')),
      iIf(iCmp('lt', B.VAR('lidx'), B.num(0)), [iChg('lidx', B.VAR('ln'))]),
      iIf(OR(iCmp('lt', B.VAR('lidx'), B.num(0)), NOT(iCmp('lt', B.VAR('lidx'), B.VAR('ln')))), [fail('IndexError: list index out of range')]),
      callExisting('listitem %s %s', [B.VAR('xa'), ADD(B.VAR('lidx'), B.num(1))])
    ]);
    console.log('[patch13c.3] list indexing installed');
  }

  // ---- 4) callfn: len / sum / str on lists ----
  {
    const cfDef = findDef('Interpreter', 'callfn %s %s %s');
    const errEq = findIn(cfDef, (b) => b.opcode === 'operator_equals' && isVar(b.inputs.OPERAND1, 'error') && litOf(b.inputs.OPERAND2) === '');
    if (!errEq) throw new Error('callfn: error guard not found');
    const outerIf = interp.blocks[errEq].parent;
    const topIfs = () => {
      const out = [];
      let id = interp.blocks[outerIf].inputs.SUBSTACK[1];
      while (id) { const b = interp.blocks[id]; if (b.opcode === 'control_if') out.push(id); id = b.next; }
      return out;
    };
    const fnIf = (name) => topIfs().find((id) => condLits(interp.blocks[id].inputs.CONDITION[1], []).indexOf(name) >= 0);
    const lenIf = fnIf('len');
    if (!lenIf) throw new Error('callfn: len branch not found');
    wrapSubstack(lenIf, 'SUBSTACK', iCmp('equals', B.VAR('evtype'), B.txt('L')), [
      callExisting('listlen %s', [B.VAR('ev')]),
      iSet('pending', B.num(1))
    ]);
    const sumLoop = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lpi'), B.VAR('ln'))) } });
    B.sub('Interpreter', sumLoop, 'SUBSTACK', B.chain('Interpreter', [
      callExisting('listitem %s %s', [B.VAR('ltmp'), B.VAR('lpi')]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: sum() requires a list of numbers')]),
      iChg('lsum', B.VAR('ev')),
      iChg('lpi', B.num(1))
    ]));
    const sumIf = iIf(iCmp('equals', B.argReporter('Interpreter', 'fn'), B.txt('sum')), [
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('L'))), [fail('TypeError: sum() requires a list')]),
      iSet('ltmp', B.VAR('ev')),
      callExisting('listlen %s', [B.VAR('ltmp')]),
      iSet('ln', B.VAR('ev')),
      iSet('lsum', B.num(0)),
      iSet('lpi', B.num(1)),
      sumLoop,
      iSet('ev', B.VAR('lsum')),
      iSet('evtype', B.txt('N')),
      iSet('pending', B.num(1))
    ]);
    const strIf = fnIf('str');
    if (!strIf) throw new Error('callfn: str branch not found');
    wrapSubstack(strIf, 'SUBSTACK', iCmp('equals', B.VAR('evtype'), B.txt('L')), [
      callExisting('listfmt %s', [B.VAR('ev')]),
      iSet('pending', B.num(1))
    ]);
    insertBefore(lenIf, sumIf);
    console.log('[patch13c.4] len/sum/str for lists installed');
  }

  // ---- 5) print: render list arguments ----
  {
    const paDef = findDef('Interpreter', 'printargs');
    const concat = findIn(paDef, (b) => b.opcode === 'data_setvariableto' && b.fields.VARIABLE && b.fields.VARIABLE[0] === 'printbuf' &&
      (function chk(inp) { const j = blkOf(inp); return !!(j && j.opcode === 'operator_join' && isVar(j.inputs.STRING2, 'ev')); })(b.inputs.VALUE));
    if (!concat) throw new Error('printargs: printbuf concat not found');
    const fmtIf = iIf(iCmp('equals', B.VAR('evtype'), B.txt('L')), [callExisting('listfmt %s', [B.VAR('ev')])]);
    insertBefore(concat, fmtIf);
    console.log('[patch13c.5] print(list) installed');
  }

  // ---- 6) for x in <list> ----
  {
    const forDef = findDef('Interpreter', 'forloop');
    const typeIf = findIn(forDef, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] &&
      interp.blocks[b.inputs.CONDITION[1]].opcode === 'operator_not' &&
      (function () {
        const eq = interp.blocks[interp.blocks[b.inputs.CONDITION[1]].inputs.OPERAND[1]];
        return !!(eq && eq.opcode === 'operator_equals' && isVar(eq.inputs.OPERAND1, 'evtype') && litOf(eq.inputs.OPERAND2) === 'S');
      })());
    if (!typeIf) throw new Error('forloop: string type guard not found');
    const oldCond = interp.blocks[typeIf].inputs.CONDITION[1];
    const oldFail = interp.blocks[typeIf].inputs.SUBSTACK[1];
    const afterType = interp.blocks[typeIf].next;
    const listSetup = [
      iSet('ltmp', B.VAR('ev')),
      callExisting('listlen %s', [B.VAR('ltmp')]),
      iSet('ln', B.VAR('ev')),
      iIfElse(iCmp('gt', B.VAR('ln'), B.num(0)), [
        callExisting('listitem %s %s', [B.VAR('ltmp'), B.num(1)]),
        callExisting('assign %s %s %s', [B.VAR('name'), B.VAR('ev'), B.VAR('evtype')]),
        callExisting('pushLoop %s %s %s %s %s', [B.txt('list'), B.VAR('name'), B.num(1), B.VAR('ln'), B.num(1)]),
        I('data_replaceitemoflist', { fields: B.LISTF('LoopText'), inputs: { INDEX: B.REP(lenOf('LoopText'), [4, '0']), ITEM: B.REP(B.VAR('ltmp'), [10, '']) } })
      ], [
        iSet('dest', itemAt('Ends', B.VAR('pc')))
      ])
    ];
    const elseFail = I('control_if', { inputs: { CONDITION: [2, oldCond] } });
    interp.blocks[oldCond].parent = elseFail;
    B.sub('Interpreter', elseFail, 'SUBSTACK', B.chain('Interpreter', [oldFail]));
    interp.blocks[oldFail].next = null;
    const blk = interp.blocks[typeIf];
    blk.opcode = 'control_if_else';
    blk.inputs.CONDITION = [2, iCmp('equals', B.VAR('evtype'), B.txt('L'))];
    B.sub('Interpreter', typeIf, 'SUBSTACK', B.chain('Interpreter', listSetup));
    B.sub('Interpreter', typeIf, 'SUBSTACK2', B.chain('Interpreter', [elseFail]));
    interp.blocks[elseFail].parent = typeIf;
    interp.blocks[elseFail].next = afterType;
    if (afterType) interp.blocks[afterType].parent = elseFail;
    blk.next = null;
    console.log('[patch13c.6] for..in list installed');
  }

  // ---- 7) boundary: advance a list loop one element at a time ----
  {
    const bdDef = findDef('Interpreter', 'boundary');
    const repUntil = interp.blocks[interp.blocks[bdDef].next].next;
    const kindIfElse = interp.blocks[repUntil].inputs.SUBSTACK[1];
    const strIf = interp.blocks[kindIfElse].inputs.SUBSTACK2[1];
    if (!strIf || interp.blocks[strIf].opcode !== 'control_if_else') throw new Error('boundary: kind dispatch not found');
    const listIf = iIfElse(iCmp('equals', itemAt('LoopKind', B.VAR('lc')), B.txt('list')), [
      iSet('lv', ADD(itemAt('LoopValue', B.VAR('lc')), B.num(1))),
      iIfElse(iCmp('gt', B.VAR('lv'), itemAt('LoopStop', B.VAR('lc'))), [
        callExisting('popLoop', [])
      ], [
        I('data_replaceitemoflist', { fields: B.LISTF('LoopValue'), inputs: { INDEX: B.REP(B.VAR('lc'), [4, '0']), ITEM: B.REP(B.VAR('lv'), [4, '0']) } }),
        callExisting('listitem %s %s', [itemAt('LoopText', B.VAR('lc')), B.VAR('lv')]),
        callExisting('assign %s %s %s', [itemAt('LoopName', B.VAR('lc')), B.VAR('ev'), B.VAR('evtype')]),
        iSet('pc', ADD(itemAt('LoopHead', B.VAR('lc')), B.num(1)))
      ])
    ], [strIf]);
    interp.blocks[strIf].parent = listIf;
    interp.blocks[kindIfElse].inputs.SUBSTACK2 = [2, listIf];
    interp.blocks[listIf].parent = kindIfElse;
    console.log('[patch13c.7] list loop advancement installed');
  }
  console.log('[patch13c] hooks done');
})();

// ============ PATCH 13d: re-link parent pointers after the list surgery ============
function relinkAfterLists() {
  let fixed = 0, dupes = 0;
  for (const t of project.targets) {
    const B2 = t.blocks;
    const refs = {};
    const note = (child, parent) => {
      if (!child || !B2[child]) return;
      refs[child] = (refs[child] || 0) + 1;
      if (B2[child].parent !== parent) { B2[child].parent = parent; fixed++; }
    };
    for (const id in B2) {
      const b = B2[id];
      if (b.topLevel) { if (b.parent !== null) { b.parent = null; fixed++; } }
      if (typeof b.next === 'string') note(b.next, id);
      for (const k in b.inputs) {
        const inp = b.inputs[k];
        if (!Array.isArray(inp)) continue;
        for (let i = 1; i < inp.length; i++) if (typeof inp[i] === 'string') note(inp[i], id);
      }
    }
    for (const [child, n] of Object.entries(refs)) if (n > 1) { dupes++; if (dupes <= 5) console.log('[patch13d] block referenced twice:', child, B2[child] && B2[child].opcode); }
  }
  console.log('[patch13d] parent links fixed:', fixed, '| doubly referenced blocks:', dupes);
}
// ============ PATCH 13e: demo 9 (lists) ============
(function patchListDemo() {
  B.setCtx('Controller');
  const C = (op, opts) => B.B('Controller', op, opts);
  const ctrl = B.T['Controller'];
  const cmp = (op, a, b) => C('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const exDef = findDef('Controller', 'example');
  const lines = [
    '# Lists',
    'a = [3, 1, 2]',
    'print(a)',
    'print(len(a))',
    'print(a[0])',
    'print(a[-1])',
    'print(sum(a))',
    'for x in a:',
    '    print(x * 2)',
    'a.append(4)',
    'print(a)'
  ];
  let demo8 = null;
  let id = ctrl.blocks[exDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
      const c = ctrl.blocks[b.inputs.CONDITION[1]];
      if (c && c.opcode === 'operator_equals' && c.inputs.OPERAND2 && c.inputs.OPERAND2[1] && c.inputs.OPERAND2[1][1] === '8') demo8 = id;
    }
    id = b.next;
  }
  if (!demo8) throw new Error('demo 8 branch not found');
  const if9 = C('control_if', { inputs: { CONDITION: B.BOOL(cmp('equals', B.VAR('demo'), B.num(9))) } });
  const adds = lines.map(l => C('data_addtolist', { fields: B.LISTF('Code'), inputs: { ITEM: B.txt(l) } }));
  B.sub('Controller', if9, 'SUBSTACK', B.chain('Controller', adds));
  const after8 = ctrl.blocks[demo8].next;
  ctrl.blocks[demo8].next = if9; ctrl.blocks[if9].parent = demo8;
  ctrl.blocks[if9].next = after8; if (after8) ctrl.blocks[after8].parent = if9;
  let wrapped = false;
  id = ctrl.blocks[exDef].next;
  while (id) {
    const b = ctrl.blocks[id];
    if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
      const c = ctrl.blocks[b.inputs.CONDITION[1]];
      if (c && c.opcode === 'operator_gt' && c.inputs.OPERAND2 && c.inputs.OPERAND2[1] && c.inputs.OPERAND2[1][1] === '8') { c.inputs.OPERAND2 = [1, [4, '9']]; wrapped = true; }
    }
    id = b.next;
  }
  console.log('[patch13e] demo 9 (lists) added | wrap 8 -> 9:', wrapped);
})();

// re-link every parent pointer now that all list patches are in
relinkAfterLists();


// ============ PATCH 14: expression statements + list methods ============
(function patchExprStmtAndMethods() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LET = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
  const TOK = (i) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const SEPV = () => B.VAR('lsep');
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
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];
  ['lmeth', 'lnew', 'lval', 'ltyp', 'llast', 'lx'].forEach(n => B.addVar('Interpreter', n, '0'));
  function walkChain(startId, visit) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = interp.blocks[id];
      if (!b) continue;
      visit(b, id);
      if (b.next) stack.push(b.next);
      for (const v of Object.values(b.inputs || {})) {
        if (!Array.isArray(v)) continue;
        for (let i = 1; i < v.length; i++) if (typeof v[i] === 'string') stack.push(v[i]);
      }
    }
  }
  function findIn(defId, pred) { let hit = null; walkChain(interp.blocks[defId].next, (b, id) => { if (hit === null && pred(b, id)) hit = id; }); return hit; }
  function litOf(inp) { return (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1].length === 2 && typeof inp[1][1] === 'string') ? inp[1][1] : null; }
  function setSlot(holderId, targetId, newId) {
    const p = interp.blocks[holderId];
    for (const [k, v] of Object.entries(p.inputs || {})) {
      if (Array.isArray(v) && v[1] === targetId) { p.inputs[k] = [2, newId]; interp.blocks[newId].parent = holderId; return k; }
    }
    throw new Error('setSlot: ' + targetId + ' not found on ' + holderId);
  }
  function mk(name, args, build) {
    const proc = B.makeProcedure('Interpreter', name, args, true);
    const A = (n) => B.argReporter('Interpreter', n);
    const first = B.chain('Interpreter', build(A, proc));
    interp.blocks[proc.defId].next = first;
    interp.blocks[first].parent = proc.defId;
    return proc;
  }

  // ---- 1) expression statements: a bare expression on its own line is evaluated and discarded ----
  {
    const failSite = findIn(findDef('Interpreter', 'execute'), (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'fail %s' &&
      (litOf(Object.values(b.inputs)[0]) || '').indexOf('unsupported statement') >= 0);
    if (!failSite) throw new Error('execute: unsupported statement site not found');
    const holder = interp.blocks[failSite].parent;
    if (!holder || interp.blocks[holder].opcode !== 'control_if') throw new Error('execute: pending guard not found');
    const keywords = ['import', 'from', 'def', 'class', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'global', 'nonlocal', 'raise', 'as', 'elif', 'else', 'return', 'pass', 'async', 'await'];
    let cond = null;
    for (const k of keywords) {
      const c = iCmp('equals', TOK(B.num(1)), B.txt(k));
      cond = cond === null ? c : OR(cond, c);
    }
    const ev = callExisting('eval %s %s', [B.num(1), B.VAR('count')]);
    const newIf = iIfElse(cond, [failSite], [ev]);
    interp.blocks[failSite].parent = newIf;
    interp.blocks[holder].inputs.SUBSTACK = [2, newIf];
    interp.blocks[newIf].parent = holder;
    console.log('[patch14.1] expression statements installed');
  }

  // ---- 2) list methods: a.append(x) / a.pop() / a.clear() / a.extend(b) ----
  mk('methodcall %s %s', ['lo', 'hi'], (A) => {
    const body = [];
    body.push(callExisting('eval %s %s', [A('lo'), A('lo')]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iSet('xa', B.VAR('ev')));
    body.push(iSet('xb', B.VAR('evtype')));
    body.push(iIf(NOT(iCmp('equals', B.VAR('xb'), B.txt('L'))), [fail('AttributeError: only lists have methods')]));
    body.push(iSet('lmeth', TOK(ADD(A('lo'), B.num(2)))));
    const argLo = () => ADD(A('lo'), B.num(4));
    const argHi = () => SUB(A('hi'), B.num(1));
    const saveList = () => callExisting('assign %s %s %s', [TOK(A('lo')), B.VAR('lnew'), B.txt('L')]);
    const retNone = () => [iSet('ev', B.txt('')), iSet('evtype', B.txt('S'))];
    // append
    body.push(iIf(iCmp('equals', B.VAR('lmeth'), B.txt('append')), [
      callExisting('eval %s %s', [argLo(), argHi()]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(iCmp('equals', B.VAR('evtype'), B.txt('L')), [fail('TypeError: nested lists are not supported')]),
      iSet('lnew', JOIN(B.VAR('xa'), JOIN(SEPV(), JOIN(B.VAR('evtype'), B.VAR('ev'))))),
      saveList()
    ].concat(retNone())));
    // extend
    body.push(iIf(iCmp('equals', B.VAR('lmeth'), B.txt('extend')), [
      callExisting('eval %s %s', [argLo(), argHi()]),
      iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]),
      iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('L'))), [fail('TypeError: extend() requires a list')]),
      iSet('lnew', JOIN(B.VAR('xa'), B.VAR('ev'))),
      saveList()
    ].concat(retNone())));
    // clear
    body.push(iIf(iCmp('equals', B.VAR('lmeth'), B.txt('clear')), [
      iSet('lnew', B.txt('')),
      saveList()
    ].concat(retNone())));
    // pop
    const lastScan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lx'), LEN(B.VAR('xa')))) } });
    B.sub('Interpreter', lastScan, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', LET(B.VAR('lx'), B.VAR('xa')), SEPV()), [iSet('llast', B.VAR('lx'))]),
      iChg('lx', B.num(1))
    ]));
    body.push(iIf(iCmp('equals', B.VAR('lmeth'), B.txt('pop')), [
      callExisting('listlen %s', [B.VAR('xa')]),
      iSet('ln', B.VAR('ev')),
      iIf(iCmp('equals', B.VAR('ln'), B.num(0)), [fail('IndexError: pop from empty list')]),
      callExisting('listitem %s %s', [B.VAR('xa'), B.VAR('ln')]),
      iSet('lval', B.VAR('ev')),
      iSet('ltyp', B.VAR('evtype')),
      iSet('llast', B.num(0)),
      iSet('lx', B.num(1)),
      lastScan,
      callExisting('substr %s %s %s', [B.VAR('xa'), B.num(1), SUB(B.VAR('llast'), B.num(1))]),
      iSet('lnew', B.VAR('ev')),
      saveList(),
      iSet('ev', B.VAR('lval')),
      iSet('evtype', B.VAR('ltyp'))
    ]));
    // anything else
    const known = OR(OR(iCmp('equals', B.VAR('lmeth'), B.txt('append')), iCmp('equals', B.VAR('lmeth'), B.txt('extend'))),
                     OR(iCmp('equals', B.VAR('lmeth'), B.txt('pop')), iCmp('equals', B.VAR('lmeth'), B.txt('clear'))));
    body.push(iIf(NOT(known), [callExisting('fail %s', [JOIN(B.txt('AttributeError: list has no method '), B.VAR('lmeth'))])]));
    return body;
  });

  // ---- 3) eval: route  name.method(...)  to methodcall ----
  {
    const evalDef = findDef('Interpreter', 'eval %s %s');
    const igCall = findIn(evalDef, (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'indexget %s %s');
    if (!igCall) throw new Error('eval: indexget dispatch not found');
    const idxIf = interp.blocks[igCall].parent;
    const litIf = interp.blocks[idxIf].parent;
    const holderId = interp.blocks[litIf].parent;
    const lo = () => B.argReporter('Interpreter', 'lo'), hi = () => B.argReporter('Interpreter', 'hi');
    const methIf = iIfElse(AND(iCmp('equals', TOK(ADD(lo(), B.num(1))), B.txt('.')), iCmp('equals', TOK(hi()), B.txt(')'))),
      [callExisting('methodcall %s %s', [lo(), hi()])],
      [litIf]);
    setSlot(holderId, litIf, methIf);
    interp.blocks[litIf].parent = methIf;
    console.log('[patch14.3] method dispatch installed');
  }
  console.log('[patch14] done');
})();

relinkAfterLists();


// ============ PATCH 15: a[i] = v (list element assignment) ============
(function patchIndexAssign() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LET = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
  const TOK = (i) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const KIND = (i) => I('data_itemoflist', { fields: B.LISTF('Kind'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const SEPV = () => B.VAR('lsep');
  const iIf = (c, ids) => { const id = I('control_if', { inputs: { CONDITION: B.BOOL(c) } }); B.sub('Interpreter', id, 'SUBSTACK', B.chain('Interpreter', ids)); return id; };
  function callExisting(proccode, args) {
    const t = B.T['Interpreter'];
    const defId = findDef('Interpreter', proccode);
    const proto = t.blocks[t.blocks[defId].inputs.custom_block[1]];
    const argIds = JSON.parse(proto.mutation.argumentids);
    const inputs = {};
    for (let i = 0; i < argIds.length; i++) inputs[argIds[i]] = B.REP(args[i], [4, '0']);
    return I('procedures_call', { inputs, mutation: { tagName: 'mutation', children: [], proccode: proccode, argumentids: proto.mutation.argumentids, warp: 'true' } });
  }
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];
  ['lsp', 'ldepth', 'lend'].forEach(n => B.addVar('Interpreter', n, '0'));
  function walkChain(startId, visit) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = interp.blocks[id];
      if (!b) continue;
      visit(b, id);
      if (b.next) stack.push(b.next);
      for (const v of Object.values(b.inputs || {})) {
        if (!Array.isArray(v)) continue;
        for (let i = 1; i < v.length; i++) if (typeof v[i] === 'string') stack.push(v[i]);
      }
    }
  }
  function findIn(defId, pred) { let hit = null; walkChain(interp.blocks[defId].next, (b, id) => { if (hit === null && pred(b, id)) hit = id; }); return hit; }
  function litOf(inp) { return (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1].length === 2 && typeof inp[1][1] === 'string') ? inp[1][1] : null; }
  function isVar(inp, name) { return Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === name; }
  function insertBefore(targetId, newId) {
    const blk = interp.blocks[targetId];
    const pid = blk.parent;
    const p = pid ? interp.blocks[pid] : null;
    if (!p || p.next !== targetId) throw new Error('insertBefore: ' + targetId + ' is not in a plain chain');
    p.next = newId; interp.blocks[newId].parent = pid;
    interp.blocks[newId].next = targetId; blk.parent = newId;
  }
  function mk(name, args, build) {
    const proc = B.makeProcedure('Interpreter', name, args, true);
    const A = (n) => B.argReporter('Interpreter', n);
    const first = B.chain('Interpreter', build(A, proc));
    interp.blocks[proc.defId].next = first;
    interp.blocks[first].parent = proc.defId;
    return proc;
  }

  // ---- indexset lo hi : parse  name[ idx ] = value  and rewrite the encoded list ----
  mk('indexset %s %s', ['lo', 'hi'], (A) => {
    const body = [];
    const scan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lx'), A('hi'))) } });
    B.sub('Interpreter', scan, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', TOK(B.VAR('lx')), B.txt('[')), [iChg('ldepth', B.num(1))]),
      iIf(iCmp('equals', TOK(B.VAR('lx')), B.txt(']')), [
        iChg('ldepth', B.num(-1)),
        iIf(AND(iCmp('equals', B.VAR('ldepth'), B.num(0)), iCmp('equals', B.VAR('lsp'), B.num(0))), [iSet('lsp', B.VAR('lx'))])
      ]),
      iChg('lx', B.num(1))
    ]));
    body.push(iSet('ldepth', B.num(0)));
    body.push(iSet('lsp', B.num(0)));
    body.push(iSet('lx', ADD(A('lo'), B.num(1))));   // start on the [ so the depth is balanced
    body.push(scan);
    body.push(iIf(iCmp('equals', B.VAR('lsp'), B.num(0)), [fail('SyntaxError: expected ] in index assignment')]));
    body.push(iIf(NOT(iCmp('equals', TOK(ADD(B.VAR('lsp'), B.num(1))), B.txt('='))), [fail('SyntaxError: expected = after ]')]));
    // receiver
    body.push(callExisting('eval %s %s', [A('lo'), A('lo')]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iSet('xa', B.VAR('ev')));
    body.push(iSet('xb', B.VAR('evtype')));
    body.push(iIf(NOT(iCmp('equals', B.VAR('xb'), B.txt('L'))), [fail('TypeError: index assignment needs a list')]));
    // index
    body.push(callExisting('eval %s %s', [ADD(A('lo'), B.num(2)), SUB(B.VAR('lsp'), B.num(1))]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: list index must be an integer')]));
    body.push(iSet('lidx', B.VAR('ev')));
    // value
    body.push(callExisting('eval %s %s', [ADD(B.VAR('lsp'), B.num(2)), A('hi')]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iIf(iCmp('equals', B.VAR('evtype'), B.txt('L')), [fail('TypeError: nested lists are not supported')]));
    body.push(iSet('lval', B.VAR('ev')));
    body.push(iSet('ltyp', B.VAR('evtype')));
    // bounds
    body.push(callExisting('listlen %s', [B.VAR('xa')]));
    body.push(iSet('ln', B.VAR('ev')));
    body.push(iIf(iCmp('lt', B.VAR('lidx'), B.num(0)), [iChg('lidx', B.VAR('ln'))]));
    body.push(iIf(OR(iCmp('lt', B.VAR('lidx'), B.num(0)), NOT(iCmp('lt', B.VAR('lidx'), B.VAR('ln')))), [fail('IndexError: list assignment index out of range')]));
    // boundaries of the old element
    const bounds = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lx'), LEN(B.VAR('xa')))) } });
    B.sub('Interpreter', bounds, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', LET(B.VAR('lx'), B.VAR('xa')), SEPV()), [
        iChg('lcount', B.num(1)),
        iIf(iCmp('equals', B.VAR('lcount'), ADD(B.VAR('lidx'), B.num(1))), [iSet('lstart', B.VAR('lx'))]),
        iIf(iCmp('equals', B.VAR('lcount'), ADD(B.VAR('lidx'), B.num(2))), [iSet('lend', B.VAR('lx'))])
      ]),
      iChg('lx', B.num(1))
    ]));
    body.push(iSet('lcount', B.num(0)));
    body.push(iSet('lstart', B.num(0)));
    body.push(iSet('lend', B.num(0)));
    body.push(iSet('lx', B.num(1)));
    body.push(bounds);
    body.push(iIf(iCmp('equals', B.VAR('lend'), B.num(0)), [iSet('lend', ADD(LEN(B.VAR('xa')), B.num(1)))]));
    // rewrite: left + sep + type + value + right
    body.push(callExisting('substr %s %s %s', [B.VAR('xa'), B.num(1), SUB(B.VAR('lstart'), B.num(1))]));
    body.push(iSet('lnew', B.VAR('ev')));
    body.push(iSet('lnew', JOIN(B.VAR('lnew'), JOIN(SEPV(), JOIN(B.VAR('ltyp'), B.VAR('lval'))))));
    body.push(callExisting('substr %s %s %s', [B.VAR('xa'), B.VAR('lend'), LEN(B.VAR('xa'))]));
    body.push(iSet('lnew', JOIN(B.VAR('lnew'), B.VAR('ev'))));
    body.push(callExisting('assign %s %s %s', [TOK(A('lo')), B.VAR('lnew'), B.txt('L')]));
    body.push(iSet('ev', B.VAR('lval')));
    body.push(iSet('evtype', B.VAR('ltyp')));
    return body;
  });

  // ---- execute:  name[ ... ] = ...  ----
  {
    const executeDef = findDef('Interpreter', 'execute');
    const failSite = findIn(executeDef, (b) => b.opcode === 'procedures_call' && b.mutation.proccode === 'fail %s' &&
      (litOf(Object.values(b.inputs)[0]) || '').indexOf('unsupported statement') >= 0);
    if (!failSite) throw new Error('execute: unsupported statement site not found');
    let guard = interp.blocks[failSite].parent;
    while (guard && !(interp.blocks[guard].opcode === 'control_if' && interp.blocks[guard].inputs.CONDITION &&
      interp.blocks[guard].inputs.CONDITION[1] && interp.blocks[guard].inputs.CONDITION[1][1] === undefined)) guard = interp.blocks[guard].parent;
    // the guard is the if whose condition is  pending == 0
    let g = interp.blocks[failSite].parent;
    let guardIf = null;
    while (g) {
      const b = interp.blocks[g];
      if (b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1]) {
        const c = interp.blocks[b.inputs.CONDITION[1]];
        if (c && c.opcode === 'operator_equals' && isVar(c.inputs.OPERAND1, 'pending') && litOf(c.inputs.OPERAND2) === '0') { guardIf = g; break; }
      }
      g = b.parent;
    }
    if (!guardIf) throw new Error('execute: pending guard not found');
    const cond = AND(iCmp('equals', KIND(B.num(1)), B.txt('I')), iCmp('equals', TOK(B.num(2)), B.txt('[')));
    const branch = iIf(cond, [callExisting('indexset %s %s', [B.num(1), B.VAR('count')]), iSet('pending', B.num(1))]);
    insertBefore(guardIf, branch);
    console.log('[patch15] list element assignment installed');
  }
  console.log('[patch15] done');
})();

relinkAfterLists();


// ============ PATCH 16: del a[i] ============
(function patchIndexDel() {
  B.setCtx('Interpreter');
  const I = (op, opts) => B.B('Interpreter', op, opts);
  const iSet = (n, v) => I('data_setvariableto', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iChg = (n, v) => I('data_changevariableby', { fields: B.VARF(n), inputs: { VALUE: B.REP(v, [4, '0']) } });
  const iCmp = (op, a, b) => I('operator_' + op, { inputs: { OPERAND1: B.REP(a, [4, '0']), OPERAND2: B.REP(b, [4, '0']) } });
  const AND = (a, b) => I('operator_and', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const OR = (a, b) => I('operator_or', { inputs: { OPERAND1: B.BOOL(a), OPERAND2: B.BOOL(b) } });
  const NOT = (a) => I('operator_not', { inputs: { OPERAND: B.BOOL(a) } });
  const JOIN = (a, b) => I('operator_join', { inputs: { STRING1: B.REP(a, [10, '']), STRING2: B.REP(b, [10, '']) } });
  const LEN = (s) => I('operator_length', { inputs: { STRING: B.REP(s, [10, '']) } });
  const ADD = (a, b) => I('operator_add', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const SUB = (a, b) => I('operator_subtract', { inputs: { NUM1: B.REP(a, [4, '0']), NUM2: B.REP(b, [4, '0']) } });
  const LET = (i, s) => I('operator_letter_of', { inputs: { LETTER: B.REP(i, [4, '0']), STRING: B.REP(s, [10, '']) } });
  const TOK = (i) => I('data_itemoflist', { fields: B.LISTF('Tok'), inputs: { INDEX: B.REP(i, [4, '0']) } });
  const SEPV = () => B.VAR('lsep');
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
  const fail = (m) => callExisting('fail %s', [B.txt(m)]);
  const STOP = () => I('control_stop', { fields: { STOP_OPTION: ['this script', null] }, mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
  const interp = B.T['Interpreter'];
  function walkChain(startId, visit) {
    const seen = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const b = interp.blocks[id];
      if (!b) continue;
      visit(b, id);
      if (b.next) stack.push(b.next);
      for (const v of Object.values(b.inputs || {})) {
        if (!Array.isArray(v)) continue;
        for (let i = 1; i < v.length; i++) if (typeof v[i] === 'string') stack.push(v[i]);
      }
    }
  }
  function findIn(defId, pred) { let hit = null; walkChain(interp.blocks[defId].next, (b, id) => { if (hit === null && pred(b, id)) hit = id; }); return hit; }
  function litOf(inp) { return (Array.isArray(inp) && Array.isArray(inp[1]) && inp[1].length === 2 && typeof inp[1][1] === 'string') ? inp[1][1] : null; }
  function isVar(inp, name) { return Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][0] === 12 && inp[1][1] === name; }
  function insertBefore(targetId, newId) {
    const blk = interp.blocks[targetId];
    const pid = blk.parent;
    const p = pid ? interp.blocks[pid] : null;
    if (!p || p.next !== targetId) throw new Error('insertBefore: ' + targetId + ' is not in a plain chain');
    p.next = newId; interp.blocks[newId].parent = pid;
    interp.blocks[newId].next = targetId; blk.parent = newId;
  }
  function mk(name, args, build) {
    const proc = B.makeProcedure('Interpreter', name, args, true);
    const A = (n) => B.argReporter('Interpreter', n);
    const first = B.chain('Interpreter', build(A, proc));
    interp.blocks[proc.defId].next = first;
    interp.blocks[first].parent = proc.defId;
    return proc;
  }

  // ---- indexdel lo hi :  del name[ idx ] ----
  mk('indexdel %s %s', ['lo', 'hi'], (A) => {
    const body = [];
    const scan = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lx'), A('hi'))) } });
    B.sub('Interpreter', scan, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', TOK(B.VAR('lx')), B.txt('[')), [iChg('ldepth', B.num(1))]),
      iIf(iCmp('equals', TOK(B.VAR('lx')), B.txt(']')), [
        iChg('ldepth', B.num(-1)),
        iIf(AND(iCmp('equals', B.VAR('ldepth'), B.num(0)), iCmp('equals', B.VAR('lsp'), B.num(0))), [iSet('lsp', B.VAR('lx'))])
      ]),
      iChg('lx', B.num(1))
    ]));
    body.push(iSet('ldepth', B.num(0)));
    body.push(iSet('lsp', B.num(0)));
    body.push(iSet('lx', ADD(A('lo'), B.num(2))));
    body.push(scan);
    body.push(iIf(iCmp('equals', B.VAR('lsp'), B.num(0)), [fail('SyntaxError: expected ] after del')]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('lsp'), A('hi'))), [fail('SyntaxError: unexpected tokens after ]')]));
    // receiver
    body.push(callExisting('eval %s %s', [ADD(A('lo'), B.num(1)), ADD(A('lo'), B.num(1))]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iSet('xa', B.VAR('ev')));
    body.push(iSet('xb', B.VAR('evtype')));
    body.push(iIf(NOT(iCmp('equals', B.VAR('xb'), B.txt('L'))), [fail('TypeError: del needs a list')]));
    // index
    body.push(callExisting('eval %s %s', [ADD(A('lo'), B.num(3)), SUB(B.VAR('lsp'), B.num(1))]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('error'), B.txt(''))), [STOP()]));
    body.push(iIf(NOT(iCmp('equals', B.VAR('evtype'), B.txt('N'))), [fail('TypeError: list index must be an integer')]));
    body.push(iSet('lidx', B.VAR('ev')));
    // bounds
    body.push(callExisting('listlen %s', [B.VAR('xa')]));
    body.push(iSet('ln', B.VAR('ev')));
    body.push(iIf(iCmp('lt', B.VAR('lidx'), B.num(0)), [iChg('lidx', B.VAR('ln'))]));
    body.push(iIf(OR(iCmp('lt', B.VAR('lidx'), B.num(0)), NOT(iCmp('lt', B.VAR('lidx'), B.VAR('ln')))), [fail('IndexError: list index out of range')]));
    // boundaries
    const bounds = I('control_repeat_until', { inputs: { CONDITION: B.BOOL(iCmp('gt', B.VAR('lx'), LEN(B.VAR('xa')))) } });
    B.sub('Interpreter', bounds, 'SUBSTACK', B.chain('Interpreter', [
      iIf(iCmp('equals', LET(B.VAR('lx'), B.VAR('xa')), SEPV()), [
        iChg('lcount', B.num(1)),
        iIf(iCmp('equals', B.VAR('lcount'), ADD(B.VAR('lidx'), B.num(1))), [iSet('lstart', B.VAR('lx'))]),
        iIf(iCmp('equals', B.VAR('lcount'), ADD(B.VAR('lidx'), B.num(2))), [iSet('lend', B.VAR('lx'))])
      ]),
      iChg('lx', B.num(1))
    ]));
    body.push(iSet('lcount', B.num(0)));
    body.push(iSet('lstart', B.num(0)));
    body.push(iSet('lend', B.num(0)));
    body.push(iSet('lx', B.num(1)));
    body.push(bounds);
    body.push(iIf(iCmp('equals', B.VAR('lend'), B.num(0)), [iSet('lend', ADD(LEN(B.VAR('xa')), B.num(1)))]));
    // new = left + right
    body.push(callExisting('substr %s %s %s', [B.VAR('xa'), B.num(1), SUB(B.VAR('lstart'), B.num(1))]));
    body.push(iSet('lnew', B.VAR('ev')));
    body.push(callExisting('substr %s %s %s', [B.VAR('xa'), B.VAR('lend'), LEN(B.VAR('xa'))]));
    body.push(iSet('lnew', JOIN(B.VAR('lnew'), B.VAR('ev'))));
    body.push(callExisting('assign %s %s %s', [TOK(ADD(A('lo'), B.num(1))), B.VAR('lnew'), B.txt('L')]));
    body.push(iSet('ev', B.txt('')));
    body.push(iSet('evtype', B.txt('S')));
    return body;
  });

  // ---- execute:  del name[ ... ]  goes before the plain del branch ----
  {
    const executeDef = findDef('Interpreter', 'execute');
    const delIf = findIn(executeDef, (b) => b.opcode === 'control_if' && b.inputs.CONDITION && b.inputs.CONDITION[1] &&
      (function () {
        const c = interp.blocks[b.inputs.CONDITION[1]];
        return !!(c && c.opcode === 'operator_equals' && isVar(c.inputs.OPERAND1, 'head') && litOf(c.inputs.OPERAND2) === 'del');
      })());
    if (!delIf) throw new Error('execute: del branch not found');
    // execute branches are a plain chain of sibling ifs: a new sibling would run *in addition* to the
    // original del branch. Wrap the original body instead.
    const oldSub = interp.blocks[delIf].inputs.SUBSTACK[1];
    const newIf = iIfElse(iCmp('equals', TOK(B.num(3)), B.txt('[')),
      [callExisting('indexdel %s %s', [B.num(1), B.VAR('count')]), iSet('pending', B.num(1))],
      [oldSub]);
    interp.blocks[oldSub].parent = newIf;
    interp.blocks[delIf].inputs.SUBSTACK = [2, newIf];
    interp.blocks[newIf].parent = delIf;
    console.log('[patch16] del a[i] installed');
  }
  console.log('[patch16] done');
})();

relinkAfterLists();

// ---- write ----
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(project));
const outEntries = entries.map(e => e.name === 'project.json' ? { name: e.name, data: Buffer.from(JSON.stringify(project), 'utf8') } : e);
zipWrite(outEntries, OUT_SB3);
console.log('wrote', OUT_SB3, JSON.stringify(project).length, 'bytes json');
