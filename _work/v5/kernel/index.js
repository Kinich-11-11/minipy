'use strict';
/**
 * v5 kernel assembly.  Every procedure is a LEAF (never calls another custom
 * block); only the RUN / flag hats glue procedures together.
 */
const { E, S } = require('../dsl.js');
const L = require('./lib.js');
const lex = require('./lex.js');
const parse = require('./parse.js');
const comp = require('./compiler.js');
const vm = require('./vm.js');

// ---- Interpreter-private storage (all kernel state lives in lists) ----
const LISTS = [
  // code image
  'Iop', 'Ia', 'Ib', 'Iline', 'Kval',
  // runtime stacks
  'Stk', 'FrKind', 'FrRet', 'FrEnv', 'FrBase', 'FrTop',
  // binding chains / maps
  'BindName', 'BindVal', 'BindNext', 'MapHead', 'MapParent', 'MapKind',
  // symbol tables
  'FnKind', 'FnName', 'FnArity', 'FnParam', 'FnBody', 'FnEnv', 'FnFlags',
  'ClName', 'ClBase', 'ClMap', 'InClass', 'InMap',
  // heap
  'LStart', 'LCount', 'LCap', 'LArr',
  // lexer / parser / compiler working space
  'TokT', 'TokV', 'TokL', 'IndStk',
  'NdK', 'NdA', 'NdS', 'NdN', 'NdC',
  'NdL',
  'PatchSite', 'PatchSlot',
  // parser working space
  'Pv', 'Pk', 'Po', 'PcT', 'PcA', 'PcB', 'PcD', 'PcE', 'SuN', 'BlN', 'BlS', 'BlK',
  'CtK', 'CtA', 'CtB', 'CtC', 'PdL', 'PdS', 'PdF', 'Lpc', 'LpCon', 'LpBrk', 'LpExt',
  // vm
  'FrAux', 'FrGlob', 'HdFr', 'HdSt', 'HdPc', 'Big', 'WkKind', 'WkVal', 'WB', 'PosQ', 'JsSt', 'JsKind', 'JsKey',
  'NlFr', 'NlName', 'CSst', 'GnFid', 'GnPc', 'GnEnv', 'GnDone', 'GnSp', 'GnStk', 'NdG', 'Dky',
];
// scratch registers (leaf procedures may use these as locals)
const VARS = [
  'pc', 'sp', 'frTop', 'tk', 'ip', 'err', 'hTop', 'bTop',
  'li', 'le', 'ln', 'i', 'j', 'c0', 'c1', 'nb', 'sg', 'tx', 'brk', 'dot', 'q',
  'ind', 'cur', 'sk', 'n0', 'n1', 'n2', 'ti', 'c9', 'n9',
  'tmp', 'tmp2', 't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
  'a0', 'a1', 'a2', 'a3', 'b0', 'b1', 'b2', 'b3',
  'nTop', 'tp', 'pvSp', 'pkSp', 'poSp', 'pcSp', 'suSp', 'blSp',
  'stK', 'stO', 'stS', 'stL', 'stC', 'stN', 'ps', 'want', 'stop', 'noIn',
  'ct', 'cn', 'ho', 'ncap', 'nst', 'kws', 'o0', 'o1', 'l0', 'r0', 'v0', 'k0',
  'pr0', 'pc0', 'noneNd', 'noneNd2', 'rootNd',
  // STEP state: stepgo=1 means "a program is parked mid-run, resume it";
  // stepln is the source line the current step started on.
  'stepgo', 'stepln',
];

function build(em, project) {
  for (const n of VARS) em.addVar('Interpreter', n, 0);
  for (const n of LISTS) em.addList('Interpreter', n, []);

  // ---------------- procedures ----------------
  em.defineProc('Interpreter', 'reset_vm', [], () => [
    S.set('pc', E.num(0)), S.set('sp', E.num(0)), S.set('frTop', E.num(0)), S.set('tk', E.num(0)),
    S.set('ip', E.num(0)), S.set('err', E.str('')), S.set('hTop', E.num(0)), S.set('bTop', E.num(0)),
    ...LISTS.map((n) => S.ldelall(n)),
  ], true);

  em.defineProc('Interpreter', 'print_line', ['msg'], () => printLine(em), true);

  em.defineProc('Interpreter', 'dump_tok', [], () => [
    S.set('i', E.num(1)),
    S.Repeat(E.len('TokT'), [
      ...L.outLine(E.join(E.item('TokT', E.var('i')), E.join(E.str(' '),
        E.join(E.item('TokV', E.var('i')), E.join(E.str(' @'), E.item('TokL', E.var('i'))))))),
      S.chg('i', E.num(1)),
    ]),
  ], true);

  em.defineProc('Interpreter', 'dump_ast', [], () => [
    S.set('i', E.num(1)),
    S.Repeat(E.len('NdK'), [
      S.set('tx', E.join(E.item('NdK', E.var('i')), E.join(E.str(' '), E.item('NdA', E.var('i'))))),
      S.set('tx', E.join(E.var('tx'), E.join(E.str(' ('), E.join(E.item('NdN', E.var('i')), E.str('):'))))),
      S.set('j', E.num(1)),
      S.Repeat(E.item('NdN', E.var('i')), [
        S.set('tx', E.join(E.var('tx'), E.join(E.str(' '),
          E.item('NdC', E.add(E.item('NdS', E.var('i')), E.sub(E.var('j'), E.num(1))))))),
        S.chg('j', E.num(1)),
      ]),
      ...L.outLine(E.var('tx')),
      S.chg('i', E.num(1)),
    ]),
    ...L.outLine(E.join(E.str('--- root suite '), E.item('NdA', E.var('rootNd')))),
  ], true);

  em.defineProc('Interpreter', 'dump_code', [], () => [
    S.set('i', E.num(1)),
    S.Repeat(E.len('Iop'), [
      S.set('tx', E.join(E.item('Iop', E.var('i')), E.join(E.str(' '), E.item('Ia', E.var('i'))))),
      S.set('tx', E.join(E.var('tx'), E.join(E.str(' '), E.item('Ib', E.var('i'))))),
      ...L.outLine(E.var('tx')),
      S.chg('i', E.num(1)),
    ]),
    ...L.outLine(E.join(E.str('--- consts: '), E.len('Kval'))),
  ], true);

  lex.build(em);
  parse.setup(em);
  comp.setup(em);
  vm.setup(em);

  // ---------------- hats ----------------
  em.hat('Interpreter', 'event_whenflagclicked', {}, [
    S.raw('looks_hide', [], {}),
    S.Call('reset_vm', []),
  ]);

  em.hat('Interpreter', 'event_whenbroadcastreceived', { BROADCAST_OPTION: 'HALT' }, [
    S.raw('control_stop', [], { STOP_OPTION: 'other scripts in sprite' }),
    S.set('running', E.num(0)),
    S.set('busy', E.num(0)),
    // drop any parked step state: STOP means the next STEP starts from line 1
    S.set('stepgo', E.num(0)),
    S.set('dirty', E.num(1)),
  ]);

  em.hat('Interpreter', 'event_whenbroadcastreceived', { BROADCAST_OPTION: 'RUN' }, [
    S.set('error', E.str('')),
    S.set('status', E.str('Running')),
    // On a STEP resume pc points at the parked instruction and must survive; only a
    // fresh start may zero it (and the step counter).
    S.If(E.and(E.eq(E.var('mode'), E.num(1)), E.eq(E.var('stepgo'), E.num(1))), [], [
      S.set('steps', E.num(0)),
      S.set('pc', E.num(0)),
    ]),
    // debugger: `#!bp <pc>` stops the VM before executing that instruction
    S.set('bp', E.num(0)), S.set('bphit', E.num(0)),
    S.If(E.eq(E.item('Code', E.num(1)), E.str('#!bp')), [
      S.set('bp', E.item('Code', E.num(2))),
      S.set('status', E.join(E.str('Breakpoint armed at '), E.var('bp'))),
    ]),
    // A STEP that continues an already-parked program (stepgo=1) must NOT recompile
    // or clear the console -- that would restart from line 1 and re-print everything.
    // Any other entry (RUN, or the first STEP) is a fresh start.
    S.If(E.and(E.eq(E.var('mode'), E.num(1)), E.eq(E.var('stepgo'), E.num(1))), [
      S.Call('vm_run', []),
    ], [
      S.set('stepgo', E.num(0)),
      S.ldelall('Output'), S.ldelall('Names'), S.ldelall('Values'), S.ldelall('Types'),
      S.set('outpage', E.num(1)),
      S.set('varpage', E.num(1)),
      S.Call('reset_vm', []),
      S.Call('lex_all', []),
      S.If(E.eq(E.var('err'), E.str('')), [S.Call('parse_all', [])]),
      S.If(E.eq(E.var('err'), E.str('')), [S.Call('compile_all', [])]),
      S.If(E.eq(E.var('err'), E.str('')), [
        S.If(E.eq(E.item('Code', E.num(1)), E.str('#!dump')), [
          S.If(E.eq(E.item('Code', E.num(2)), E.str('#!tok')), [S.Call('dump_tok', [])]),
          S.If(E.eq(E.item('Code', E.num(2)), E.str('#!code')), [], [S.Call('dump_ast', [])]),
          S.Call('dump_code', []),
        ], [
          S.Call('init_vm', []),
          S.Call('vm_run', []),
        ]),
      ]),
    ]),
    S.If(E.not(E.eq(E.var('err'), E.str(''))), [
      // failAt parks the source line in pc, so errors can name the line they came from
      S.If(E.gt(E.var('pc'), E.num(0)), [
        S.Call('print_line', [E.join(E.str('Error: Line '), E.join(E.var('pc'), E.join(E.str(': '), E.var('err'))))]),
      ], [
        S.Call('print_line', [E.join(E.str('Error: '), E.var('err'))]),
      ]),
      S.set('error', E.var('err')),
      S.set('status', E.str('Error / see console')),
    ], [
      S.If(E.eq(E.item('Code', E.num(1)), E.str('#!dump')), [], [
        // a step pause (stepgo=1) keeps its own "Step / line N" status
        S.If(E.and(E.eq(E.var('bphit'), E.num(0)), E.not(E.eq(E.var('stepgo'), E.num(1)))),
          [S.set('status', E.str('Finished'))]),
      ]),
    ]),
    S.set('running', E.num(0)),
    S.set('busy', E.num(0)),
    S.set('dirty', E.num(1)),
  ]);
}

function printLine(em) {
  const msg = em.arg('msg');
  return [
    S.set('tmp', E.str('')),
    S.set('ti', E.num(1)),
    S.Repeat(E.slen(msg), [
      S.set('tmp', E.join(E.var('tmp'), E.letter(E.var('ti'), msg))),
      S.If(E.eq(E.slen(E.var('tmp')), E.num(30)), [
        S.ladd('Output', E.var('tmp')),
        S.set('tmp', E.str('')),
      ]),
      S.chg('ti', E.num(1)),
    ]),
    S.If(E.or(E.not(E.eq(E.var('tmp'), E.str(''))), E.eq(E.slen(msg), E.num(0))), [
      S.ladd('Output', E.var('tmp')),
    ]),
    S.While(E.gt(E.len('Output'), E.num(300)), [S.ldel('Output', E.num(1))]),
    // follow the tail so the newest line is always on screen (pane shows 9 rows)
    S.If(E.gt(E.len('Output'), E.num(9)),
      [S.set('outpage', E.sub(E.len('Output'), E.num(8)))],
      [S.set('outpage', E.num(1))]),
    S.set('dirty', E.num(1)),
  ];
}

module.exports = { build, LISTS, VARS, printLine };
