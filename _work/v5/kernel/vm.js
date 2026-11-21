'use strict';
/**
 * v5 VM - single fetch/decode/execute loop, leaf procedure.
 * All kernel state lives in lists addressed by manual pointers.
 */
const { E, S } = require('../dsl.js');
const L = require('./lib.js');

const key = (n) => n + '|' + n.split('').map((c) => (/[A-Z]/.test(c) ? '1' : '0')).join('');
const sortKeyName = () => key('__sortpairs');
const CHARLIST = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
const BUILTINS = ['print', 'len', 'range', 'int', 'float', 'str', 'bool', 'type', 'abs',
  'max', 'min', 'sum', 'pow', 'round', 'ord', 'chr', 'sorted', 'list', 'repr',
  'any', 'all', 'enumerate', 'zip', '__sortpairs', 'divmod', 'input'];
const EXCNAMES = ['Exception', 'ZeroDivisionError', 'ValueError', 'TypeError', 'NameError',
  'IndexError', 'KeyError', 'AttributeError', 'SyntaxError', 'NotImplementedError',
  'AssertionError', 'StopIteration', 'RuntimeError'];

function build() {
  // ---------------- stack ----------------
  const vpush = (v) => [
    S.chg('sp', E.num(1)),
    S.If(E.gt(E.var('sp'), E.len('Stk')), [S.ladd('Stk', v)], [S.lset('Stk', E.var('sp'), v)]),
  ];
  const vpop = (dst) => [S.set(dst, E.item('Stk', E.var('sp'))), S.chg('sp', E.num(-1))];
  const truthOf = (v, dst) => [
    S.set(dst, E.num(0)),
    S.If(L.isNum(v), [
      S.If(E.not(E.eq(v, E.num(0))), [S.set(dst, E.num(1))]),
    ], [
      S.If(E.eq(E.letter(E.num(1), v), E.str('S')), [
        S.If(E.gt(E.slen(v), E.num(1)), [S.set(dst, E.num(1))]),
      ], [
        S.If(E.eq(E.letter(E.num(1), v), E.str('B')), [
          S.If(E.eq(E.letter(E.num(2), v), E.str('1')), [S.set(dst, E.num(1))]),
        ], [
          S.If(E.eq(E.letter(E.num(1), v), E.str('Z')), [], [
            S.If(E.or(E.eq(E.letter(E.num(1), v), E.str('L')), E.eq(E.letter(E.num(1), v), E.str('T'))), [
              ...L.payInto(v, 'tvo'),
              S.If(E.gt(E.item('LCount', E.var('tvo')), E.num(0)), [S.set(dst, E.num(1))]),
            ], [
              S.If(E.eq(E.letter(E.num(1), v), E.str('D')), [
                ...L.payInto(v, 'tvo'),
                S.If(E.gt(E.item('MapHead', E.var('tvo')), E.num(0)), [S.set(dst, E.num(1))]),
              ], [
                S.set(dst, E.num(1)),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ];
  // ---------------- heap ----------------
  const heapNew = (dst) => [
    S.chg('hTop', E.num(1)), S.set(dst, E.var('hTop')),
    ...L.setAt('LStart', E.var(dst), E.add(E.len('LArr'), E.num(1))),
    ...L.setAt('LCount', E.var(dst), E.num(0)),
    ...L.setAt('LCap', E.var(dst), E.num(0)),
  ];
  const heapEnsure = (obj, nExpr) => [
    S.If(E.gt(nExpr, E.item('LCap', obj)), [
      S.set('ncap', E.item('LCap', obj)),
      S.If(E.lt(E.var('ncap'), E.num(4)), [S.set('ncap', E.num(4))]),
      S.Until(E.ge(E.var('ncap'), nExpr), [S.set('ncap', E.mul(E.var('ncap'), E.num(2)))]),
      S.set('nst', E.add(E.len('LArr'), E.num(1))),
      S.set('hii', E.num(1)),
      S.Repeat(E.item('LCount', obj), [
        S.ladd('LArr', E.item('LArr', E.add(E.item('LStart', obj), E.sub(E.var('hii'), E.num(1))))),
        S.chg('hii', E.num(1)),
      ]),
      S.Repeat(E.sub(E.var('ncap'), E.item('LCount', obj)), [S.ladd('LArr', E.str(''))]),
      S.lset('LStart', obj, E.var('nst')),
      S.lset('LCap', obj, E.var('ncap')),
    ]),
  ];
  // in-place sort / reverse / index / count / remove / insert for heap lists
  const listSort = (obj) => [
    S.set('si', E.num(1)),
    S.Until(E.ge(E.var('si'), E.item('LCount', obj)), [
      S.set('sj', E.add(E.var('si'), E.num(1))),
      S.Until(E.gt(E.var('sj'), E.item('LCount', obj)), [
        ...cmpPair(heapGet(obj, E.var('si')), heapGet(obj, E.var('sj')), E.str('>'), 'sres'),
        S.If(E.eq(E.var('sres'), E.str('B1')), [
          S.set('sv1', heapGet(obj, E.var('si'))), S.set('sv2', heapGet(obj, E.var('sj'))),
          S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('si'), E.num(1))), E.var('sv2')),
          S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('sj'), E.num(1))), E.var('sv1')),
        ]),
        S.chg('sj', E.num(1)),
      ]),
      S.chg('si', E.num(1)),
    ]),
  ];
  const listFind = (obj, needle, dst) => [
    S.set(dst, E.num(-1)), S.set('fi', E.num(1)), S.set('ff', E.num(0)),
    S.Until(E.or(E.gt(E.var('fi'), E.item('LCount', obj)), E.eq(E.var('ff'), E.num(1))), [
      ...strEq(heapGet(obj, E.var('fi')), needle, 'se7'),
      S.If(E.eq(E.var('se7'), E.num(1)), [S.set(dst, E.sub(E.var('fi'), E.num(1))), S.set('ff', E.num(1))]),
      S.chg('fi', E.num(1)),
    ]),
  ];
  const listRemoveAt = (obj, ixExpr) => [
    S.set('ri', E.add(ixExpr, E.num(2))),
    S.Until(E.gt(E.var('ri'), E.item('LCount', obj)), [
      S.lset('LArr', E.add(E.item('LStart', obj), E.sub(E.var('ri'), E.num(2))), heapGet(obj, E.var('ri'))),
      S.chg('ri', E.num(1)),
    ]),
    S.lset('LCount', obj, E.sub(E.item('LCount', obj), E.num(1))),
  ];

  const heapPush = (obj, v) => [
    ...heapEnsure(obj, E.add(E.item('LCount', obj), E.num(1))),
    S.lset('LArr', E.add(E.item('LStart', obj), E.item('LCount', obj)), v),
    S.lset('LCount', obj, E.add(E.item('LCount', obj), E.num(1))),
  ];
  const heapGet = (obj, i) => E.item('LArr', E.add(E.item('LStart', obj), E.sub(i, E.num(1))));
  // ---------------- maps / bindings ----------------
  const mapNew = (dst, parent, kind) => [
    S.chg('mTop', E.num(1)), S.set(dst, E.var('mTop')),
    ...L.setAt('MapHead', E.var(dst), E.num(0)),
    ...L.setAt('MapParent', E.var(dst), parent),
    ...L.setAt('MapKind', E.var(dst), kind),
  ];
  const bindNew = (mapExpr, nameExpr, valExpr) => [
    S.chg('bTop', E.num(1)),
    ...L.setAt('BindName', E.var('bTop'), nameExpr),
    ...L.setAt('BindVal', E.var('bTop'), valExpr),
    ...L.setAt('BindNext', E.var('bTop'), E.item('MapHead', mapExpr)),
    ...L.setAt('MapHead', mapExpr, E.var('bTop')),
  ];
  const bindSet = (mapExpr, nameExpr, valExpr, foundDst) => [
    S.set('bm', mapExpr), S.set('bnm', nameExpr), S.set('bvl', valExpr), S.set(foundDst, E.num(0)),
    S.set('bk', E.item('MapHead', E.var('bm'))),
    S.Until(E.or(E.eq(E.var('bk'), E.num(0)), E.eq(E.var(foundDst), E.num(1))), [
      S.If(E.eq(E.item('BindName', E.var('bk')), E.var('bnm')), [
        S.lset('BindVal', E.var('bk'), E.var('bvl')), S.set(foundDst, E.num(1)),
      ]),
      S.set('bk', E.item('BindNext', E.var('bk'))),
    ]),
    S.If(E.eq(E.var(foundDst), E.num(0)), [...bindNew(E.var('bm'), E.var('bnm'), E.var('bvl'))]),
  ];
  const lookupIn = (mapExpr, nameExpr, dst) => [
    S.set('lm', mapExpr), S.set('lnm', nameExpr), S.set('lf', E.num(0)), S.set(dst, E.str('')),
    S.Until(E.or(E.eq(E.var('lm'), E.num(0)), E.eq(E.var('lf'), E.num(1))), [
      S.set('lb', E.item('MapHead', E.var('lm'))),
      S.Until(E.or(E.eq(E.var('lb'), E.num(0)), E.eq(E.var('lf'), E.num(1))), [
        S.If(E.eq(E.item('BindName', E.var('lb')), E.var('lnm')), [
          S.set(dst, E.item('BindVal', E.var('lb'))), S.set('lf', E.num(1)),
        ]),
        S.set('lb', E.item('BindNext', E.var('lb'))),
      ]),
      S.If(E.eq(E.var('lf'), E.num(0)), [S.set('lm', E.item('MapParent', E.var('lm')))]),
    ]),
  ];
  const lookup = (nameExpr) => [
    S.set('lkN', nameExpr), S.set('lkF', E.num(0)), S.set('lkV', E.str('')),
    S.set('lkM', E.item('FrEnv', E.var('frTop'))),
    S.Until(E.or(E.eq(E.var('lkM'), E.num(0)), E.eq(E.var('lkF'), E.num(1))), [
      S.set('lkB', E.item('MapHead', E.var('lkM'))),
      S.Until(E.or(E.eq(E.var('lkB'), E.num(0)), E.eq(E.var('lkF'), E.num(1))), [
        S.If(E.eq(E.item('BindName', E.var('lkB')), E.var('lkN')), [
          S.set('lkV', E.item('BindVal', E.var('lkB'))), S.set('lkF', E.num(1)),
        ]),
        S.set('lkB', E.item('BindNext', E.var('lkB'))),
      ]),
      S.If(E.eq(E.var('lkF'), E.num(0)), [S.set('lkM', E.item('MapParent', E.var('lkM')))]),
    ]),
  ];
  // ---------------- text ----------------
  const tostr1 = (srcExpr, dst) => [
    S.set('t1v', srcExpr), S.set(dst, E.str('')),
    S.If(L.isNum(E.var('t1v')), [S.set(dst, E.var('t1v'))], [
      S.set('t1g', E.letter(E.num(1), E.var('t1v'))),
      S.If(E.eq(E.var('t1g'), E.str('S')), [...L.payInto(E.var('t1v'), 't1p'),
        S.set(dst, E.join(E.str("'"), E.join(E.var('t1p'), E.str("'"))))]),
      S.If(E.eq(E.var('t1g'), E.str('B')), [
        S.set(dst, E.str('False')),
        S.If(E.eq(E.letter(E.num(2), E.var('t1v')), E.str('1')), [S.set(dst, E.str('True'))]),
      ]),
      S.If(E.eq(E.var('t1g'), E.str('Z')), [S.set(dst, E.str('None'))]),
      S.If(E.eq(E.var('t1g'), E.str('L')), [S.set(dst, E.str('[...]'))]),
      S.If(E.eq(E.var('t1g'), E.str('T')), [S.set(dst, E.str('(...)'))]),
      S.If(E.eq(E.var('t1g'), E.str('D')), [S.set(dst, E.str('{...}'))]),
      S.If(E.eq(E.var('t1g'), E.str('F')), [...L.payInto(E.var('t1v'), 't1f'),
        S.set(dst, E.join(E.str('<function '), E.join(E.item('FnName', E.var('t1f')), E.str('>'))))]),
      S.If(E.eq(E.var('t1g'), E.str('C')), [...L.payInto(E.var('t1v'), 't1f'),
        S.set(dst, E.join(E.str("<class '"), E.join(E.item('ClName', E.var('t1f')), E.str("'>"))))]),
      S.If(E.eq(E.var('t1g'), E.str('O')), [S.set(dst, E.str('<object>'))]),
      S.If(E.eq(E.var('t1g'), E.str('X')), [...xmsg(E.var('t1v'), 't1m'),
        S.If(E.eq(E.slen(E.var('t1m')), E.num(0)), [...xclass(E.var('t1v'), 't1c'), S.set('t1m', E.item('ClName', E.var('t1c')))]),
        S.set(dst, E.var('t1m'))]),
    ]),
  ];
  const floatRepr = (v, dst) => [
    S.set('nfx', v),
    S.set(dst, E.join(E.str(''), E.var('nfx'))),
    S.If(E.eq(E.mod(E.var('nfx'), E.num(1)), E.num(0)), [S.set(dst, E.join(E.var(dst), E.str('.0')))]),
  ];
  // ---------------- container rendering ----------------
  // The code generator cannot recurse, so rendering walks the value tree with an explicit
  // work stack: entries are pushed in reverse output order and popped from the top.
  //   WkKind 1 = literal text, 0 = value (strings quoted), 2 = top-level value (string bare)
  const render = (vExpr, dst, unquoteTop) => [
    S.ldelall('WkKind'), S.ldelall('WkVal'),
    S.ladd('WkKind', E.num(unquoteTop ? 2 : 0)), S.ladd('WkVal', vExpr),
    S.set(dst, E.str('')),
    S.set('jq', E.str("'")),
    S.If(E.eq(E.var('jmode'), E.num(1)), [S.set('jq', E.str('"'))]),
    S.Until(E.lt(E.len('WkKind'), E.num(1)), [
      S.set('wk', E.item('WkKind', E.len('WkKind'))),
      S.set('wv', E.item('WkVal', E.len('WkKind'))),
      S.ldel('WkKind', E.len('WkKind')), S.ldel('WkVal', E.len('WkVal')),
      S.If(E.eq(E.var('wk'), E.num(1)), [
        S.set(dst, E.join(E.var(dst), E.var('wv'))),
      ], [
        S.set('wtg', E.str('N')),
        S.If(E.not(L.isNum(E.var('wv'))), [S.set('wtg', E.letter(E.num(1), E.var('wv')))]),
        S.If(E.or(E.eq(E.var('wtg'), E.str('L')), E.eq(E.var('wtg'), E.str('T'))), [
          ...L.payInto(E.var('wv'), 'wlo'),
          S.set('wop', E.str('[')), S.set('wcl', E.str(']')),
          S.If(E.eq(E.var('wtg'), E.str('T')), [S.set('wop', E.str('(')), S.set('wcl', E.str(')'))]),
          S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.var('wcl')),
          S.set('wi', E.item('LCount', E.var('wlo'))),
          S.Until(E.lt(E.var('wi'), E.num(1)), [
            S.ladd('WkKind', E.num(0)), S.ladd('WkVal', heapGet(E.var('wlo'), E.var('wi'))),
            S.If(E.gt(E.var('wi'), E.num(1)), [S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str(', '))]),
            S.chg('wi', E.num(-1)),
          ]),
          S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.var('wop')),
        ], [
          S.If(E.eq(E.var('wtg'), E.str('D')), [
            ...L.payInto(E.var('wv'), 'wdo'),
            S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str('}')),
            S.ldelall('WB'),
            S.set('wi', E.item('MapHead', E.var('wdo'))),
            S.Until(E.lt(E.var('wi'), E.num(1)), [
              S.ladd('WB', E.var('wi')),
              S.set('wi', E.item('BindNext', E.var('wi'))),
            ]),
            S.set('wi', E.num(1)),
            S.Until(E.gt(E.var('wi'), E.len('WB')), [
              S.set('wb', E.item('WB', E.var('wi'))),
              S.ladd('WkKind', E.num(0)), S.ladd('WkVal', E.item('BindVal', E.var('wb'))),
              S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str(': ')),
              S.set('wkx', E.item('BindName', E.var('wb'))),
              S.set('wkt', E.str('')),
              S.If(E.eq(E.letter(E.num(2), E.var('wkx')), E.str('S')), [S.set('wkt', E.var('jq')), ...substrInto(E.var('wkx'), E.num(3), E.sub(E.slen(E.var('wkx')), E.num(2)), 'wkp'), S.set('wkt', E.join(E.var('wkt'), E.join(E.var('wkp'), E.var('jq'))))], [
                ...substrInto(E.var('wkx'), E.num(3), E.sub(E.slen(E.var('wkx')), E.num(2)), 'wkt'),
              ]),
              S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.var('wkt')),
              S.If(E.lt(E.var('wi'), E.len('WB')), [S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str(', '))]),
              S.chg('wi', E.num(1)),
            ]),
            S.ladd('WkKind', E.num(1)), S.ladd('WkVal', E.str('{')),
          ], [
            S.If(E.eq(E.var('wtg'), E.str('S')), [
              ...L.payInto(E.var('wv'), 'wsp'),
              S.If(E.eq(E.var('wk'), E.num(2)), [
                S.set(dst, E.join(E.var(dst), E.var('wsp'))),
              ], [
                S.set(dst, E.join(E.var(dst), E.join(E.var('jq'), E.join(E.var('wsp'), E.var('jq'))))),
              ]),
            ], [
              S.If(E.eq(E.var('jmode'), E.num(1)), [
                S.set('wsc', E.var('wv')),
                S.If(E.eq(E.var('wtg'), E.str('B')), [
                  S.set('wsc', E.str('false')),
                  S.If(E.eq(E.letter(E.num(2), E.var('wv')), E.str('1')), [S.set('wsc', E.str('true'))]),
                ]),
                S.If(E.eq(E.var('wtg'), E.str('Z')), [S.set('wsc', E.str('null'))]),
                S.set(dst, E.join(E.var(dst), E.var('wsc'))),
              ], [
                ...tostr1(E.var('wv'), 'wsc'),
                S.set(dst, E.join(E.var(dst), E.var('wsc'))),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ];

  // dict keys are stored as 'K' + tag + text so repr() can quote string keys
  const keyOf = (v, dst) => [
    S.set('kvv', v), S.set('ktg', E.str('N')),
    S.If(E.not(L.isNum(E.var('kvv'))), [S.set('ktg', E.letter(E.num(1), E.var('kvv')))]),
    ...tostr(E.var('kvv'), 'ktx'),
    S.set(dst, E.join(E.str('K'), E.join(E.var('ktg'), E.var('ktx')))),
  ];

  // str(x): numbers print as their text, everything else through the renderer with the
  // top-level string unquoted (str('a') == 'a' but str(['a']) == "['a']").
  const tostr = (srcExpr, dst) => [
    S.set('tsv', srcExpr),
    S.If(L.isNum(E.var('tsv')), [S.set(dst, E.var('tsv'))], [...render(E.var('tsv'), dst, true)]),
  ];
  const tostrDead = (srcExpr, dst) => [
    S.set('tsv', srcExpr), S.set(dst, E.str('')),
    S.If(L.isNum(E.var('tsv')), [S.set(dst, E.var('tsv'))], [
      S.set('ttg', E.letter(E.num(1), E.var('tsv'))),
      S.If(E.eq(E.var('ttg'), E.str('S')), [...L.payInto(E.var('tsv'), 'tsp'), S.set(dst, E.var('tsp'))]),
      S.If(E.eq(E.var('ttg'), E.str('B')), [
        S.set(dst, E.str('False')),
        S.If(E.eq(E.letter(E.num(2), E.var('tsv')), E.str('1')), [S.set(dst, E.str('True'))]),
      ]),
      S.If(E.eq(E.var('ttg'), E.str('Z')), [S.set(dst, E.str('None'))]),
      S.If(E.or(E.eq(E.var('ttg'), E.str('L')), E.eq(E.var('ttg'), E.str('T'))), [
        ...L.payInto(E.var('tsv'), 'tso'),
        S.set('topen', E.str('[')), S.set('tclose', E.str(']')),
        S.If(E.eq(E.var('ttg'), E.str('T')), [S.set('topen', E.str('(')), S.set('tclose', E.str(')'))]),
        S.set(dst, E.var('topen')),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('tso')), [
          S.If(E.gt(E.var('i'), E.num(1)), [S.set(dst, E.join(E.var(dst), E.str(', ')))]),
          ...tostr1(heapGet(E.var('tso'), E.var('i')), 'tsx'),
          S.set(dst, E.join(E.var(dst), E.var('tsx'))),
          S.chg('i', E.num(1)),
        ]),
        S.set(dst, E.join(E.var(dst), E.var('tclose'))),
      ]),
      S.If(E.eq(E.var('ttg'), E.str('F')), [
        ...L.payInto(E.var('tsv'), 'tsf'),
        S.set(dst, E.join(E.str('<function '), E.join(E.item('FnName', E.var('tsf')), E.str('>')))),
      ]),
      S.If(E.eq(E.var('ttg'), E.str('C')), [
        ...L.payInto(E.var('tsv'), 'tsf'),
        S.set(dst, E.join(E.str("<class '"), E.join(E.item('ClName', E.var('tsf')), E.str("'>")))),
      ]),
      S.If(E.eq(E.var('ttg'), E.str('O')), [S.set(dst, E.str('<object>'))]),
    ]),
  ];
  const substrInto = (src, start, len, dst) => [
    S.set(dst, E.str('')), S.set('k', start),
    S.Repeat(len, [S.set(dst, E.join(E.var(dst), E.letter(E.var('k'), src))), S.chg('k', E.num(1))]),
  ];
  const strEq = (a, b, dst) => [
    S.set(dst, E.num(0)),
    S.If(E.eq(a, b), [
      ...L.signInto(a, 'sg1'), ...L.signInto(b, 'sg2'),
      S.If(E.eq(E.var('sg1'), E.var('sg2')), [S.set(dst, E.num(1))]),
    ]),
  ];
  const vmPrint = (msgExpr) => [
    S.set('pl', E.str('')), S.set('pi2', E.num(1)), S.set('pmsg', msgExpr),
    S.Repeat(E.slen(E.var('pmsg')), [
      S.set('pl', E.join(E.var('pl'), E.letter(E.var('pi2'), E.var('pmsg')))),
      S.If(E.eq(E.slen(E.var('pl')), E.num(30)), [S.ladd('Output', E.var('pl')), S.set('pl', E.str(''))]),
      S.chg('pi2', E.num(1)),
    ]),
    S.If(E.or(E.not(E.eq(E.var('pl'), E.str(''))), E.eq(E.slen(E.var('pmsg')), E.num(0))), [
      S.ladd('Output', E.var('pl')),
    ]),
    S.While(E.gt(E.len('Output'), E.num(300)), [S.ldel('Output', E.num(1))]),
    // follow the tail so the newest line is always on screen (pane shows 9 rows)
    S.If(E.gt(E.len('Output'), E.num(9)),
      [S.set('outpage', E.sub(E.len('Output'), E.num(8)))],
      [S.set('outpage', E.num(1))]),
    S.set('dirty', E.num(1)),
  ];

  // ================= opcode handlers =================
  // ---------------- exact decimal integers (bignum) ----------------
  // Schoolbook multiplication over digit strings; the result is a bare decimal string, which
  // is exactly how this VM represents numbers, so printing is exact.  Only used when the
  // double result would lose precision (see the guards in arithBlock).
  const bigMul = (as, bs, dst) => [
    S.set('bma', as), S.set('bmb', bs),
    S.set('bmn', E.slen(E.var('bma'))), S.set('bmm', E.slen(E.var('bmb'))),
    S.ldelall('Big'),
    S.Repeat(E.add(E.var('bmn'), E.var('bmm')), [S.ladd('Big', E.num(0))]),
    S.set('bmi', E.var('bmn')),
    S.Until(E.lt(E.var('bmi'), E.num(1)), [
      S.set('bmc', E.num(0)), S.set('bmj', E.var('bmm')),
      S.Until(E.lt(E.var('bmj'), E.num(1)), [
        ...L.charCode(E.letter(E.var('bmi'), E.var('bma')), 'bmd1'),
        ...L.charCode(E.letter(E.var('bmj'), E.var('bmb')), 'bmd2'),
        S.set('bmt', E.add(
          E.mul(E.sub(E.var('bmd1'), E.num(17)), E.sub(E.var('bmd2'), E.num(17))),
          E.add(E.item('Big', E.add(E.var('bmi'), E.var('bmj'))), E.var('bmc')))),
        S.lset('Big', E.add(E.var('bmi'), E.var('bmj')), E.mod(E.var('bmt'), E.num(10))),
        S.set('bmc', E.math('floor', E.div(E.var('bmt'), E.num(10)))),
        S.chg('bmj', E.num(-1)),
      ]),
      S.lset('Big', E.var('bmi'), E.var('bmc')),
      S.chg('bmi', E.num(-1)),
    ]),
    S.set('bmk', E.num(1)),
    S.Until(E.or(E.ge(E.var('bmk'), E.len('Big')), E.gt(E.item('Big', E.var('bmk')), E.num(0))), [
      S.chg('bmk', E.num(1)),
    ]),
    S.set(dst, E.str('')), S.set('bmj', E.var('bmk')),
    S.Repeat(E.add(E.sub(E.len('Big'), E.var('bmk')), E.num(1)), [
      S.set(dst, E.join(E.var(dst), E.letter(E.add(E.item('Big', E.var('bmj')), E.num(17)), E.str(CHARLIST)))),
      S.chg('bmj', E.num(1)),
    ]),
  ];
  const bigPow = (baseExpr, expExpr, dst) => [
    S.set('bpb', baseExpr), S.set('bpe', expExpr), S.set('bpr', E.str('1')),
    S.Repeat(E.var('bpe'), [...bigMul(E.var('bpr'), E.var('bpb'), 'bpr')]),
    S.set(dst, E.var('bpr')),
  ];
  function arithBlock() {
    const op = () => E.var('op');
    // Python distinguishes int from float when printing.  Numbers here are bare text, so a
    // float result that lands on a whole number gets a '.0' suffix (either operand spelled
    // with a '.', or true division, makes the result a float).
    const floatFix = () => [
      S.set('isflt', E.num(0)),
      S.If(E.contains(E.join(E.str(''), E.var('na')), E.str('.')), [S.set('isflt', E.num(1))]),
      S.If(E.contains(E.join(E.str(''), E.var('nb')), E.str('.')), [S.set('isflt', E.num(1))]),
      S.If(E.eq(op(), E.str('/')), [S.set('isflt', E.num(1))]),
      S.If(E.and(E.eq(E.var('isflt'), E.num(1)), E.eq(E.mod(E.var('res'), E.num(1)), E.num(0))), [
        S.set('res', E.join(E.str(''), E.join(E.var('res'), E.str('.0')))),
      ]),
    ];
    return [
      S.set('isflt', E.num(0)),
      S.If(E.eq(op(), E.str('+')), [S.set('res', E.add(E.var('na'), E.var('nb')))]),
      S.If(E.eq(op(), E.str('-')), [S.set('res', E.sub(E.var('na'), E.var('nb')))]),
      S.If(E.eq(op(), E.str('*')), [
        S.If(E.and(E.and(E.ge(E.var('na'), E.num(1)), E.eq(E.mod(E.var('na'), E.num(1)), E.num(0))),
          E.and(E.ge(E.var('nb'), E.num(1)), E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)),
            E.gt(E.add(E.slen(E.join(E.str(''), E.var('na'))), E.slen(E.join(E.str(''), E.var('nb')))), E.num(15))))), [
          ...bigMul(E.join(E.str(''), E.var('na')), E.join(E.str(''), E.var('nb')), 'res'),
        ], [
          S.set('res', E.mul(E.var('na'), E.var('nb'))),
        ]),
      ]),
      S.If(E.eq(op(), E.str('/')), [
        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError', 'division by zero')],
          [S.set('res', E.div(E.var('na'), E.var('nb')))]),
      ]),
      S.If(E.eq(op(), E.str('//')), [
        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError', 'integer division or modulo by zero')],
          [S.set('res', E.math('floor', E.div(E.var('na'), E.var('nb'))))]),
      ]),
      S.If(E.eq(op(), E.str('%')), [
        S.If(E.eq(E.var('nb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError', 'integer modulo by zero')], [
          S.set('res', E.sub(E.var('na'), E.mul(E.var('nb'), E.math('floor', E.div(E.var('na'), E.var('nb')))))),
        ]),
      ]),
      S.If(E.eq(op(), E.str('**')), [
        S.If(E.and(E.and(E.ge(E.var('na'), E.num(2)), E.eq(E.mod(E.var('na'), E.num(1)), E.num(0))),
          E.and(E.ge(E.var('nb'), E.num(1)), E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)),
            E.and(E.le(E.var('nb'), E.num(512)),
              E.le(E.mul(E.slen(E.join(E.str(''), E.var('na'))), E.var('nb')), E.num(1024)))))), [
          ...bigPow(E.join(E.str(''), E.var('na')), E.var('nb'), 'res'),
        ], [
        S.If(E.and(E.eq(E.mod(E.var('nb'), E.num(1)), E.num(0)), E.le(E.math('abs', E.var('nb')), E.num(1000))), [
          S.set('res', E.num(1)),
          S.Repeat(E.math('abs', E.var('nb')), [S.set('res', E.mul(E.var('res'), E.var('na')))]),
          S.If(E.lt(E.var('nb'), E.num(0)), [S.set('res', E.div(E.num(1), E.var('res')))]),
        ], [
          S.If(E.gt(E.var('na'), E.num(0)), [
            S.set('res', E.math('e ^', E.mul(E.var('nb'), E.math('ln', E.var('na'))))),
          ], [L.failAt(E.str('ValueError: bad power'), E.item('Iline', E.var('pc')))]),
        ]),
        ]),
      ]),
      ...floatFix(),
    ];
  }
  function inBlock() {
    return [
      S.set('res', E.str('B0')), S.set('rt', E.str('R')),
      S.If(E.eq(E.letter(E.num(1), E.var('vb')), E.str('S')), [
        S.set('i', E.num(1)), S.set('lim', E.sub(E.slen(E.var('nb')), E.slen(E.var('na')))),
        S.Until(E.or(E.gt(E.var('i'), E.add(E.var('lim'), E.num(1))), E.eq(E.var('res'), E.str('B1'))), [
          ...substrInto(E.var('nb'), E.var('i'), E.slen(E.var('na')), 'sub'),
          ...strEq(E.var('sub'), E.var('na'), 'se2'),
          S.If(E.eq(E.var('se2'), E.num(1)), [S.set('res', E.str('B1'))]),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.letter(E.num(1), E.var('vb')), E.str('L')), [
        ...L.payInto(E.var('vb'), 'lso'),
        S.set('i', E.num(1)),
        S.Until(E.or(E.gt(E.var('i'), E.item('LCount', E.var('lso'))), E.eq(E.var('res'), E.str('B1'))), [
          ...strEq(heapGet(E.var('lso'), E.var('i')), E.var('va'), 'se3'),
          S.If(E.eq(E.var('se3'), E.num(1)), [S.set('res', E.str('B1'))]),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.letter(E.num(1), E.var('vb')), E.str('D')), [
        ...L.payInto(E.var('vb'), 'dmo'), ...keyOf(E.var('va'), 'kvk'),
        ...lookupIn(E.var('dmo'), E.var('kvk'), 'gv'),
        S.If(E.gt(E.slen(E.var('gv')), E.num(0)), [S.set('res', E.str('B1'))]),
      ]),
      S.If(E.eq(E.var('op'), E.str('notin')), [
        S.If(E.eq(E.var('res'), E.str('B1')), [S.set('res', E.str('B0'))], [S.set('res', E.str('B1'))]),
      ]),
    ];
  }
  // [1, 2] * 3 / 3 * (1, 2): repeat a list or tuple n times
  function seqRepeat(seqExpr, nExpr, kind) {
    return [
      ...L.payInto(seqExpr, 'sqa'),
      S.set('sqn', E.num(0)),
      S.If(E.gt(nExpr, E.num(0)), [S.set('sqn', E.math('floor', nExpr))]),
      ...heapNew('tobj'),
      S.Repeat(E.var('sqn'), [
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('sqa')), [
          ...heapPush(E.var('tobj'), heapGet(E.var('sqa'), E.var('i'))),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.set('res', E.join(kind, E.var('tobj'))),
      S.set('rt', E.str('R')),
    ];
  }
  function repeatBlock() {
    return [
      S.If(E.and(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), isNumLike(E.var('vb'))), [
        S.set('res', E.str('S')),
        S.Repeat(E.var('nb'), [S.set('res', E.join(E.var('res'), E.var('na')))]),
        S.set('rt', E.str('R')),
      ]),
      S.If(E.and(isNumLike(E.var('va')), E.eq(E.letter(E.num(1), E.var('vb')), E.str('S'))), [
        S.set('res', E.str('S')),
        S.Repeat(E.var('na'), [S.set('res', E.join(E.var('res'), E.var('nb')))]),
        S.set('rt', E.str('R')),
      ]),
      // seq * n
      S.If(E.and(seqTag(E.var('va')), isNumLike(E.var('vb'))), [
        ...seqRepeat(E.var('va'), E.var('nb'), E.letter(E.num(1), E.var('va'))),
      ]),
      // n * seq
      S.If(E.and(isNumLike(E.var('va')), seqTag(E.var('vb'))), [
        ...seqRepeat(E.var('vb'), E.var('na'), E.letter(E.num(1), E.var('vb'))),
      ]),
    ];
  }
  // [1, 2] + [3] / (1, 2) + (3,) : concatenation (list + tuple is a TypeError)
  function seqPlus() {
    return [
      S.If(E.and(seqTag(E.var('va')), seqTag(E.var('vb'))), [
        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.letter(E.num(1), E.var('vb'))), [
          ...L.payInto(E.var('va'), 'oa'), ...L.payInto(E.var('vb'), 'ob'),
          ...heapNew('tobj'),
          S.set('i', E.num(1)),
          S.Repeat(E.item('LCount', E.var('oa')), [
            ...heapPush(E.var('tobj'), heapGet(E.var('oa'), E.var('i'))),
            S.chg('i', E.num(1)),
          ]),
          S.set('i', E.num(1)),
          S.Repeat(E.item('LCount', E.var('ob')), [
            ...heapPush(E.var('tobj'), heapGet(E.var('ob'), E.var('i'))),
            S.chg('i', E.num(1)),
          ]),
          S.set('res', E.join(E.letter(E.num(1), E.var('va')), E.var('tobj'))),
          S.set('rt', E.str('R')),
        ], [
          ...raiseBuiltin('TypeError', 'can only concatenate list to list'),
        ]),
      ]),
    ];
  }
  // Python's modulo on a string formats it: %s (str), %d (truncated int), %f/%r (plain
  // repr) and %%; the right side may be a tuple or a scalar.  This branch lives in
  // binBlock, not arithBlock: arithBlock only runs when BOTH operands are numeric, which
  // is exactly why a string left side never reached the old numeric-only modulo branch.
  // pad a fixed-point number with trailing zeros so '%.2f' % 3.0 prints 3.00
  const padDecimals = (pExpr, dstName) => [
    S.set('sfd', E.num(0)), S.set('sfk', E.num(1)), S.set('sfdot', E.num(0)),
    S.Until(E.gt(E.var('sfk'), E.slen(E.var(dstName))), [
      S.If(E.eq(E.letter(E.var('sfk'), E.var(dstName)), E.str('.')), [S.set('sfdot', E.num(1))], [
        S.If(E.eq(E.var('sfdot'), E.num(1)), [S.chg('sfd', E.num(1))]),
      ]),
      S.chg('sfk', E.num(1)),
    ]),
    // %0f prints no decimal point at all
    S.If(E.and(E.eq(E.var('sfdot'), E.num(0)), E.gt(pExpr, E.num(0))), [S.set(dstName, E.join(E.var(dstName), E.str('.')))]),
    S.Repeat(E.sub(pExpr, E.var('sfd')), [S.set(dstName, E.join(E.var(dstName), E.str('0')))]),
  ];
  function strFormat(fmtv, argv, dst) {
    return [
      ...L.payInto(fmtv, 'sf'),
      S.set('sfo', E.str('')), S.set('sfi', E.num(1)), S.set('sfai', E.num(1)), S.set('sftup', E.num(0)),
      S.If(E.eq(E.letter(E.num(1), argv), E.str('T')), [
        S.set('sftup', E.num(1)),
        ...L.payInto(argv, 'sft'),
      ]),
      S.Until(E.gt(E.var('sfi'), E.slen(E.var('sf'))), [
        S.If(E.and(E.eq(E.letter(E.var('sfi'), E.var('sf')), E.str('%')), E.le(E.add(E.var('sfi'), E.num(1)), E.slen(E.var('sf')))), [
          // %[flags][width][.precision]conversion
          S.set('sfj', E.add(E.var('sfi'), E.num(1))),
          S.set('sfp', E.num(-1)), S.set('sfpm', E.num(0)),
          S.Until(E.or(E.gt(E.var('sfj'), E.slen(E.var('sf'))),
            E.not(E.contains(E.str('-+ 0#.0123456789'), E.letter(E.var('sfj'), E.var('sf'))))), [
            S.set('sfsc', E.letter(E.var('sfj'), E.var('sf'))),
            S.If(E.eq(E.var('sfsc'), E.str('.')), [
              S.set('sfpm', E.num(1)), S.set('sfp', E.num(0)),
            ], [
              S.If(E.eq(E.var('sfpm'), E.num(1)), [
                ...L.charCode(E.var('sfsc'), 'sfc2'),
                S.set('sfp', E.add(E.mul(E.var('sfp'), E.num(10)), E.sub(E.var('sfc2'), E.num(17)))),
              ]),
            ]),
            S.chg('sfj', E.num(1)),
          ]),
          S.set('sfc', E.letter(E.var('sfj'), E.var('sf'))),
          // land one before the conversion char: the two chg steps below advance past it
          S.set('sfi', E.sub(E.var('sfj'), E.num(1))),
          S.If(E.eq(E.var('sfc'), E.str('%')), [
            S.set('sfo', E.join(E.var('sfo'), E.str('%'))),
          ], [
            S.set('sfx', E.str('')),
            S.If(E.eq(E.var('sftup'), E.num(1)), [
              S.set('sfv', heapGet(E.var('sft'), E.var('sfai'))),
              S.chg('sfai', E.num(1)),
            ], [S.set('sfv', argv)]),
            S.If(E.eq(E.var('sfc'), E.str('d')), [
              ...L.payInto(E.var('sfv'), 'sfn'),
              S.set('sfni', E.math('floor', E.var('sfn'))),
              S.If(E.lt(E.var('sfn'), E.num(0)), [S.set('sfni', E.math('ceiling', E.var('sfn')))]),
              S.set('sfx', E.join(E.str(''), E.var('sfni'))),
            ], [
              S.If(E.eq(E.var('sfc'), E.str('f')), [
                ...L.payInto(E.var('sfv'), 'sfn'),
                S.set('sfpp', E.var('sfp')),
                S.If(E.lt(E.var('sfpp'), E.num(0)), [S.set('sfpp', E.num(6))]),
                S.set('sc', E.num(1)),
                S.Repeat(E.var('sfpp'), [S.set('sc', E.mul(E.var('sc'), E.num(10)))]),
                S.set('sfs', E.join(E.str(''), E.div(E.rnd(E.mul(E.var('sfn'), E.var('sc'))), E.var('sc')))),
                ...padDecimals(E.var('sfpp'), 'sfs'),
                S.set('sfx', E.var('sfs')),
              ], [
                ...tostr(E.var('sfv'), 'sfx'),
              ]),
            ]),
            S.set('sfo', E.join(E.var('sfo'), E.var('sfx'))),
          ]),
          S.chg('sfi', E.num(1)),
        ], [
          S.set('sfo', E.join(E.var('sfo'), E.letter(E.var('sfi'), E.var('sf')))),
        ]),
        S.chg('sfi', E.num(1)),
      ]),
      S.set(dst, E.join(E.str('S'), E.var('sfo'))),
    ];
  }
  function binBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      ...vpop('vb'), ...vpop('va'),
      S.set('op', ia()),
      ...L.payInto(E.var('va'), 'na'),
      ...L.payInto(E.var('vb'), 'nb'),
      S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0)),
      S.If(E.eq(E.var('op'), E.str('and')), [
        ...truthOf(E.var('va'), 'tb'),
        S.If(E.eq(E.var('tb'), E.num(0)), [S.set('res', E.var('va'))], [S.set('res', E.var('vb'))]),
        S.set('rt', E.str('R')),
      ]),
      S.If(E.eq(E.var('op'), E.str('or')), [
        ...truthOf(E.var('va'), 'tb'),
        S.If(E.eq(E.var('tb'), E.num(1)), [S.set('res', E.var('va'))], [S.set('res', E.var('vb'))]),
        S.set('rt', E.str('R')),
      ]),
      S.If(E.or(E.eq(E.var('op'), E.str('is')), E.eq(E.var('op'), E.str('isnot'))), [
        S.set('res', E.str('B0')), S.set('rt', E.str('R')),
        S.If(E.eq(E.var('va'), E.var('vb')), [S.set('res', E.str('B1'))]),
        S.If(E.eq(E.var('op'), E.str('isnot')), [
          S.If(E.eq(E.var('res'), E.str('B1')), [S.set('res', E.str('B0'))], [S.set('res', E.str('B1'))]),
        ]),
      ]),
      S.If(E.or(E.eq(E.var('op'), E.str('in')), E.eq(E.var('op'), E.str('notin'))), [inBlock()]),
      S.If(E.or(E.eq(E.var('op'), E.str('==')), E.eq(E.var('op'), E.str('!='))), [
        S.set('res', E.str('B0')), S.set('rt', E.str('R')),
        S.If(E.and(L.isNum(E.var('va')), L.isNum(E.var('vb'))), [
          S.If(E.eq(E.var('va'), E.var('vb')), [S.set('res', E.str('B1'))]),
        ], [
          S.If(E.eq(E.var('va'), E.var('vb')), [
            ...strEq(E.var('va'), E.var('vb'), 'se'),
            S.If(E.eq(E.var('se'), E.num(1)), [S.set('res', E.str('B1'))]),
          ]),
        ]),
        S.If(E.eq(E.var('op'), E.str('!=')), [
          S.If(E.eq(E.var('res'), E.str('B1')), [S.set('res', E.str('B0'))], [S.set('res', E.str('B1'))]),
        ]),
      ]),
      S.If(E.or(E.eq(E.var('op'), E.str('<')), E.or(E.eq(E.var('op'), E.str('>')),
        E.or(E.eq(E.var('op'), E.str('<=')), E.eq(E.var('op'), E.str('>='))))), [ordBlock()]),
      S.If(E.and(isNumLike(E.var('va')), E.and(isNumLike(E.var('vb')), E.and(E.eq(E.var('rt'), E.str('N')),
        E.or(E.eq(E.var('op'), E.str('+')), E.or(E.eq(E.var('op'), E.str('-')),
        E.or(E.eq(E.var('op'), E.str('*')), E.or(E.eq(E.var('op'), E.str('/')),
        E.or(E.eq(E.var('op'), E.str('//')), E.or(E.eq(E.var('op'), E.str('%')),
        E.eq(E.var('op'), E.str('**'))))))))))), [arithBlock()]),
      S.If(E.eq(E.var('op'), E.str('+')), [
        S.If(E.and(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')),
          E.eq(E.letter(E.num(1), E.var('vb')), E.str('S'))), [
          S.set('res', E.join(E.str('S'), E.join(E.var('na'), E.var('nb')))), S.set('rt', E.str('R')),
        ]),
        S.If(E.eq(E.var('raised'), E.num(0)), [...seqPlus()]),
      ]),
      S.If(E.eq(E.var('op'), E.str('%')), [
        S.If(E.eq(E.letter(E.num(1), E.var('va')), E.str('S')), [
          ...strFormat(E.var('va'), E.var('vb'), 'res'),
          S.set('rt', E.str('R')),
        ]),
      ]),
      S.If(E.eq(E.var('op'), E.str('*')), [repeatBlock()]),
      S.If(E.eq(E.var('raised'), E.num(0)), [
        S.If(E.eq(E.var('rt'), E.str('N')), [...vpush(E.join(E.str(''), E.var('res')))], [
          ...vpush(E.var('res')),
        ]),
      ]),
    ];
  }
  function ordBlock() {
    const op = () => E.var('op');
    return [
      S.set('res', E.str('B0')), S.set('rt', E.str('R')),
      S.If(E.and(L.isNum(E.var('na')), L.isNum(E.var('nb'))), [
        S.If(E.eq(op(), E.str('<')), [S.If(E.lt(E.var('na'), E.var('nb')), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('>')), [S.If(E.gt(E.var('na'), E.var('nb')), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('<=')), [S.If(E.le(E.var('na'), E.var('nb')), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('>=')), [S.If(E.ge(E.var('na'), E.var('nb')), [S.set('res', E.str('B1'))])]),
      ], [
        S.set('i', E.num(1)), S.set('cmp', E.num(0)),
        S.Until(E.or(E.gt(E.var('i'), E.slen(E.var('na'))), E.or(E.gt(E.var('i'), E.slen(E.var('nb'))),
          E.gt(E.var('cmp'), E.num(0)))), [
          ...L.charCode(E.letter(E.var('i'), E.var('na')), 'ca'),
          ...L.charCode(E.letter(E.var('i'), E.var('nb')), 'cb'),
          S.If(E.lt(E.var('ca'), E.var('cb')), [S.set('cmp', E.num(-1))]),
          S.If(E.gt(E.var('ca'), E.var('cb')), [S.set('cmp', E.num(1))]),
          S.chg('i', E.num(1)),
        ]),
        S.If(E.eq(E.var('cmp'), E.num(0)), [
          S.If(E.lt(E.slen(E.var('na')), E.slen(E.var('nb'))), [S.set('cmp', E.num(-1))]),
          S.If(E.gt(E.slen(E.var('na')), E.slen(E.var('nb'))), [S.set('cmp', E.num(1))]),
        ]),
        S.If(E.eq(op(), E.str('<')), [S.If(E.lt(E.var('cmp'), E.num(0)), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('>')), [S.If(E.gt(E.var('cmp'), E.num(0)), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('<=')), [S.If(E.le(E.var('cmp'), E.num(0)), [S.set('res', E.str('B1'))])]),
        S.If(E.eq(op(), E.str('>=')), [S.If(E.ge(E.var('cmp'), E.num(0)), [S.set('res', E.str('B1'))])]),
      ]),
    ];
  }
  function unBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      ...vpop('va'),
      ...L.payInto(E.var('va'), 'na'),
      S.set('res', E.str('')), S.set('rt', E.str('N')), S.set('raised', E.num(0)),
      S.If(E.eq(ia(), E.str('neg')), [
        S.set('res', E.mul(E.num(-1), E.var('na'))),
        S.If(E.and(E.contains(E.join(E.str(''), E.var('na')), E.str('.')), E.eq(E.mod(E.var('res'), E.num(1)), E.num(0))), [
          S.set('res', E.join(E.str(''), E.join(E.var('res'), E.str('.0')))),
        ]),
      ]),
      S.If(E.eq(ia(), E.str('pos')), [S.set('res', E.var('na'))]),
      S.If(E.eq(ia(), E.str('not')), [
        ...truthOf(E.var('va'), 'tb'), S.set('rt', E.str('R')), S.set('res', E.str('B1')),
        S.If(E.eq(E.var('tb'), E.num(1)), [S.set('res', E.str('B0'))]),
      ]),
      S.If(E.eq(E.var('rt'), E.str('N')), [...vpush(E.join(E.str(''), E.var('res')))],
        [...vpush(E.var('res'))]),
    ];
  }
  function nthField(src, n, dst) {
    return [
      S.set(dst, E.str('')), S.set('j', E.num(1)), S.set('k3', E.num(1)),
      S.Until(E.or(E.gt(E.var('j'), E.slen(src)), E.gt(E.var('k3'), n)), [
        S.If(E.eq(E.letter(E.var('j'), src), E.str(',')), [S.chg('k3', E.num(1))], [
          S.If(E.eq(E.var('k3'), n), [S.set(dst, E.join(E.var(dst), E.letter(E.var('j'), src)))]),
        ]),
        S.chg('j', E.num(1)),
      ]),
    ];
  }
  // -1 / 0 / 1 ordering used by CMP, min/max and sort.
  function charOrder(sa, sb, dst) {
    return [
      S.set('oci', E.num(1)), S.set(dst, E.num(0)),
      S.Until(E.or(E.gt(E.var('oci'), E.slen(sa)), E.not(E.eq(E.var(dst), E.num(0)))), [
        S.set('oca', E.str('')), S.set('ocb', E.str('')),
        S.If(E.not(E.gt(E.var('oci'), E.slen(sb))), [
          ...L.charCode(E.letter(E.var('oci'), sa), 'oca'),
          ...L.charCode(E.letter(E.var('oci'), sb), 'ocb'),
          S.If(E.lt(E.var('oca'), E.var('ocb')), [S.set(dst, E.num(-1))]),
          S.If(E.gt(E.var('oca'), E.var('ocb')), [S.set(dst, E.num(1))]),
        ]),
        S.chg('oci', E.num(1)),
      ]),
      S.If(E.eq(E.var(dst), E.num(0)), [
        S.If(E.lt(E.slen(sa), E.slen(sb)), [S.set(dst, E.num(-1))]),
        S.If(E.gt(E.slen(sa), E.slen(sb)), [S.set(dst, E.num(1))]),
      ]),
    ];
  }
  function scalarOrder(va, vb, dst) {
    return [
      S.set(dst, E.num(0)),
      S.If(E.and(isNumLike(va), isNumLike(vb)), [
        ...L.payInto(va, 'ona'), ...L.payInto(vb, 'onb'),
        S.If(E.lt(E.var('ona'), E.var('onb')), [S.set(dst, E.num(-1))]),
        S.If(E.gt(E.var('ona'), E.var('onb')), [S.set(dst, E.num(1))]),
      ], [
        // comparing the tagged text keeps tags apart: S-empty never equals Z
        ...charOrder(va, vb, dst),
      ]),
    ];
  }
  const isNumLike = (x) => E.or(L.isNum(x), E.eq(E.letter(E.num(1), x), E.str('B')));
  const seqTag = (x) => E.or(E.eq(E.letter(E.num(1), x), E.str('L')), E.eq(E.letter(E.num(1), x), E.str('T')));
  // lexicographic comparison of two lists/tuples.  Code generators cannot recurse,
  // so nested pairs go on an explicit work stack of [idA, idB, nextIndex] frames.
  function seqOrder(va, vb, dst) {
    return [
      S.ldelall('CSst'),
      ...L.payInto(va, 'ocq'), ...L.payInto(vb, 'ocq2'),
      S.ladd('CSst', E.var('ocq')), S.ladd('CSst', E.var('ocq2')), S.ladd('CSst', E.num(0)),
      S.set('CSn', E.num(1)), S.set('CSdn', E.num(0)), S.set(dst, E.num(0)),
      S.Until(E.or(E.lt(E.var('CSn'), E.num(1)), E.eq(E.var('CSdn'), E.num(1))), [
        S.set('CSa', E.item('CSst', E.sub(E.mul(E.var('CSn'), E.num(3)), E.num(2)))),
        S.set('CSb', E.item('CSst', E.sub(E.mul(E.var('CSn'), E.num(3)), E.num(1)))),
        S.set('CSi', E.item('CSst', E.mul(E.var('CSn'), E.num(3)))),
        S.set('CSla', E.item('LCount', E.var('CSa'))), S.set('CSlb', E.item('LCount', E.var('CSb'))),
        S.If(E.and(E.ge(E.var('CSi'), E.var('CSla')), E.ge(E.var('CSi'), E.var('CSlb'))), [
          S.chg('CSn', E.num(-1)),
        ], [
          S.If(E.or(E.ge(E.var('CSi'), E.var('CSla')), E.ge(E.var('CSi'), E.var('CSlb'))), [
            S.set(dst, E.num(1)),
            S.If(E.lt(E.var('CSla'), E.var('CSlb')), [S.set(dst, E.num(-1))]),
            S.set('CSdn', E.num(1)),
          ], [
            S.set('CSea', heapGet(E.var('CSa'), E.add(E.var('CSi'), E.num(1)))),
            S.set('CSeb', heapGet(E.var('CSb'), E.add(E.var('CSi'), E.num(1)))),
            S.If(E.and(seqTag(E.var('CSea')), seqTag(E.var('CSeb'))), [
              S.lset('CSst', E.mul(E.var('CSn'), E.num(3)), E.add(E.var('CSi'), E.num(1))),
              ...L.payInto(E.var('CSea'), 'ocq'), ...L.payInto(E.var('CSeb'), 'ocq2'),
              S.ladd('CSst', E.var('ocq')), S.ladd('CSst', E.var('ocq2')), S.ladd('CSst', E.num(0)),
              S.chg('CSn', E.num(1)),
            ], [
              ...scalarOrder(E.var('CSea'), E.var('CSeb'), 'ocm'),
              S.If(E.eq(E.var('ocm'), E.num(0)), [
                S.lset('CSst', E.mul(E.var('CSn'), E.num(3)), E.add(E.var('CSi'), E.num(1))),
              ], [
                S.set(dst, E.var('ocm')), S.set('CSdn', E.num(1)),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
  }
  function orderOf(va, vb, dst) {
    return [S.If(E.and(seqTag(va), seqTag(vb)), [...seqOrder(va, vb, dst)], [...scalarOrder(va, vb, dst)])];
  }
  function cmpPair(va, vb, sop, dst) {
    const op = () => E.var('cop');
    return [
      S.set('cop', sop),
      ...orderOf(va, vb, 'ocm'),
      S.set(dst, E.str('B0')),
      S.If(E.eq(op(), E.str('==')), [S.If(E.eq(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),
      S.If(E.eq(op(), E.str('!=')), [
        S.set(dst, E.str('B1')),
        S.If(E.eq(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B0'))]),
      ]),
      S.If(E.eq(op(), E.str('<')), [S.If(E.lt(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),
      S.If(E.eq(op(), E.str('>')), [S.If(E.gt(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),
      S.If(E.eq(op(), E.str('<=')), [S.If(E.le(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),
      S.If(E.eq(op(), E.str('>=')), [S.If(E.ge(E.var('ocm'), E.num(0)), [S.set(dst, E.str('B1'))])]),
    ];
  }
  // compare the top two stack values but LEAVE the right operand in place: this is what
  // makes a chained comparison evaluate its shared operand exactly once.
  function cmpkBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('va', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),
      S.set('vb', E.item('Stk', E.var('sp'))),
      ...cmpPair(E.var('va'), E.var('vb'), ia(), 'cres'),
      ...L.setAt('Stk', E.sub(E.var('sp'), E.num(1)), E.var('cres')),
    ];
  }
  function cmpBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('nspec', E.num(1)), S.set('j', E.num(1)),
      S.Until(E.gt(E.var('j'), E.slen(ia())), [
        S.If(E.eq(E.letter(E.var('j'), ia()), E.str('|')), [
          ...substrInto(ia(), E.add(E.var('j'), E.num(1)), E.sub(E.slen(ia()), E.var('j')), 'nspec'),
        ]),
        S.chg('j', E.num(1)),
      ]),
      S.set('nvals', E.add(E.var('nspec'), E.num(1))),
      S.set('res', E.str('B1')),
      S.set('i', E.num(1)),
      S.Until(E.or(E.ge(E.var('i'), E.var('nvals')), E.eq(E.var('res'), E.str('B0'))), [
        S.set('va', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('nvals')), E.var('i')))),
        S.set('vb', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('nvals')), E.add(E.var('i'), E.num(1))))),
        ...nthField(ia(), E.var('i'), 'sop'),
        ...cmpPair(E.var('va'), E.var('vb'), E.var('sop'), 'cres'),
        S.If(E.eq(E.var('cres'), E.str('B0')), [S.set('res', E.str('B0'))]),
        S.chg('i', E.num(1)),
      ]),
      S.chg('sp', E.mul(E.num(-1), E.var('nvals'))),
      ...vpush(E.var('res')),
    ];
  }
  function buildBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('n', E.num(1)), S.set('j', E.num(1)),
      S.Until(E.gt(E.var('j'), E.slen(ia())), [
        S.If(E.eq(E.letter(E.var('j'), ia()), E.str('|')), [
          ...substrInto(ia(), E.add(E.var('j'), E.num(1)), E.sub(E.slen(ia()), E.var('j')), 'n'),
        ]),
        S.chg('j', E.num(1)),
      ]),
      S.set('kind', E.letter(E.num(1), ia())),
      S.If(E.eq(E.var('kind'), E.str('D')), [
        ...mapNew('tobj', E.num(0), E.str('D')),
        S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.var('n')), [
          S.set('kv', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.var('i')))),
          S.set('vv', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.add(E.var('i'), E.num(1))))),
          ...keyOf(E.var('kv'), 'kk'),
          ...bindSet(E.var('tobj'), E.var('kk'), E.var('vv'), 'fd2'),
          S.chg('i', E.num(2)),
        ]),
        S.chg('sp', E.mul(E.num(-1), E.var('n'))),
        ...vpush(E.join(E.str('D'), E.var('tobj'))),
      ], [
        ...heapNew('tobj'),
        S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.var('n')), [
          ...heapPush(E.var('tobj'), E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.var('i')))),
          S.chg('i', E.num(1)),
        ]),
        S.chg('sp', E.mul(E.num(-1), E.var('n'))),
        ...vpush(E.join(E.var('kind'), E.var('tobj'))),
      ]),
    ];
  }
  function subsBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('n', E.num(2)),
      S.If(E.eq(ia(), E.str('s')), [S.set('n', E.num(4))]),
      S.set('obj', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(1)))),
      S.set('idx', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(2)))),
      ...L.payInto(E.var('idx'), 'nidx'),
      S.set('res', E.str('')), S.set('rt', E.str('R')), S.set('raised', E.num(0)),
      S.If(E.and(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')), E.eq(E.var('n'), E.num(2))), [
        ...L.payInto(E.var('obj'), 'nobj'),
        S.set('ln', E.slen(E.var('nobj'))),
        S.If(E.lt(E.var('nidx'), E.num(0)), [S.set('nidx', E.add(E.var('nidx'), E.var('ln')))]),
        S.If(E.or(E.lt(E.var('nidx'), E.num(0)), E.ge(E.var('nidx'), E.var('ln'))), [
          ...raiseBuiltin('IndexError', 'string index out of range'),
        ], [
          S.set('res', E.join(E.str('S'), E.letter(E.add(E.var('nidx'), E.num(1)), E.var('nobj')))),
        ]),
      ]),
      S.If(E.and(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')), E.eq(E.var('n'), E.num(4))), [
        ...L.payInto(E.var('obj'), 'nobj'),
        S.set('ln', E.slen(E.var('nobj'))),
        S.set('vhi', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(3)))),
        S.set('vst', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(4)))),
        S.set('ist', E.num(1)),
        S.If(E.not(E.eq(E.var('vst'), E.str('Z'))), [...L.payInto(E.var('vst'), 'ist')]),
        S.set('ilo', E.num(0)), S.set('ihi', E.var('ln')),
        S.If(E.not(E.eq(E.var('idx'), E.str('Z'))), [...L.payInto(E.var('idx'), 'ilo')]),
        S.If(E.not(E.eq(E.var('vhi'), E.str('Z'))), [...L.payInto(E.var('vhi'), 'ihi')]),
        S.If(E.gt(E.var('ist'), E.num(0)), [
          S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))]),
          S.If(E.lt(E.var('ihi'), E.num(0)), [S.set('ihi', E.add(E.var('ihi'), E.var('ln')))]),
        ], [
          S.If(E.eq(E.var('idx'), E.str('Z')), [S.set('ilo', E.sub(E.var('ln'), E.num(1)))]),
          S.If(E.eq(E.var('vhi'), E.str('Z')), [S.set('ihi', E.num(-1))]),
          S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))]),
          S.If(E.lt(E.var('ihi'), E.num(0)), [S.set('ihi', E.add(E.var('ihi'), E.num(0)))]),
        ]),
        S.set('res', E.str('S')), S.set('i', E.var('ilo')),
        S.If(E.gt(E.var('ist'), E.num(0)), [
          S.Until(E.or(E.ge(E.var('i'), E.var('ihi')), E.ge(E.var('i'), E.var('ln'))), [
            S.set('res', E.join(E.var('res'), E.letter(E.add(E.var('i'), E.num(1)), E.var('nobj')))),
            S.set('i', E.add(E.var('i'), E.var('ist'))),
          ]),
        ], [
          S.Until(E.or(E.le(E.var('i'), E.var('ihi')), E.lt(E.var('i'), E.num(0))), [
            S.set('res', E.join(E.var('res'), E.letter(E.add(E.var('i'), E.num(1)), E.var('nobj')))),
            S.set('i', E.add(E.var('i'), E.var('ist'))),
          ]),
        ]),
      ]),
      S.If(E.or(E.eq(E.letter(E.num(1), E.var('obj')), E.str('L')), E.eq(E.letter(E.num(1), E.var('obj')), E.str('T'))), [
        ...L.payInto(E.var('obj'), 'lso'),
        S.set('ln', E.item('LCount', E.var('lso'))),
        S.If(E.eq(E.var('n'), E.num(2)), [
          S.If(E.lt(E.var('nidx'), E.num(0)), [S.set('nidx', E.add(E.var('nidx'), E.var('ln')))]),
          S.If(E.or(E.lt(E.var('nidx'), E.num(0)), E.ge(E.var('nidx'), E.var('ln'))), [
            ...raiseBuiltin('IndexError', 'list index out of range'),
          ], [S.set('res', heapGet(E.var('lso'), E.add(E.var('nidx'), E.num(1))))]),
        ], [
          S.set('vhi', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(3)))),
          S.set('vst', E.item('Stk', E.add(E.sub(E.var('sp'), E.var('n')), E.num(4)))),
          S.set('ist', E.num(1)),
          S.If(E.not(E.eq(E.var('vst'), E.str('Z'))), [...L.payInto(E.var('vst'), 'ist')]),
          S.set('ilo', E.num(0)), S.set('ihi', E.var('ln')),
          S.If(E.not(E.eq(E.var('idx'), E.str('Z'))), [...L.payInto(E.var('idx'), 'ilo')]),
          S.If(E.not(E.eq(E.var('vhi'), E.str('Z'))), [...L.payInto(E.var('vhi'), 'ihi')]),
          S.If(E.gt(E.var('ist'), E.num(0)), [
            S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))]),
            S.If(E.lt(E.var('ihi'), E.num(0)), [S.set('ihi', E.add(E.var('ihi'), E.var('ln')))]),
          ], [
            S.If(E.eq(E.var('idx'), E.str('Z')), [S.set('ilo', E.sub(E.var('ln'), E.num(1)))]),
            S.If(E.eq(E.var('vhi'), E.str('Z')), [S.set('ihi', E.num(-1))]),
            S.If(E.lt(E.var('ilo'), E.num(0)), [S.set('ilo', E.add(E.var('ilo'), E.var('ln')))]),
          ]),
          ...heapNew('sbj'), S.set('i', E.var('ilo')),
          S.If(E.gt(E.var('ist'), E.num(0)), [
            S.Until(E.or(E.ge(E.var('i'), E.var('ihi')), E.ge(E.var('i'), E.var('ln'))), [
              ...heapPush(E.var('sbj'), heapGet(E.var('lso'), E.add(E.var('i'), E.num(1)))),
              S.set('i', E.add(E.var('i'), E.var('ist'))),
            ]),
          ], [
            S.Until(E.or(E.le(E.var('i'), E.var('ihi')), E.lt(E.var('i'), E.num(0))), [
              ...heapPush(E.var('sbj'), heapGet(E.var('lso'), E.add(E.var('i'), E.num(1)))),
              S.set('i', E.add(E.var('i'), E.var('ist'))),
            ]),
          ]),
          S.set('res', E.join(E.str('L'), E.var('sbj'))),
        ]),
      ]),
      S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('D')), [
        ...L.payInto(E.var('obj'), 'dmo'),
        ...keyOf(E.var('idx'), 'kk'),
        ...lookupIn(E.var('dmo'), E.var('kk'), 'gv'),
        S.If(E.gt(E.slen(E.var('gv')), E.num(0)), [S.set('res', E.var('gv'))], [
          S.set('raised', E.num(1)),
          S.set('curEx', excVal('KeyError', E.var('kk'))),
          ...unwind(),
        ]),
      ]),
      S.If(E.eq(E.var('raised'), E.num(0)), [
        S.chg('sp', E.mul(E.num(-1), E.var('n'))),
        ...vpush(E.var('res')),
      ]),
    ];
  }
  function subsSetBlock() {
    return [
      S.set('obj', E.item('Stk', E.sub(E.var('sp'), E.num(2)))),
      S.set('idx', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),
      S.set('val', E.item('Stk', E.var('sp'))),
      S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('D')), [
        ...L.payInto(E.var('obj'), 'dmo'), ...keyOf(E.var('idx'), 'kvk'),
        ...bindSet(E.var('dmo'), E.var('kvk'), E.var('val'), 'fd11'),
      ], [
        ...L.payInto(E.var('idx'), 'nidx'),
        ...L.payInto(E.var('obj'), 'lso'),
        S.set('ln', E.item('LCount', E.var('lso'))),
        S.If(E.lt(E.var('nidx'), E.num(0)), [S.set('nidx', E.add(E.var('nidx'), E.var('ln')))]),
        S.If(E.or(E.lt(E.var('nidx'), E.num(0)), E.ge(E.var('nidx'), E.var('ln'))), [
          ...raiseBuiltin('IndexError', 'list assignment index out of range'),
        ], [
          S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.var('nidx')), E.var('val')),
        ]),
      ]),
      S.chg('sp', E.num(-3)),
    ];
  }

  function getattrBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      ...vpop('obj'),
      S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('O')), [
        ...L.payInto(E.var('obj'), 'ino'),
        ...lookupIn(E.item('InMap', E.var('ino')), ia(), 'gv'),
        ...vpush(E.var('gv')),
      ], [
        S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('C')), [
          ...L.payInto(E.var('obj'), 'clo2'),
          ...lookupIn(E.item('ClMap', E.var('clo2')), ia(), 'gv'),
          ...vpush(E.var('gv')),
        ], [
        S.If(E.eq(E.var('obj'), E.str('S!math')), [
          S.set('res2', E.str('Z')),
          S.If(E.eq(ia(), E.str('pi|00')), [S.set('res2', E.str('3.141592653589793'))]),
          S.If(E.eq(ia(), E.str('e|0')), [S.set('res2', E.str('2.718281828459045'))]),
          ...vpush(E.var('res2')),
        ], [
          ...L.failAt(E.str('AttributeError'), E.item('Iline', E.var('pc'))),
        ]),
        ]),
      ]),
    ];
  }
  function setattrBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('obj', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),
      S.set('val', E.item('Stk', E.var('sp'))),
      ...L.payInto(E.var('obj'), 'ino'),
      ...bindSet(E.item('InMap', E.var('ino')), ia(), E.var('val'), 'fd3'),
      S.chg('sp', E.num(-2)),
    ];
  }
  function iterBlock() {
    return [
      ...vpop('src'),
      ...heapNew('tobj'),
      S.If(E.eq(E.letter(E.num(1), E.var('src')), E.str('S')), [
        ...L.payInto(E.var('src'), 'nobj'),
        S.set('i', E.num(1)),
        S.Repeat(E.slen(E.var('nobj')), [
          ...heapPush(E.var('tobj'), E.join(E.str('S'), E.letter(E.var('i'), E.var('nobj')))),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.or(E.eq(E.letter(E.num(1), E.var('src')), E.str('L')), E.eq(E.letter(E.num(1), E.var('src')), E.str('T'))), [
        ...L.payInto(E.var('src'), 'lso'),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('lso')), [
          ...heapPush(E.var('tobj'), heapGet(E.var('lso'), E.var('i'))),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.letter(E.num(1), E.var('src')), E.str('D')), [
        // dict keys are stored as 'K' + tag + text; rebuild the value and walk the
        // bind chain backwards so iteration follows insertion order like Python
        ...L.payInto(E.var('src'), 'dso'),
        S.ldelall('Dky'),
        S.set('di', E.item('MapHead', E.var('dso'))),
        S.Until(E.lt(E.var('di'), E.num(1)), [
          S.set('dky', E.item('BindName', E.var('di'))),
          S.set('dkt', E.letter(E.num(2), E.var('dky'))),
          ...substrInto(E.var('dky'), E.num(3), E.sub(E.slen(E.var('dky')), E.num(2)), 'dkx'),
          S.set('dkv', E.join(E.str('S'), E.var('dkx'))),
          S.If(E.eq(E.var('dkt'), E.str('N')), [S.set('dkv', E.var('dkx'))]),
          S.If(E.eq(E.var('dkt'), E.str('B')), [
            S.set('dkv', E.str('B0')),
            S.If(E.eq(E.var('dkx'), E.str('True')), [S.set('dkv', E.str('B1'))]),
          ]),
          S.If(E.eq(E.var('dkt'), E.str('Z')), [S.set('dkv', E.str('Z'))]),
          S.ladd('Dky', E.var('dkv')),
          S.set('di', E.item('BindNext', E.var('di'))),
        ]),
        S.set('dkj', E.len('Dky')),
        S.Until(E.lt(E.var('dkj'), E.num(1)), [
          ...heapPush(E.var('tobj'), E.item('Dky', E.var('dkj'))),
          S.chg('dkj', E.num(-1)),
        ]),
      ]),
      S.If(E.eq(E.letter(E.num(1), E.var('src')), E.str('G')), [
        S.set('gstop', E.num(0)),
        ...vpush(E.var('src')),
      ], [
        ...vpush(E.var('tobj')),
      ]),
      ...vpush(E.num(0)),
    ];
  }
  // ---------------- generators (S11) ----------------
  // A generator function is a user function whose FnFlags is 'g'.  Calling it binds the
  // arguments into a fresh map and parks the frame state in the Gn* lists; every resume
  // pushes that frame back and runs to the next YIELD, which saves the frame again.
  function genNew(fid, dst) {
    return [
      S.chg('gTop', E.num(1)), S.set(dst, E.var('gTop')),
      ...L.setAt('GnFid', E.var(dst), fid),
      ...L.setAt('GnPc', E.var(dst), E.num(0)),
      ...L.setAt('GnEnv', E.var(dst), E.var('uenv')),
      ...L.setAt('GnDone', E.var(dst), E.num(0)),
      ...L.setAt('GnSp', E.var(dst), E.num(0)),
      ...L.setAt('GnStk', E.var(dst), E.num(0)),
    ];
  }
  function yieldBlock() {
    return [
      ...vpop('yv'),
      S.set('gid', E.item('FrAux', E.var('frTop'))),
      S.set('gd', E.sub(E.var('sp'), E.item('FrBase', E.var('frTop')))),
      ...heapNew('gsk'), S.set('gi', E.num(1)),
      S.Until(E.gt(E.var('gi'), E.var('gd')), [
        ...heapPush(E.var('gsk'), E.item('Stk', E.add(E.item('FrBase', E.var('frTop')), E.var('gi')))),
        S.chg('gi', E.num(1)),
      ]),
      ...L.setAt('GnStk', E.var('gid'), E.var('gsk')),
      ...L.setAt('GnSp', E.var('gid'), E.var('gd')),
      ...L.setAt('GnPc', E.var('gid'), E.add(E.var('pc'), E.num(1))),
      ...L.setAt('GnEnv', E.var('gid'), E.item('FrEnv', E.var('frTop'))),
      S.set('gstop', E.num(0)),
      S.set('sp', E.item('FrBase', E.var('frTop'))),
      S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),
      S.chg('frTop', E.num(-1)),
      ...pruneNl(),
      ...vpush(E.var('yv')),
    ];
  }
  function nchkBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.If(E.eq(E.var('gstop'), E.num(1)), [S.set('pc', E.sub(ia(), E.num(1)))]),
      S.set('gstop', E.num(0)),
    ];
  }
  function nextBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('it', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),
      S.set('ix', E.item('Stk', E.var('sp'))),
      S.If(E.eq(E.letter(E.num(1), E.var('it')), E.str('G')), [
        ...L.payInto(E.var('it'), 'gid'),
        S.set('gstop', E.num(0)),
        S.If(E.eq(E.item('GnDone', E.var('gid')), E.num(1)), [
          S.set('pc', E.sub(ia(), E.num(1))),
        ], [
          S.chg('frTop', E.num(1)),
          ...L.setAt('FrKind', E.var('frTop'), E.str('G')),
          // FrRet must be the instruction after NEXT (the NCHK probe), not NEXT's jump target
          ...L.setAt('FrRet', E.var('frTop'), E.add(E.var('pc'), E.num(1))),
          ...L.setAt('FrEnv', E.var('frTop'), E.item('GnEnv', E.var('gid'))),
          ...L.setAt('FrBase', E.var('frTop'), E.var('sp')),
          ...L.setAt('FrAux', E.var('frTop'), E.var('gid')),
          ...L.setAt('FrGlob', E.var('frTop'), E.num(0)),
          S.set('gi', E.num(1)),
          S.Until(E.gt(E.var('gi'), E.item('GnSp', E.var('gid'))), [
            ...vpush(heapGet(E.item('GnStk', E.var('gid')), E.var('gi'))),
            S.chg('gi', E.num(1)),
          ]),
          S.set('gpc', E.item('GnPc', E.var('gid'))),
          S.If(E.le(E.var('gpc'), E.num(0)), [
            S.set('gpc', E.item('FnBody', E.item('GnFid', E.var('gid')))),
          ]),
          S.set('pc', E.sub(E.var('gpc'), E.num(1))),
        ]),
      ], [
        S.set('gstop', E.num(0)),
        S.If(E.ge(E.var('ix'), E.item('LCount', E.var('it'))), [
          S.set('pc', E.sub(ia(), E.num(1))),
        ], [
          S.set('ix', E.add(E.var('ix'), E.num(1))),
          S.lset('Stk', E.var('sp'), E.var('ix')),
          ...vpush(heapGet(E.var('it'), E.var('ix'))),
        ]),
      ]),
    ];
  }

  function nonlocalBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('nspec', E.item('Kval', ia())), S.set('i', E.num(1)), S.set('acc', E.str('')),
      S.Until(E.gt(E.var('i'), E.slen(E.var('nspec'))), [
        S.If(E.eq(E.letter(E.var('i'), E.var('nspec')), E.str(',')), [
          S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [
            S.ladd('NlFr', E.var('frTop')), S.ladd('NlName', E.var('acc')),
          ]),
          S.set('acc', E.str('')),
        ], [
          S.set('acc', E.join(E.var('acc'), E.letter(E.var('i'), E.var('nspec')))),
        ]),
        S.chg('i', E.num(1)),
      ]),
      S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [
        S.ladd('NlFr', E.var('frTop')), S.ladd('NlName', E.var('acc')),
      ]),
    ];
  }
  function pruneNl() {
    return [
      S.set('npi', E.num(1)),
      S.Until(E.gt(E.var('npi'), E.len('NlFr')), [
        S.If(E.gt(E.item('NlFr', E.var('npi')), E.var('frTop')), [
          S.ldel('NlFr', E.var('npi')),
          S.ldel('NlName', E.var('npi')),
        ], [S.chg('npi', E.num(1))]),
      ]),
    ];
  }
  function retBlock() {
    return [
      ...vpop('rv'),
      S.If(E.le(E.var('frTop'), E.num(1)), [S.set('halted', E.num(1))], [
        S.If(E.eq(E.item('FrKind', E.var('frTop')), E.str('I')), [
          S.set('rv', E.join(E.str('O'), E.item('FrAux', E.var('frTop')))),
        ]),
        S.If(E.eq(E.item('FrKind', E.var('frTop')), E.str('G')), [
          S.set('gstop', E.num(1)),
          ...L.setAt('GnDone', E.item('FrAux', E.var('frTop')), E.num(1)),
          S.set('sp', E.item('FrBase', E.var('frTop'))),
          S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),
          S.chg('frTop', E.num(-1)),
          ...pruneNl(),
        ], [
        S.set('sp', E.item('FrBase', E.var('frTop'))),
        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),
        S.chg('frTop', E.num(-1)),
        ...pruneNl(),
        ...vpush(E.var('rv')),
        ]),
      ]),
    ];
  }
  function retnBlock() {
    return [
      S.If(E.le(E.var('frTop'), E.num(1)), [S.set('halted', E.num(1))], [
        S.set('auxv', E.item('FrAux', E.var('frTop'))),
        S.set('sp', E.item('FrBase', E.var('frTop'))),
        S.set('pc', E.sub(E.item('FrRet', E.var('frTop')), E.num(1))),
        S.chg('frTop', E.num(-1)),
        ...pruneNl(),
        S.If(E.gt(E.var('auxv'), E.num(0)), [...vpush(E.join(E.str('C'), E.var('auxv')))]),
      ]),
    ];
  }
  function splitSpec() {
    return [
      S.set('j', E.num(1)), S.set('split', E.num(0)),
      S.Until(E.gt(E.var('j'), E.slen(E.var('spec'))), [
        S.If(E.eq(E.letter(E.var('j'), E.var('spec')), E.str('#')), [S.set('split', E.var('j'))]),
        S.chg('j', E.num(1)),
      ]),
    ];
  }
  function defBlock(flag) {
    const ia = () => E.item('Ia', E.var('pc'));
    const ib = () => E.item('Ib', E.var('pc'));
    return [
      S.set('spec', E.item('Kval', ia())),
      S.set('namep', E.var('spec')), S.set('pars', E.str('')),
      ...splitSpec(),
      S.If(E.gt(E.var('split'), E.num(0)), [
        ...substrInto(E.var('spec'), E.num(1), E.sub(E.var('split'), E.num(1)), 'pars'),
        ...substrInto(E.var('spec'), E.add(E.var('split'), E.num(1)),
          E.sub(E.slen(E.var('spec')), E.var('split')), 'namep'),
      ], [...substrInto(E.var('spec'), E.num(1), E.slen(E.var('spec')), 'namep')]),
      S.chg('fTop', E.num(1)),
      ...L.setAt('FnKind', E.var('fTop'), E.str('u')),
      // display name only: the binding keeps the case signature, the name we print does not
      ...plainName(E.var('namep'), 'dnm'),
      ...L.setAt('FnName', E.var('fTop'), E.var('dnm')),
      ...L.setAt('FnParam', E.var('fTop'), E.var('pars')),
      ...L.setAt('FnBody', E.var('fTop'), ib()),
      ...L.setAt('FnEnv', E.var('fTop'), E.item('FrEnv', E.var('frTop'))),
      ...L.setAt('FnArity', E.var('fTop'), E.num(0)),
      ...L.setAt('FnFlags', E.var('fTop'), E.str(flag === undefined ? '' : flag)),
      ...vpush(E.join(E.str('F'), E.var('fTop'))),
    ];
  }
  function classBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    const ib = () => E.item('Ib', E.var('pc'));
    return [
      S.set('spec', E.item('Kval', ia())),
      ...splitSpec(),
      ...substrInto(E.var('spec'), E.add(E.var('split'), E.num(1)),
        E.sub(E.slen(E.var('spec')), E.var('split')), 'namep'),
      S.chg('cTop', E.num(1)), S.set('clo', E.var('cTop')),
      ...plainName(E.var('namep'), 'dnm'),
      ...L.setAt('ClName', E.var('clo'), E.var('dnm')),
      // bases sit before the #: A|1,#B|1 .  The first one becomes ClBase and the
      // parent of the class map, so lookup walks instance -> class -> base -> globals.
      S.set('cbbase', E.num(0)),
      S.If(E.gt(E.var('split'), E.num(2)), [
        ...substrInto(E.var('spec'), E.num(2), E.sub(E.var('split'), E.num(2)), 'cbraw'),
        S.set('cbj2', E.num(1)), S.set('cbnm', E.str('')),
        S.Until(E.or(E.gt(E.var('cbj2'), E.slen(E.var('cbraw'))),
          E.eq(E.letter(E.var('cbj2'), E.var('cbraw')), E.str(','))), [
          S.set('cbnm', E.join(E.var('cbnm'), E.letter(E.var('cbj2'), E.var('cbraw')))),
          S.chg('cbj2', E.num(1)),
        ]),
        S.If(E.gt(E.slen(E.var('cbnm')), E.num(0)), [
          ...lookupIn(E.var('GlobMap'), E.var('cbnm'), 'cbv'),
          S.If(E.eq(E.letter(E.num(1), E.var('cbv')), E.str('C')), [
            ...L.payInto(E.var('cbv'), 'cbbase'),
          ], [
            S.If(E.gt(E.slen(E.var('cbv')), E.num(0)), [
              ...L.failAt(E.str('TypeError: base is not a class'), E.item('Iline', E.var('pc'))),
            ]),
          ]),
        ]),
      ]),
      S.If(E.gt(E.var('cbbase'), E.num(0)), [
        ...L.setAt('ClBase', E.var('clo'), E.var('cbbase')),
      ], [
        ...L.setAt('ClBase', E.var('clo'), E.num(0)),
      ]),
      S.If(E.gt(E.var('cbbase'), E.num(0)), [
        ...mapNew('cm', E.item('ClMap', E.var('cbbase')), E.str('C')),
      ], [
        ...mapNew('cm', E.var('GlobMap'), E.str('C')),
      ]),
      ...L.setAt('ClMap', E.var('clo'), E.var('cm')),
      ...bindSet(E.var('GlobMap'), E.var('namep'), E.join(E.str('C'), E.var('clo')), 'fd4'),
      S.set('ubase', E.var('sp')),
      S.chg('frTop', E.num(1)),
      ...L.setAt('FrKind', E.var('frTop'), E.str('C')),
      ...L.setAt('FrRet', E.var('frTop'), E.add(E.var('pc'), E.num(1))),
      ...L.setAt('FrEnv', E.var('frTop'), E.var('cm')),
      ...L.setAt('FrBase', E.var('frTop'), E.var('ubase')),
      ...L.setAt('FrAux', E.var('frTop'), E.var('clo')),
      S.set('pc', E.sub(ib(), E.num(1))),
    ];
  }
  function asrtBlock() {
    return [
      ...vpop('cv'), ...vpop('msg'), ...truthOf(E.var('cv'), 'tb'),
      S.If(E.eq(E.var('tb'), E.num(0)), [...raiseBuiltin('AssertionError')]),
    ];
  }
  function isinstBlock() {
    return [
      ...vpop('ty'), ...vpop('xv'),
      S.set('res', E.str('B0')),
      S.If(E.eq(E.var('xv'), E.var('ty')), [S.set('res', E.str('B1'))]),
      S.If(E.eq(E.letter(E.num(1), E.var('ty')), E.str('C')), [
        ...L.payInto(E.var('ty'), 'clo'),
        // object instance: start at its class and walk the base chain
        S.If(E.eq(E.letter(E.num(1), E.var('xv')), E.str('O')), [
          ...L.payInto(E.var('xv'), 'ino'),
          S.set('cm', E.item('InClass', E.var('ino'))),
        ]),
        // raised exception value: X<class>|message
        S.If(E.eq(E.letter(E.num(1), E.var('xv')), E.str('X')), [...xclass(E.var('xv'), 'cm')]),
        // a bare class used as an exception
        S.If(E.eq(E.letter(E.num(1), E.var('xv')), E.str('C')), [...L.payInto(E.var('xv'), 'cm')]),
        S.Until(E.lt(E.var('cm'), E.num(1)), [
          S.If(E.eq(E.var('cm'), E.var('clo')), [S.set('res', E.str('B1'))]),
          S.set('cm', E.item('ClBase', E.var('cm'))),
        ]),
      ]),
      ...vpush(E.var('res')),
    ];
  }
  function unwind() {
    return [
      S.set('handled', E.num(0)),
      S.Until(E.or(E.le(E.var('hdTop'), E.num(0)), E.eq(E.var('handled'), E.num(1))), [
        S.set('hpc', E.item('HdPc', E.var('hdTop'))),
        S.set('hsp', E.item('HdSt', E.var('hdTop'))),
        S.set('hfr', E.item('HdFr', E.var('hdTop'))),
        S.chg('hdTop', E.num(-1)),
        S.If(E.le(E.var('hfr'), E.var('frTop')), [
          S.set('sp', E.var('hsp')), S.set('frTop', E.var('hfr')),
          // An exception thrown inside a comprehension never reaches that comprehension's
          // LCEND, which would leave the frame pointing at the temporary map (and its loop
          // variable) for the rest of the frame's life.  Pop every comprehension scope the
          // frame we are returning to still has open.
          S.Until(E.not(E.eq(E.item('MapKind', E.item('FrEnv', E.var('frTop'))), E.str('L'))), [
            S.lset('FrEnv', E.var('frTop'), E.item('MapParent', E.item('FrEnv', E.var('frTop')))),
          ]),
          S.set('pc', E.sub(E.var('hpc'), E.num(1))),
          S.set('handled', E.num(1)),
          ...vpush(E.var('curEx')),
        ]),
      ]),
      S.If(E.eq(E.var('handled'), E.num(0)), [
        ...excDesc(E.var('curEx'), 'exs'),
        ...L.failAt(E.join(E.str('Uncaught: '), E.var('exs')), E.item('Iline', E.var('pc'))),
      ]),
    ];
  }
  function raiseBlock() {
    return [
      ...vpop('curEx'),
      // raise ValueError (a class, not an instance) behaves like ValueError()
      S.If(E.eq(E.letter(E.num(1), E.var('curEx')), E.str('C')), [
        ...L.payInto(E.var('curEx'), 'rxi'),
        S.If(E.le(E.var('rxi'), E.num(NEXC)), [
          S.set('curEx', E.join(E.str('X'), E.join(E.var('rxi'), E.str('|')))),
        ]),
      ]),
      ...unwind(),
    ];
  }
  // bare raise: re-raise whatever the enclosing except block is handling
  function raiseReBlock() {
    return [
      S.set('rax', E.var('actEx')),
      S.If(E.gt(E.slen(E.var('rax')), E.num(0)), [
        S.set('curEx', E.var('rax')),
        ...unwind(),
      ], [
        ...raiseBuiltin('RuntimeError', 'No active exception to reraise'),
      ]),
    ];
  }
  function reraiseBlock() { return [...unwind()]; }
  const NEXC = EXCNAMES.length;
  // exception values are 'X<class index>|<message>'; the class index is the same numbering
  // the exception classes use in ClName, so isinstance/except matching can walk ClBase.
  const excVal = (name, msg) => {
    const head = E.str('X' + (EXCNAMES.indexOf(name) + 1) + '|');
    if (msg === undefined) return head;
    // msg is either a plain string or an already built expression
    return E.join(head, typeof msg === 'string' ? E.str(msg) : msg);
  };
  const raiseBuiltin = (name, msg) => [S.set('raised', E.num(1)), S.set('curEx', excVal(name, msg)), ...unwind()];
  // text after the '|' of an exception value
  const xmsg = (v, dst) => [
    S.set(dst, E.str('')), S.set('xj', E.num(1)), S.set('xhit', E.num(0)),
    S.Until(E.gt(E.var('xj'), E.slen(v)), [
      S.If(E.eq(E.letter(E.var('xj'), v), E.str('|')), [S.set('xhit', E.num(1))], [
        S.If(E.eq(E.var('xhit'), E.num(1)), [S.set(dst, E.join(E.var(dst), E.letter(E.var('xj'), v)))]),
      ]),
      S.chg('xj', E.num(1)),
    ]),
  ];
  // class index of an exception value (X<idx>|...) or of a class tag (C<idx>)
  const xclass = (v, dst) => [
    S.set(dst, E.str('')), S.set('xj', E.num(2)),
    S.Until(E.or(E.gt(E.var('xj'), E.slen(v)), E.eq(E.letter(E.var('xj'), v), E.str('|'))), [
      S.set(dst, E.join(E.var(dst), E.letter(E.var('xj'), v))),
      S.chg('xj', E.num(1)),
    ]),
  ];
  // 'ZeroDivisionError: division by zero' (or just the class name when there is no message)
  const excDesc = (v, dst) => [
    S.set('xdt', E.letter(E.num(1), v)),
    S.If(E.eq(E.var('xdt'), E.str('X')), [
      ...xclass(v, 'xdc'), ...xmsg(v, 'xdm'),
      S.set(dst, E.item('ClName', E.var('xdc'))),
      S.If(E.gt(E.slen(E.var('xdm')), E.num(0)), [
        S.set(dst, E.join(E.var(dst), E.join(E.str(': '), E.var('xdm')))),
      ]),
    ], [
      S.If(E.eq(E.var('xdt'), E.str('C')), [
        ...L.payInto(v, 'xdc'), S.set(dst, E.item('ClName', E.var('xdc'))),
      ], [
        ...L.payInto(v, 'xdc'),
        S.If(E.gt(E.slen(E.var('xdc')), E.num(0)), [S.set(dst, E.var('xdc'))], [...tostr(v, dst)]),
      ]),
    ]),
  ];
  // the name part of an opcode operand ('zzz|000' -> 'zzz')
  const plainName = (v, dst) => [
    S.set(dst, E.str('')), S.set('xj', E.num(1)),
    S.Until(E.or(E.gt(E.var('xj'), E.slen(v)), E.eq(E.letter(E.var('xj'), v), E.str('|'))), [
      S.set(dst, E.join(E.var(dst), E.letter(E.var('xj'), v))),
      S.chg('xj', E.num(1)),
    ]),
  ];

  // ---------------- calls ----------------
  function callUser(fid) {
    // resolve one parameter name (in acc) to an argument slot: a keyword argument wins over
    // the positional cursor ai.
    const bindParam = (fd) => [
      // the parameter spec may carry a literal default: 'b|0=3' / 'b|0=Sx' / 'b|0=Z'
      S.set('pnm', E.var('acc')), S.set('pdv', E.str('')), S.set('j2', E.num(1)),
      S.Until(E.or(E.gt(E.var('j2'), E.slen(E.var('acc'))), E.not(E.eq(E.var('pdv'), E.str('')))), [
        S.If(E.eq(E.letter(E.var('j2'), E.var('acc')), E.str('=')), [
          ...substrInto(E.var('acc'), E.num(1), E.sub(E.var('j2'), E.num(1)), 'pnm'),
          ...substrInto(E.var('acc'), E.add(E.var('j2'), E.num(1)), E.sub(E.slen(E.var('acc')), E.var('j2')), 'pdv'),
        ]),
        S.chg('j2', E.num(1)),
      ]),
      S.set('kwhit', E.num(0)), S.set('argi', E.num(0)), S.set('f2', E.num(2)),
      // kw fields carry the same keyed spelling as the parameter name
      S.Until(E.gt(E.var('f2'), E.var('nargs')), [
        ...nthField(E.var('cai'), E.var('f2'), 'knm2'),
        S.If(E.eq(E.var('knm2'), E.var('pnm')), [
          S.set('argi', E.sub(E.var('f2'), E.num(1))), S.set('kwhit', E.num(1)),
        ]),
        S.chg('f2', E.num(1)),
      ]),
      // otherwise take the next argument that no keyword claimed
      S.If(E.eq(E.var('kwhit'), E.num(0)), [
        S.If(E.le(E.var('pqi'), E.len('PosQ')), [
          S.set('argi', E.sub(E.item('PosQ', E.var('pqi')), E.num(1))),
          S.chg('pqi', E.num(1)),
        ]),
      ]),
      S.set('bval', E.str('Z')), S.set('bmis', E.num(1)),
      S.If(E.and(E.gt(E.var('argi'), E.num(0)), E.le(E.add(E.var('argi'), E.num(1)), E.var('nargs'))), [
        S.set('bval', E.item('Stk', E.add(E.var('ubase'), E.add(E.var('argi'), E.num(1))))),
        S.set('bmis', E.num(0)),
      ]),
      S.If(E.and(E.eq(E.var('bmis'), E.num(1)), E.not(E.eq(E.var('pdv'), E.str('')))), [
        S.set('bval', E.var('pdv')),
      ]),
      ...bindSet(E.var('uenv'), E.var('pnm'), E.var('bval'), fd),
    ];
    return [
      S.set('pspec', E.item('FnParam', fid)),
      ...mapNew('uenv', E.item('FnEnv', fid), E.str('F')),
      S.set('ai', E.num(2)), S.set('pn', E.num(1)), S.set('acc', E.str('')), S.set('starm', E.num(0)),
      S.ldelall('PosQ'), S.set('f2', E.num(2)),
      S.Until(E.gt(E.var('f2'), E.var('nargs')), [
        ...nthField(E.var('cai'), E.var('f2'), 'knm2'),
        S.If(E.eq(E.var('knm2'), E.str('')), [S.ladd('PosQ', E.var('f2'))]),
        S.chg('f2', E.num(1)),
      ]),
      S.set('pqi', E.num(1)),
      S.Until(E.gt(E.var('pn'), E.slen(E.var('pspec'))), [
        S.If(E.eq(E.letter(E.var('pn'), E.var('pspec')), E.str(';')), [
          S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [
            S.set('acc2', E.var('acc')),
            S.If(E.eq(E.var('starm'), E.num(2)), [
              // **kwargs: every keyword argument no parameter claimed, as a dict
              ...mapNew('kwd', E.num(0), E.str('D')),
              S.set('f2', E.num(2)),
              S.Until(E.gt(E.var('f2'), E.var('nargs')), [
                ...nthField(E.var('cai'), E.var('f2'), 'kfn'),
                S.If(E.gt(E.slen(E.var('kfn')), E.num(0)), [
                  S.set('kclaim', E.num(0)), S.set('pi2', E.num(1)), S.set('pnm2', E.str('')),
                  S.Until(E.gt(E.var('pi2'), E.slen(E.var('pspec'))), [
                    S.If(E.eq(E.letter(E.var('pi2'), E.var('pspec')), E.str(';')), [
                      S.If(E.eq(E.var('pnm2'), E.var('kfn')), [S.set('kclaim', E.num(1))]),
                      S.set('pnm2', E.str('')),
                    ], [
                      S.set('pnm2', E.join(E.var('pnm2'), E.letter(E.var('pi2'), E.var('pspec')))),
                    ]),
                    S.chg('pi2', E.num(1)),
                  ]),
                  S.If(E.eq(E.var('kclaim'), E.num(0)), [
                    S.set('kyt', E.var('kfn')), S.set('kyi', E.num(1)), S.set('kyn', E.str('')),
                    S.Until(E.or(E.gt(E.var('kyi'), E.slen(E.var('kyt'))),
                      E.eq(E.letter(E.var('kyi'), E.var('kyt')), E.str('|'))), [
                      S.set('kyn', E.join(E.var('kyn'), E.letter(E.var('kyi'), E.var('kyt')))),
                      S.chg('kyi', E.num(1)),
                    ]),
                    ...keyOf(E.join(E.str('S'), E.var('kyn')), 'kyk'),
                    ...bindSet(E.var('kwd'), E.var('kyk'), E.item('Stk', E.add(E.var('ubase'), E.var('f2'))), 'fd9'),
                  ]),
                ]),
                S.chg('f2', E.num(1)),
              ]),
              ...bindSet(E.var('uenv'), E.var('acc2'), E.join(E.str('D'), E.var('kwd')), 'fd10'),
            ], [
            S.If(E.eq(E.var('starm'), E.num(1)), [
              ...heapNew('spl'),
              S.Until(E.gt(E.var('pqi'), E.len('PosQ')), [
                ...heapPush(E.var('spl'), E.item('Stk', E.add(E.var('ubase'), E.item('PosQ', E.var('pqi'))))),
                S.chg('pqi', E.num(1)),
              ]),
              ...bindSet(E.var('uenv'), E.var('acc'), E.join(E.str('L'), E.var('spl')), 'fd5'),
            ], [
              ...bindParam('fd5'),
            ]),
            ]),
          ]),
          S.set('acc', E.str('')), S.set('starm', E.num(0)),
        ], [
          S.If(E.eq(E.letter(E.var('pn'), E.var('pspec')), E.str('*')), [
            S.If(E.eq(E.var('starm'), E.num(1)), [S.set('starm', E.num(2))], [S.set('starm', E.num(1))]),
          ], [
            S.set('acc', E.join(E.var('acc'), E.letter(E.var('pn'), E.var('pspec')))),
          ]),
        ]),
        S.chg('pn', E.num(1)),
      ]),
      S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [
        ...bindParam('fd6'),
      ]),
      S.If(E.eq(E.var('nofr'), E.num(1)), [], [
      S.chg('frTop', E.num(1)),
      ...L.setAt('FrKind', E.var('frTop'), E.str('F')),
      ...L.setAt('FrRet', E.var('frTop'), E.add(E.var('pc'), E.num(1))),
      ...L.setAt('FrEnv', E.var('frTop'), E.var('uenv')),
      ...L.setAt('FrBase', E.var('frTop'), E.var('ubase')),
      ...L.setAt('FrAux', E.var('frTop'), E.num(0)),
      ...L.setAt('FrGlob', E.var('frTop'), E.num(0)),
      S.set('pc', E.sub(E.item('FnBody', fid), E.num(1))),
      ]),
    ];
  }
  function instantiate() {
    return [
      ...L.payInto(E.var('fval'), 'clo'),
      S.chg('iTop', E.num(1)), S.set('ino', E.var('iTop')),
      ...L.setAt('InClass', E.var('ino'), E.var('clo')),
      ...mapNew('imap', E.item('ClMap', E.var('clo')), E.str('I')),
      ...L.setAt('InMap', E.var('ino'), E.var('imap')),
      // an exception class produces an exception value so str()/type()/except keep working
      S.set('iex', E.num(0)), S.set('imv', E.str('')),
      S.If(E.le(E.var('clo'), E.num(NEXC)), [
        S.set('iex', E.num(1)),
        S.If(E.ge(E.var('nargs'), E.num(2)), [...tostr(E.item('Stk', E.add(E.var('ubase'), E.num(2))), 'imv')]),
      ]),
      S.set('ires', E.join(E.str('O'), E.var('ino'))),
      S.If(E.eq(E.var('iex'), E.num(1)), [
        S.set('ires', E.join(E.str('X'), E.join(E.var('clo'), E.join(E.str('|'), E.var('imv'))))),
      ]),
      ...lookupIn(E.item('ClMap', E.var('clo')), E.str('__init__|00000000'), 'mif'),
      S.If(E.gt(E.slen(E.var('mif')), E.num(0)), [
        ...heapNew('argl'),
        S.set('i', E.num(2)),
        S.Until(E.gt(E.var('i'), E.var('nargs')), [
          ...heapPush(E.var('argl'), E.item('Stk', E.add(E.var('ubase'), E.var('i')))),
          S.chg('i', E.num(1)),
        ]),
        S.set('sp', E.var('ubase')),
        ...vpush(E.var('mif')),
        ...vpush(E.join(E.str('O'), E.var('ino'))),
        S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.item('LCount', E.var('argl'))), [
          ...vpush(heapGet(E.var('argl'), E.var('i'))),
          S.chg('i', E.num(1)),
        ]),
        S.set('nargs', E.add(E.var('nargs'), E.num(1))),
        ...L.payInto(E.var('mif'), 'mifid'),
        ...callUser(E.var('mifid')),
        S.lset('FrKind', E.var('frTop'), E.str('I')),
        S.lset('FrAux', E.var('frTop'), E.var('ino')),
      ], [
        S.set('sp', E.var('ubase')),
        ...vpush(E.var('ires')),
      ]),
    ];
  }
  function callBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('nargs', E.num(2)), S.set('j', E.num(1)), S.set('cai', E.str('')),
      S.Until(E.gt(E.var('j'), E.slen(ia())), [
        S.If(E.eq(E.letter(E.var('j'), ia()), E.str('|')), [
          ...substrInto(ia(), E.num(1), E.sub(E.var('j'), E.num(1)), 'cai'),
          ...substrInto(ia(), E.add(E.var('j'), E.num(1)), E.sub(E.slen(ia()), E.var('j')), 'nargs'),
        ]),
        S.chg('j', E.num(1)),
      ]),
      S.set('ubase', E.sub(E.var('sp'), E.var('nargs'))),
      S.set('fval', E.item('Stk', E.add(E.var('ubase'), E.num(1)))),
      S.set('ft', E.letter(E.num(1), E.var('fval'))),
      S.If(E.eq(E.var('ft'), E.str('F')), [
        ...L.payInto(E.var('fval'), 'fid'),
        S.If(E.eq(E.item('FnKind', E.var('fid')), E.str('b')), [
          S.set('bname', E.item('FnName', E.var('fid'))),
          ...builtinBody(),
        ], [
          S.If(E.eq(E.item('FnFlags', E.var('fid')), E.str('g')), [
            S.set('nofr', E.num(1)),
            ...callUser(E.var('fid')),
            S.set('nofr', E.num(0)),
            ...genNew(E.var('fid'), 'gid'),
            S.set('sp', E.var('ubase')),
            ...vpush(E.join(E.str('G'), E.var('gid'))),
          ], [
            ...callUser(E.var('fid')),
          ]),
        ]),
      ]),
      S.If(E.eq(E.var('ft'), E.str('C')), [instantiate()]),
      S.If(E.eq(E.var('ft'), E.str('Z')), [...L.failAt(E.str('TypeError: not callable'), E.item('Iline', E.var('pc')))]),
    ];
  }
  // ---------------- builtins ----------------
  function builtinBody() {
    const bn = () => E.var('bname');
    const arg = (k) => E.item('Stk', E.add(E.var('ubase'), E.num(k)));
    const drop = () => [S.chg('sp', E.mul(E.num(-1), E.var('nargs')))];
    const num1 = (dst, k) => L.payInto(arg(k), dst);
    return [
      S.set('raised', E.num(0)),
      S.If(E.eq(bn(), E.str('print|00000')), [
        S.set('out', E.str('')), S.set('first', E.num(1)), S.set('i', E.num(2)), S.set('sepv', E.str(' ')),
        S.set('kws', E.var('cai')),
S.Until(E.gt(E.var('i'), E.var('nargs')), [
          ...nthField(E.var('kws'), E.var('i'), 'knm'),
          S.If(E.eq(E.var('knm'), E.str('sep|000')), [
            ...tostr(E.item('Stk', E.add(E.var('ubase'), E.var('i'))), 'argt'),
            S.set('sepv', E.var('argt')),
          ]),
          S.set('i', E.add(E.var('i'), E.num(1))),
        ]),
        S.set('i', E.num(2)), S.set('first', E.num(1)), S.set('out', E.str('')),
        S.Until(E.gt(E.var('i'), E.var('nargs')), [
          ...nthField(E.var('kws'), E.var('i'), 'knm'),
          S.If(E.not(E.eq(E.var('knm'), E.str('sep|000'))), [
            ...tostr(E.item('Stk', E.add(E.var('ubase'), E.var('i'))), 'argt'),
            S.If(E.eq(E.var('first'), E.num(0)), [S.set('out', E.join(E.var('out'), E.var('sepv')))]),
            S.set('out', E.join(E.var('out'), E.var('argt'))),
            S.set('first', E.num(0)),
          ]),
          S.set('i', E.add(E.var('i'), E.num(1))),
        ]),
        ...drop(),
        ...vmPrint(E.var('out')),
        ...vpush(E.str('Z')),
      ]),
      S.If(E.eq(bn(), E.str('len|000')), [
        S.set('res2', E.num(0)),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [S.set('res2', E.sub(E.slen(arg(2)), E.num(1)))]),
        S.If(E.or(E.eq(E.letter(E.num(1), arg(2)), E.str('L')), E.eq(E.letter(E.num(1), arg(2)), E.str('T'))), [
          ...L.payInto(arg(2), 'lso'), S.set('res2', E.item('LCount', E.var('lso'))),
        ]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('D')), [
          ...L.payInto(arg(2), 'dmo'), S.set('res2', E.num(0)),
          S.set('bk2', E.item('MapHead', E.var('dmo'))),
          S.Until(E.lt(E.var('bk2'), E.num(1)), [
            S.set('res2', E.add(E.var('res2'), E.num(1))),
            S.set('bk2', E.item('BindNext', E.var('bk2'))),
          ]),
        ]),
        ...drop(),
        ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('range|00000')), [rangeBuiltin()]),
      S.If(E.or(E.eq(bn(), E.str('max|000')), E.eq(bn(), E.str('min|000'))), [
        S.set('mxk', E.num(0)), S.set('mxn', E.sub(E.var('nargs'), E.num(1))),
        S.If(E.eq(E.var('nargs'), E.num(2)), [
          S.If(E.or(E.eq(E.letter(E.num(1), arg(2)), E.str('L')), E.eq(E.letter(E.num(1), arg(2)), E.str('T'))), [
            ...L.payInto(arg(2), 'mxo'), S.set('mxk', E.num(1)), S.set('mxn', E.item('LCount', E.var('mxo'))),
          ]),
        ]),
        S.set('res2', E.str('Z')),
        S.If(E.gt(E.var('mxn'), E.num(0)), [
          S.If(E.eq(E.var('mxk'), E.num(1)), [S.set('mxv', heapGet(E.var('mxo'), E.num(1)))], [
            S.set('mxv', E.item('Stk', E.add(E.var('ubase'), E.num(2)))),
          ]),
          S.set('mxi', E.num(2)),
          S.Until(E.gt(E.var('mxi'), E.var('mxn')), [
            S.If(E.eq(E.var('mxk'), E.num(1)), [
              S.set('mxc', heapGet(E.var('mxo'), E.var('mxi'))),
            ], [
              S.set('mxc', E.item('Stk', E.add(E.var('ubase'), E.add(E.var('mxi'), E.num(1))))),
            ]),
            S.set('mxb', E.str('B0')),
            S.If(E.eq(bn(), E.str('max|000')), [
              ...cmpPair(E.var('mxc'), E.var('mxv'), E.str('>'), 'mxb'),
            ], [
              ...cmpPair(E.var('mxc'), E.var('mxv'), E.str('<'), 'mxb'),
            ]),
            S.If(E.eq(E.var('mxb'), E.str('B1')), [S.set('mxv', E.var('mxc'))]),
            S.chg('mxi', E.num(1)),
          ]),
          S.set('res2', E.var('mxv')),
        ]),
        ...drop(),
        ...vpush(E.var('res2')),
      ]),
      S.If(E.eq(bn(), E.str('pow|000')), [
        ...num1('na', 2), ...num1('nb', 3),
        S.set('res2', E.num(1)),
        S.Repeat(E.math('abs', E.var('nb')), [S.set('res2', E.mul(E.var('res2'), E.var('na')))]),
        S.If(E.lt(E.var('nb'), E.num(0)), [S.set('res2', E.div(E.num(1), E.var('res2')))]),
        ...drop(),
        ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('input|00000')), [
        // input(prompt): show the prompt with Scratch's ask box, wait for the typed line and
        // return it as a string (Python never converts the answer).  v4 had this in callfn;
        // the v5 kernel rewrite dropped it, which broke the shell's own input demos.
        S.set('ipr', E.str('')),
        S.If(E.ge(E.var('nargs'), E.num(2)), [...tostr(arg(2), 'ipr')]),
        S.set('status', E.str('Waiting for input')),
        S.set('dirty', E.num(1)),
        S.raw('sensing_askandwait', [['QUESTION', E.var('ipr'), 'rep']]),
        S.set('res2', E.join(E.str('S'), E.ans())),
        S.set('status', E.str('Running')),
        ...drop(), ...vpush(E.var('res2')),
      ]),
      S.If(E.eq(bn(), E.str('round|00000')), [
        ...num1('na', 2), S.set('nd', E.num(0)),
        S.If(E.ge(E.var('nargs'), E.num(3)), [...num1('nd', 3)]),
        S.set('sc', E.num(1)),
        S.Repeat(E.var('nd'), [S.set('sc', E.mul(E.var('sc'), E.num(10)))]),
        S.set('xv2', E.mul(E.var('na'), E.var('sc'))),
        S.set('fl', E.math('floor', E.var('xv2'))),
        S.set('res2', E.var('fl')),
        S.If(E.gt(E.sub(E.var('xv2'), E.var('fl')), E.num(0.5)), [S.set('res2', E.add(E.var('fl'), E.num(1)))]),
        S.If(E.eq(E.sub(E.var('xv2'), E.var('fl')), E.num(0.5)), [
          S.If(E.ne(E.mod(E.var('fl'), E.num(2)), E.num(0)), [S.set('res2', E.add(E.var('fl'), E.num(1)))]),
        ]),
        S.set('res2', E.div(E.var('res2'), E.var('sc'))),
        ...drop(),
        ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('sum|000')), [
        ...L.payInto(arg(2), 'lso'),
        S.set('res2', E.num(0)),
        S.If(E.ge(E.var('nargs'), E.num(3)), [...L.payInto(arg(3), 'sv0'), S.set('res2', E.var('sv0'))]),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('lso')), [
          ...L.payInto(heapGet(E.var('lso'), E.var('i')), 'av2'),
          S.set('res2', E.add(E.var('res2'), E.var('av2'))),
          S.chg('i', E.num(1)),
        ]),
        ...drop(),
        ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str(key('divmod'))), [
        // divmod(a, b) -> (a // b, a % b), with Python's floor semantics
        ...L.payInto(arg(2), 'dma'),
        ...L.payInto(arg(3), 'dmb'),
        S.If(E.eq(E.var('dmb'), E.num(0)), [...raiseBuiltin('ZeroDivisionError')], [
          S.set('dmq', E.math('floor', E.div(E.var('dma'), E.var('dmb')))),
          ...heapNew('dmt'),
          ...heapPush(E.var('dmt'), E.var('dmq')),
          ...heapPush(E.var('dmt'), E.sub(E.var('dma'), E.mul(E.var('dmb'), E.var('dmq')))),
          ...drop(),
          ...vpush(E.join(E.str('T'), E.var('dmt'))),
        ]),
      ]),
      S.If(E.eq(bn(), E.str(sortKeyName())), [
        // __sortpairs(pairs, reverse): pairs is a list of (key, value) tuples built by the
        // compiler for sorted(..., key=f); sort it by the first element and return the values.
        ...L.payInto(arg(2), 'pl'),
        S.set('rvs', E.num(0)),
        ...truthOf(arg(3), 'rv'),
        S.If(E.eq(E.var('rv'), E.num(1)), [S.set('rvs', E.num(1))]),
        S.set('i', E.num(2)),
        // insertion sort over the existing pair list: count-1 passes, i = 2..count
        S.Repeat(E.sub(E.item('LCount', E.var('pl')), E.num(1)), [
          S.set('k2', E.var('i')),
          S.Until(E.le(E.var('k2'), E.num(1)), [
            ...L.payInto(heapGet(E.var('pl'), E.sub(E.var('k2'), E.num(1))), 'paid'),
            ...L.payInto(heapGet(E.var('pl'), E.var('k2')), 'pbid'),
            S.set('ka', heapGet(E.var('paid'), E.num(1))),
            S.set('kb', heapGet(E.var('pbid'), E.num(1))),
            ...cmpPair(E.var('ka'), E.var('kb'), E.str('>'), 'cre'),
            S.set('swp', E.var('cre')),
            S.If(E.eq(E.var('rvs'), E.num(1)), [
              ...cmpPair(E.var('ka'), E.var('kb'), E.str('<'), 'cre2'),
              S.set('swp', E.var('cre2')),
            ]),
            S.If(E.eq(E.var('swp'), E.str('B1')), [
              S.set('tv2', heapGet(E.var('pl'), E.sub(E.var('k2'), E.num(1)))),
              S.lset('LArr', E.add(E.item('LStart', E.var('pl')), E.sub(E.var('k2'), E.num(2))),
                heapGet(E.var('pl'), E.var('k2'))),
              S.lset('LArr', E.add(E.item('LStart', E.var('pl')), E.sub(E.var('k2'), E.num(1))), E.var('tv2')),
              S.chg('k2', E.num(-1)),
            ], [S.set('k2', E.num(1))]),
          ]),
          S.chg('i', E.num(1)),
        ]),
        ...heapNew('tobj'),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('pl')), [
          ...L.payInto(heapGet(E.var('pl'), E.var('i')), 'paid2'),
          ...heapPush(E.var('tobj'), heapGet(E.var('paid2'), E.num(2))),
          S.chg('i', E.num(1)),
        ]),
        ...drop(),
        ...vpush(E.join(E.str('L'), E.var('tobj'))),
      ]),
      S.If(E.eq(bn(), E.str('sorted|000000')), [
        ...L.payInto(arg(2), 'lso'),
        // A key argument is rewritten by the compiler into __sortpairs; if one still
        // reaches this builtin the shape was not supported, so fail loudly.
        S.set('revs', E.num(0)),
        S.If(E.ge(E.var('nargs'), E.num(3)), [
          ...nthField(E.var('cai'), E.num(3), 'kwn'),
          S.If(E.eq(E.var('kwn'), E.str('reverse|0000000')), [
            ...truthOf(arg(3), 'rvv'),
            S.If(E.eq(E.var('rvv'), E.num(1)), [S.set('revs', E.num(1))]),
          ], [
            // a key argument reaching the builtin means the compiler could not inline it
            ...raiseBuiltin('NotImplementedError'),
          ]),
        ]),
        ...heapNew('tobj'),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('lso')), [
          ...heapPush(E.var('tobj'), heapGet(E.var('lso'), E.var('i'))),
          S.set('k2', E.item('LCount', E.var('tobj'))),
          S.Until(E.le(E.var('k2'), E.num(1)), [
            S.set('av2', heapGet(E.var('tobj'), E.sub(E.var('k2'), E.num(1)))),
            S.set('bv2', heapGet(E.var('tobj'), E.var('k2'))),
            ...cmpPair(E.var('av2'), E.var('bv2'), E.str('>'), 'scre'),
            S.If(E.eq(E.var('scre'), E.str('B1')), [
              S.set('tv2', heapGet(E.var('tobj'), E.sub(E.var('k2'), E.num(1)))),
              S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('k2'), E.num(2))),
                heapGet(E.var('tobj'), E.var('k2'))),
              S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('k2'), E.num(1))), E.var('tv2')),
              S.chg('k2', E.num(-1)),
            ], [S.set('k2', E.num(1))]),
          ]),
          S.chg('i', E.num(1)),
        ]),
        S.If(E.eq(E.var('revs'), E.num(1)), [
          S.set('si', E.num(1)), S.set('sj', E.item('LCount', E.var('tobj'))),
          S.Until(E.ge(E.var('si'), E.var('sj')), [
            S.set('sv1', heapGet(E.var('tobj'), E.var('si'))),
            S.set('sv2', heapGet(E.var('tobj'), E.var('sj'))),
            S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('si'), E.num(1))), E.var('sv2')),
            S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('sj'), E.num(1))), E.var('sv1')),
            S.chg('si', E.num(1)), S.chg('sj', E.num(-1)),
          ]),
        ]),
        ...drop(),
        ...vpush(E.join(E.str('L'), E.var('tobj'))),
      ]),
      S.If(E.eq(bn(), E.str('int|000')), [
        S.If(E.and(E.eq(E.var('nargs'), E.num(2)), E.eq(E.letter(E.num(1), arg(2)), E.str('S'))), [
          // int('12x') is a ValueError in Python, not 0
          ...intFromStr(arg(2), 'res2'),
          S.If(E.eq(E.var('raised'), E.num(0)), [
            ...drop(), ...vpush(E.join(E.str(''), E.var('res2'))),
          ]),
        ], [
        S.If(E.ge(E.var('nargs'), E.num(3)), [
          ...L.payInto(arg(2), 'ina'), ...L.payInto(arg(3), 'inb'),
          S.set('res2', E.num(0)), S.set('i', E.num(1)), S.set('ing', E.num(1)),
          S.If(E.eq(E.letter(E.num(1), E.var('ina')), E.str('-')), [S.set('ing', E.num(-1)), S.set('i', E.num(2))]),
          S.Until(E.gt(E.var('i'), E.slen(E.var('ina'))), [
            ...L.charCode(E.letter(E.var('i'), E.var('ina')), 'inc'),
            S.set('ind2', E.sub(E.var('inc'), E.num(17))),
            S.If(E.and(E.ge(E.var('inc'), E.num(34)), E.le(E.var('inc'), E.num(59))), [S.set('ind2', E.sub(E.var('inc'), E.num(24)))]),
            S.If(E.and(E.ge(E.var('inc'), E.num(66)), E.le(E.var('inc'), E.num(91))), [S.set('ind2', E.sub(E.var('inc'), E.num(56)))]),
            S.set('res2', E.add(E.mul(E.var('res2'), E.var('inb')), E.var('ind2'))),
            S.chg('i', E.num(1)),
          ]),
          S.set('res2', E.mul(E.var('res2'), E.var('ing'))),
          ...drop(), ...vpush(E.join(E.str(''), E.var('res2'))),
        ], [
          // Python's int() truncates toward zero (Scratch's round() would round half up)
          ...num1('na', 2), ...drop(),
          S.set('na2', E.math('floor', E.var('na'))),
          S.If(E.lt(E.var('na'), E.num(0)), [S.set('na2', E.math('ceiling', E.var('na')))]),
          ...vpush(E.join(E.str(''), E.var('na2'))),
        ]),
        ]),
      ]),
      S.If(E.eq(bn(), E.str('float|00000')), [
        ...num1('na', 2), ...drop(), ...floatRepr(E.var('na'), 'res2'), ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('abs|000')), [
        ...num1('na', 2), ...drop(), ...vpush(E.join(E.str(''), E.math('abs', E.var('na')))),
      ]),
      S.If(E.eq(bn(), E.str('str|000')), [
        ...tostr(arg(2), 'res2'), ...drop(), ...vpush(E.join(E.str('S'), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('repr|0000')), [
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [
          ...L.payInto(arg(2), 'rpp'),
          S.set('res2', E.join(E.str("'"), E.join(E.var('rpp'), E.str("'")))),
        ], [
          ...tostr(arg(2), 'res2'),
        ]),
        ...drop(), ...vpush(E.join(E.str('S'), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('list|0000')), [
        S.set('res2', arg(2)),
        S.If(E.or(E.eq(E.letter(E.num(1), arg(2)), E.str('T')), E.eq(E.letter(E.num(1), arg(2)), E.str('L'))), [
          ...L.payInto(arg(2), 'lso'), ...heapNew('lnw'),
          S.set('i', E.num(1)),
          S.Repeat(E.item('LCount', E.var('lso')), [
            ...heapPush(E.var('lnw'), heapGet(E.var('lso'), E.var('i'))), S.chg('i', E.num(1)),
          ]),
          S.set('res2', E.join(E.str('L'), E.var('lnw'))),
        ]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [
          ...L.payInto(arg(2), 'lso2'), ...heapNew('lnw'),
          S.set('i', E.num(1)),
          S.Repeat(E.slen(E.var('lso2')), [
            ...heapPush(E.var('lnw'), E.join(E.str('S'), E.letter(E.var('i'), E.var('lso2')))),
            S.chg('i', E.num(1)),
          ]),
          S.set('res2', E.join(E.str('L'), E.var('lnw'))),
        ]),
        ...drop(), ...vpush(E.var('res2')),
      ]),
      S.If(E.or(E.eq(bn(), E.str('any|000')), E.eq(bn(), E.str('all|000'))), [
        ...L.payInto(arg(2), 'lso'),
        S.set('res2', E.str('B0')),
        S.If(E.eq(bn(), E.str('all|000')), [S.set('res2', E.str('B1'))]),
        S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.item('LCount', E.var('lso'))), [
          ...truthOf(heapGet(E.var('lso'), E.var('i')), 'tb'),
          S.If(E.eq(bn(), E.str('all|000')), [
            S.If(E.eq(E.var('tb'), E.num(0)), [S.set('res2', E.str('B0')), S.set('i', E.add(E.item('LCount', E.var('lso')), E.num(1)))]),
          ], [
            S.If(E.eq(E.var('tb'), E.num(1)), [S.set('res2', E.str('B1')), S.set('i', E.add(E.item('LCount', E.var('lso')), E.num(1)))]),
          ]),
          S.chg('i', E.num(1)),
        ]),
        ...drop(), ...vpush(E.var('res2')),
      ]),
      S.If(E.eq(bn(), E.str('enumerate|000000000')), [
        ...L.payInto(arg(2), 'lso'), ...heapNew('tobj'), S.set('i', E.num(1)),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [
          ...L.payInto(arg(2), 'nstr'),
          S.Repeat(E.slen(E.var('nstr')), [
            ...heapNew('tup'),
            ...heapPush(E.var('tup'), E.join(E.str(''), E.sub(E.var('i'), E.num(1)))),
            ...heapPush(E.var('tup'), E.join(E.str('S'), E.letter(E.var('i'), E.var('nstr')))),
            ...heapPush(E.var('tobj'), E.join(E.str('T'), E.var('tup'))),
            S.chg('i', E.num(1)),
          ]),
        ]),
        S.Repeat(E.item('LCount', E.var('lso')), [
          ...heapNew('tup'),
          ...heapPush(E.var('tup'), E.join(E.str(''), E.sub(E.var('i'), E.num(1)))),
          ...heapPush(E.var('tup'), heapGet(E.var('lso'), E.var('i'))),
          ...heapPush(E.var('tobj'), E.join(E.str('T'), E.var('tup'))),
          S.chg('i', E.num(1)),
        ]),
        ...drop(), ...vpush(E.join(E.str('L'), E.var('tobj'))),
      ]),
      S.If(E.eq(bn(), E.str('zip|000')), [
        ...L.payInto(arg(2), 'lsa'), ...L.payInto(arg(3), 'lsb'),
        S.set('zn', E.item('LCount', E.var('lsa'))),
        S.If(E.lt(E.item('LCount', E.var('lsb')), E.var('zn')), [S.set('zn', E.item('LCount', E.var('lsb')))]),
        ...heapNew('tobj'), S.set('i', E.num(1)),
        S.Repeat(E.var('zn'), [
          ...heapNew('tup'),
          ...heapPush(E.var('tup'), heapGet(E.var('lsa'), E.var('i'))),
          ...heapPush(E.var('tup'), heapGet(E.var('lsb'), E.var('i'))),
          ...heapPush(E.var('tobj'), E.join(E.str('T'), E.var('tup'))),
          S.chg('i', E.num(1)),
        ]),
        ...drop(), ...vpush(E.join(E.str('L'), E.var('tobj'))),
      ]),
      S.If(E.eq(bn(), E.str('bool|0000')), [
        ...truthOf(arg(2), 'tb'), S.set('res2', E.str('B0')),
        S.If(E.eq(E.var('tb'), E.num(1)), [S.set('res2', E.str('B1'))]),
        ...drop(), ...vpush(E.var('res2')),
      ]),
      S.If(E.eq(bn(), E.str('type|0000')), [
        S.set('res2', E.str("<class 'int'>")),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('C')), [...L.payInto(arg(2), 'tyi'), S.set('res2', E.join(E.str("<class '"), E.join(E.item('ClName', E.var('tyi')), E.str("'>"))))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('X')), [...xclass(arg(2), 'tyi'), S.set('res2', E.join(E.str("<class '"), E.join(E.item('ClName', E.var('tyi')), E.str("'>"))))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('O')), [...L.payInto(arg(2), 'tyo'), S.set('res2', E.join(E.str("<class '"), E.join(E.item('ClName', E.item('InClass', E.var('tyo'))), E.str("'>"))))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('S')), [S.set('res2', E.str("<class 'str'>"))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('B')), [S.set('res2', E.str("<class 'bool'>"))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('Z')), [S.set('res2', E.str("<class 'NoneType'>"))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('L')), [S.set('res2', E.str("<class 'list'>"))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('T')), [S.set('res2', E.str("<class 'tuple'>"))]),
        S.If(E.eq(E.letter(E.num(1), arg(2)), E.str('D')), [S.set('res2', E.str("<class 'dict'>"))]),
        ...drop(), ...vpush(E.join(E.str('S'), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('ord|000')), [
        ...L.payInto(arg(2), 'na'),
        ...L.charCode(E.letter(E.num(1), E.var('na')), 'ca'),
        S.set('res2', E.add(E.var('ca'), E.num(31))),
        ...drop(), ...vpush(E.join(E.str(''), E.var('res2'))),
      ]),
      S.If(E.eq(bn(), E.str('chr|000')), [
        ...num1('na', 2),
        S.set('res2', E.letter(E.sub(E.var('na'), E.num(31)), E.str(CHARLIST))),
        ...drop(), ...vpush(E.join(E.str('S'), E.var('res2'))),
      ]),
    ];
  }
  // Python's int(str): optional sign, decimal digits, surrounding whitespace; anything
  // else is a ValueError.  Silently returning 0 here used to hide every bad literal.
  function intFromStr(sv, dst) {
    return [
      ...L.payInto(sv, 'istr'),
      S.set('iend', E.slen(E.var('istr'))), S.set('i', E.num(1)),
      // contains(), not equals(): equality collapses zero-ish strings on some VMs, so
      // `'0' == ' '` would strip real digits out of int('0') / int('10'). See lib.isSpaceCh.
      S.Until(E.or(E.gt(E.var('i'), E.var('iend')),
        E.not(L.isSpaceCh(E.letter(E.var('i'), E.var('istr'))))), [S.chg('i', E.num(1))]),
      S.Until(E.or(E.lt(E.var('iend'), E.var('i')),
        E.not(L.isSpaceCh(E.letter(E.var('iend'), E.var('istr'))))), [S.chg('iend', E.num(-1))]),
      S.set('ing', E.num(1)), S.set('iok', E.num(1)), S.set(dst, E.num(0)),
      S.If(E.gt(E.var('i'), E.var('iend')), [S.set('iok', E.num(0))]),
      S.If(E.eq(E.letter(E.var('i'), E.var('istr')), E.str('-')), [
        S.set('ing', E.num(-1)), S.chg('i', E.num(1)),
      ]),
      S.If(E.eq(E.letter(E.var('i'), E.var('istr')), E.str('+')), [S.chg('i', E.num(1))]),
      S.If(E.gt(E.var('i'), E.var('iend')), [S.set('iok', E.num(0))]),
      S.Until(E.or(E.gt(E.var('i'), E.var('iend')), E.eq(E.var('iok'), E.num(0))), [
        ...L.charCode(E.letter(E.var('i'), E.var('istr')), 'ic'),
        S.set('idg', E.sub(E.var('ic'), E.num(17))),
        S.If(E.not(E.and(E.ge(E.var('idg'), E.num(0)), E.le(E.var('idg'), E.num(9)))), [
          S.set('iok', E.num(0)),
        ]),
        S.If(E.eq(E.var('iok'), E.num(1)), [
          S.set(dst, E.add(E.mul(E.var(dst), E.num(10)), E.var('idg'))),
          S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.var('iok'), E.num(1)), [S.set(dst, E.mul(E.var(dst), E.var('ing')))], [
        ...raiseBuiltin('ValueError', E.join(E.str("invalid literal for int() with base 10: '"),
          E.join(E.var('istr'), E.str("'")))),
      ]),
    ];
  }
  function rangeBuiltin() {
    const arg = (k) => E.item('Stk', E.add(E.var('ubase'), E.num(k)));
    return [
      S.set('r0', E.num(0)), S.set('r1', E.num(0)), S.set('r2', E.num(1)),
      S.If(E.ge(E.var('nargs'), E.num(2)), [...L.payInto(arg(2), 'r1')]),
      S.If(E.ge(E.var('nargs'), E.num(3)), [...L.payInto(arg(2), 'r0'), ...L.payInto(arg(3), 'r1')]),
      S.If(E.ge(E.var('nargs'), E.num(4)), [
        ...L.payInto(arg(4), 'r2'),
      ]),
      S.If(E.or(E.ne(E.mod(E.var('r0'), E.num(1)), E.num(0)), E.or(E.ne(E.mod(E.var('r1'), E.num(1)), E.num(0)), E.ne(E.mod(E.var('r2'), E.num(1)), E.num(0)))), [
        ...L.failAt(E.str('TypeError: range() integer argument expected'), E.item('Iline', E.var('pc'))),
      ]),
      ...heapNew('tobj'),
      S.set('rv', E.var('r0')),
      S.If(E.eq(E.var('r2'), E.num(0)), [
        ...L.failAt(E.str('ValueError: range() arg 3 must not be zero'), E.item('Iline', E.var('pc'))),
      ], [
        S.If(E.gt(E.var('r2'), E.num(0)), [
          S.Until(E.ge(E.var('rv'), E.var('r1')), [
            ...heapPush(E.var('tobj'), E.join(E.str(''), E.var('rv'))),
            S.set('rv', E.add(E.var('rv'), E.var('r2'))),
          ]),
        ], [
          S.Until(E.le(E.var('rv'), E.var('r1')), [
            ...heapPush(E.var('tobj'), E.join(E.str(''), E.var('rv'))),
            S.set('rv', E.add(E.var('rv'), E.var('r2'))),
          ]),
        ]),
      ]),
      S.chg('sp', E.mul(E.num(-1), E.var('nargs'))),
      ...vpush(E.join(E.str('L'), E.var('tobj'))),
    ];
  }
  // flat JSON parser: an explicit container stack (the code generator cannot recurse)

  function jsonLoads() {
    const arg = (k) => E.item('Stk', E.add(E.var('ubase'), E.num(k)));
    // contains() rather than operator_equals: a one character tab test also matches the
    // digit '0' on VMs whose equality collapses zero-ish strings (see lib.isSpaceCh)
    const ws = (c) => E.contains(E.str(' \n\t'), c);
    return [
      ...L.payInto(arg(2), 'jt'),
      S.set('jsi', E.num(1)), S.set('jsd', E.num(0)), S.set('jsroot', E.str('Z')),
      S.ldelall('JsSt'), S.ldelall('JsKind'), S.ldelall('JsKey'),
      S.Until(E.gt(E.var('jsi'), E.slen(E.var('jt'))), [
        S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),
        S.Until(E.or(E.gt(E.var('jsi'), E.slen(E.var('jt'))), E.not(ws(E.var('jsc')))), [
          S.chg('jsi', E.num(1)), S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),
        ]),
        S.If(E.le(E.var('jsi'), E.slen(E.var('jt'))), [
          S.set('jsv', E.str('Z')), S.set('jsnew', E.num(3)),
          S.If(E.eq(E.var('jsc'), E.str('{')), [
            ...mapNew('jso', E.num(0), E.str('D')), S.set('jsv', E.join(E.str('D'), E.var('jso'))),
            S.set('jsnew', E.num(2)), S.chg('jsi', E.num(1)),
          ]),
          S.If(E.eq(E.var('jsc'), E.str('[')), [
            ...heapNew('jso'), S.set('jsv', E.join(E.str('L'), E.var('jso'))),
            S.set('jsnew', E.num(1)), S.chg('jsi', E.num(1)),
          ]),
          S.If(E.or(E.eq(E.var('jsc'), E.str('}')), E.eq(E.var('jsc'), E.str(']'))), [
            S.If(E.gt(E.var('jsd'), E.num(0)), [
              S.ldel('JsSt', E.var('jsd')), S.ldel('JsKind', E.var('jsd')), S.ldel('JsKey', E.var('jsd')),
              S.chg('jsd', E.num(-1)),
            ]),
            S.chg('jsi', E.num(1)),
          ]),
          S.If(E.or(E.eq(E.var('jsc'), E.str(',')), E.eq(E.var('jsc'), E.str(':'))), [S.chg('jsi', E.num(1))]),
          S.If(E.eq(E.var('jsc'), E.str('"')), [
            S.chg('jsi', E.num(1)), S.set('jsb', E.str('')), S.set('jsgo', E.num(1)),
            S.Until(E.eq(E.var('jsgo'), E.num(0)), [
              S.If(E.gt(E.var('jsi'), E.slen(E.var('jt'))), [S.set('jsgo', E.num(0))], [
                S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),
                S.If(E.eq(E.var('jsc'), E.str('"')), [S.set('jsgo', E.num(0)), S.chg('jsi', E.num(1))], [
                  S.If(E.eq(E.var('jsc'), E.str('\\')), [
                    S.chg('jsi', E.num(1)), S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),
                    S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsc', E.str('\n'))]),
                    S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsc', E.str('\t'))]),
                  ]),
                  S.set('jsb', E.join(E.var('jsb'), E.var('jsc'))), S.chg('jsi', E.num(1)),
                ]),
              ]),
            ]),
            S.set('jsv', E.join(E.str('S'), E.var('jsb'))), S.set('jsnew', E.num(0)),
          ]),
          S.If(L.isNum(E.var('jsc')), [
            S.set('jsb', E.str('')), S.set('jsgo', E.num(1)),
            S.Until(E.eq(E.var('jsgo'), E.num(0)), [
              S.If(E.gt(E.var('jsi'), E.slen(E.var('jt'))), [S.set('jsgo', E.num(0))], [
                S.set('jsc', E.letter(E.var('jsi'), E.var('jt'))),
                S.If(L.isNum(E.var('jsc')), [
                  S.set('jsb', E.join(E.var('jsb'), E.var('jsc'))), S.chg('jsi', E.num(1)),
                ], [S.set('jsgo', E.num(0))]),
              ]),
            ]),
            S.set('jsv', E.var('jsb')), S.set('jsnew', E.num(0)),
          ]),
          S.If(E.eq(E.var('jsc'), E.str('t')), [S.set('jsv', E.str('B1')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),
          S.If(E.eq(E.var('jsc'), E.str('f')), [S.set('jsv', E.str('B0')), S.chg('jsi', E.num(5)), S.set('jsnew', E.num(0))]),
          S.If(E.eq(E.var('jsc'), E.str('n')), [S.set('jsv', E.str('Z')), S.chg('jsi', E.num(4)), S.set('jsnew', E.num(0))]),
          S.If(E.not(E.eq(E.var('jsnew'), E.num(3))), [
          S.If(E.eq(E.var('jsd'), E.num(0)), [S.set('jsroot', E.var('jsv'))], [
            S.If(E.eq(E.item('JsKind', E.var('jsd')), E.num(1)), [
              ...L.payInto(E.item('JsSt', E.var('jsd')), 'jsl'), ...heapPush(E.var('jsl'), E.var('jsv')),
            ], [
              S.If(E.eq(E.item('JsKey', E.var('jsd')), E.str('')), [
                S.lset('JsKey', E.var('jsd'), E.var('jsv')),
              ], [
                ...keyOf(E.item('JsKey', E.var('jsd')), 'jsk'),
                ...L.payInto(E.item('JsSt', E.var('jsd')), 'jsm'),
                ...bindSet(E.var('jsm'), E.var('jsk'), E.var('jsv'), 'fd12'),
                S.lset('JsKey', E.var('jsd'), E.str('')),
              ]),
            ]),
          ]),
          ]),
          S.If(E.or(E.eq(E.var('jsnew'), E.num(1)), E.eq(E.var('jsnew'), E.num(2))), [
            S.chg('jsd', E.num(1)),
            S.ladd('JsSt', E.var('jso')), S.ladd('JsKind', E.var('jsnew')), S.ladd('JsKey', E.str('')),
          ]),
        ]),
      ]),
      S.set('res2', E.var('jsroot')),
    ];
  }

  function caseConv(delta, lo, hi) {
    return [
      S.set('out', E.str('')), S.set('i', E.num(1)),
      S.Repeat(E.slen(E.var('na')), [
        ...L.charCode(E.letter(E.var('i'), E.var('na')), 'ca'),
        S.If(E.and(E.ge(E.var('ca'), lo), E.le(E.var('ca'), hi)), [S.chg('ca', delta)]),
        S.set('out', E.join(E.var('out'), E.letter(E.var('ca'), E.str(CHARLIST)))),
        S.chg('i', E.num(1)),
      ]),
      S.set('res2', E.join(E.str('S'), E.var('out'))),
    ];
  }
  function methBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    const ib = () => E.item('Ib', E.var('pc'));
    return [
      S.set('mname', ia()), S.set('nargs', E.add(ib(), E.num(0))), S.set('mcalled', E.num(0)),
      S.set('raised', E.num(0)),
      S.set('ubase', E.sub(E.var('sp'), E.var('nargs'))),
      S.set('obj', E.item('Stk', E.add(E.var('ubase'), E.num(1)))),
      S.set('a1', E.item('Stk', E.add(E.var('ubase'), E.num(2)))),
      S.set('a2', E.item('Stk', E.add(E.var('ubase'), E.num(3)))),
      S.set('res2', E.str('Z')),
      ...L.payInto(E.var('obj'), 'na'),
      ...L.payInto(E.var('a1'), 'nb'),
      S.If(E.eq(E.var('mname'), E.str('upper|00000')), [...caseConv(E.num(-32), E.num(66), E.num(91))]),
      S.If(E.eq(E.var('mname'), E.str('lower|00000')), [...caseConv(E.num(32), E.num(34), E.num(59))]),
      S.If(E.eq(E.var('mname'), E.str('sort|0000')), [
        ...L.payInto(E.var('obj'), 'lso'), ...listSort(E.var('lso')),
      ]),
      S.If(E.eq(E.var('mname'), E.str('reverse|0000000')), [
        ...L.payInto(E.var('obj'), 'lso'),
        S.set('si', E.num(1)), S.set('sj', E.item('LCount', E.var('lso'))),
        S.Until(E.ge(E.var('si'), E.var('sj')), [
          S.set('sv1', heapGet(E.var('lso'), E.var('si'))), S.set('sv2', heapGet(E.var('lso'), E.var('sj'))),
          S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.sub(E.var('si'), E.num(1))), E.var('sv2')),
          S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.sub(E.var('sj'), E.num(1))), E.var('sv1')),
          S.chg('si', E.num(1)), S.chg('sj', E.num(-1)),
        ]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('index|00000')), [
        ...L.payInto(E.var('obj'), 'lso'),
        ...listFind(E.var('lso'), E.var('a1'), 'res2'),
        S.If(E.lt(E.var('res2'), E.num(0)), [...raiseBuiltin('ValueError', 'list.index(x): x not in list')]),
      ]),
      S.If(E.and(E.eq(E.var('mname'), E.str('count|00000')), E.not(E.eq(E.letter(E.num(1), E.var('obj')), E.str('S')))), [
        ...L.payInto(E.var('obj'), 'lso'),
        S.set('res2', E.num(0)), S.set('fi', E.num(1)),
        S.Until(E.gt(E.var('fi'), E.item('LCount', E.var('lso'))), [
          ...strEq(heapGet(E.var('lso'), E.var('fi')), E.var('a1'), 'se8'),
          S.If(E.eq(E.var('se8'), E.num(1)), [S.set('res2', E.add(E.var('res2'), E.num(1)))]),
          S.chg('fi', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('remove|000000')), [
        ...L.payInto(E.var('obj'), 'lso'),
        ...listFind(E.var('lso'), E.var('a1'), 'rix'),
        S.If(E.ge(E.var('rix'), E.num(0)), [...listRemoveAt(E.var('lso'), E.var('rix'))], [...raiseBuiltin('ValueError', 'list.remove(x): x not in list')]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('insert|000000')), [
        ...L.payInto(E.var('obj'), 'lso'), ...L.payInto(E.var('a1'), 'ixp'),
        ...heapEnsure(E.var('lso'), E.add(E.item('LCount', E.var('lso')), E.num(1))),
        S.set('ri', E.item('LCount', E.var('lso'))),
        S.Until(E.le(E.var('ri'), E.var('ixp')), [
          S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.var('ri')), heapGet(E.var('lso'), E.var('ri'))),
          S.chg('ri', E.num(-1)),
        ]),
        S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.var('ixp')), E.var('a2')),
        S.lset('LCount', E.var('lso'), E.add(E.item('LCount', E.var('lso')), E.num(1))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('update|000000')), [
        ...L.payInto(E.var('obj'), 'dmo'), ...L.payInto(E.var('a1'), 'dmo2'),
        S.set('bk3', E.item('MapHead', E.var('dmo2'))),
        S.Until(E.lt(E.var('bk3'), E.num(1)), [
          ...bindSet(E.var('dmo'), E.item('BindName', E.var('bk3')), E.item('BindVal', E.var('bk3')), 'fd10'),
          S.set('bk3', E.item('BindNext', E.var('bk3'))),
        ]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('append|000000')), [
        ...L.payInto(E.var('obj'), 'lso'), ...heapPush(E.var('lso'), E.var('a1')),
      ]),
      S.If(E.eq(E.var('mname'), E.str('extend|000000')), [
        ...L.payInto(E.var('obj'), 'lso'), ...L.payInto(E.var('a1'), 'rso'),
        S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('rso')), [
          ...heapPush(E.var('lso'), heapGet(E.var('rso'), E.var('i'))), S.chg('i', E.num(1)),
        ]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('clear|00000')), [
        ...L.payInto(E.var('obj'), 'lso'), S.lset('LCount', E.var('lso'), E.num(0)),
      ]),
      S.If(E.eq(E.var('mname'), E.str('pop|000')), [
        ...L.payInto(E.var('obj'), 'lso'),
        S.set('ixp', E.sub(E.item('LCount', E.var('lso')), E.num(1))),
        S.If(E.eq(E.var('nargs'), E.num(2)), [...L.payInto(E.var('a1'), 'ixp')]),
        S.If(E.lt(E.var('ixp'), E.num(0)), [S.chg('ixp', E.item('LCount', E.var('lso')))]),
        S.If(E.or(E.lt(E.var('ixp'), E.num(0)), E.ge(E.var('ixp'), E.item('LCount', E.var('lso')))), [
          S.set('raised', E.num(1)),
          S.set('curEx', excVal('IndexError', 'pop from empty list')),
          ...unwind(),
        ], [
          S.set('res2', heapGet(E.var('lso'), E.add(E.var('ixp'), E.num(1)))),
          S.set('i', E.add(E.var('ixp'), E.num(1))),
          S.Repeat(E.sub(E.item('LCount', E.var('lso')), E.var('ixp')), [
            S.lset('LArr', E.add(E.item('LStart', E.var('lso')), E.sub(E.var('i'), E.num(1))), heapGet(E.var('lso'), E.add(E.var('i'), E.num(1)))),
            S.chg('i', E.num(1)),
          ]),
          S.lset('LCount', E.var('lso'), E.sub(E.item('LCount', E.var('lso')), E.num(1))),
        ]),
      ]),
      S.If(E.eq(E.var('mname'), E.str('join|0000')), [
        ...L.payInto(E.var('a1'), 'rso'),
        S.set('out', E.str('')), S.set('i', E.num(1)),
        S.Repeat(E.item('LCount', E.var('rso')), [
          S.If(E.gt(E.var('i'), E.num(1)), [S.set('out', E.join(E.var('out'), E.var('na')))]),
          ...tostr(heapGet(E.var('rso'), E.var('i')), 'ex'),
          S.set('out', E.join(E.var('out'), E.var('ex'))),
          S.chg('i', E.num(1)),
        ]),
        S.set('res2', E.join(E.str('S'), E.var('out'))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('strip|00000')), [
        S.set('cut', E.str(' ')),
        S.If(E.ge(E.var('nargs'), E.num(2)), [...L.payInto(E.var('a1'), 'cut')]),
        S.set('i', E.num(1)),
        S.Until(E.or(E.gt(E.var('i'), E.slen(E.var('na'))),
          E.not(E.contains(E.var('cut'), E.letter(E.var('i'), E.var('na'))))), [S.chg('i', E.num(1))]),
        S.set('jsl', E.slen(E.var('na'))),
        S.Until(E.or(E.lt(E.var('jsl'), E.var('i')),
          E.not(E.contains(E.var('cut'), E.letter(E.var('jsl'), E.var('na'))))), [S.chg('jsl', E.num(-1))]),
        ...substrInto(E.var('na'), E.var('i'), E.add(E.sub(E.var('jsl'), E.var('i')), E.num(1)), 'out'),
        S.set('res2', E.join(E.str('S'), E.var('out'))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('startswith|0000000000')), [...swBlock(true)]),
      S.If(E.eq(E.var('mname'), E.str('endswith|00000000')), [...swBlock(false)]),
      S.If(E.eq(E.var('mname'), E.str('find|0000')), [...findBlock(false)]),
      S.If(E.and(E.eq(E.var('mname'), E.str('count|00000')), E.eq(E.letter(E.num(1), E.var('obj')), E.str('S'))), [...findBlock(true)]),
      S.If(E.eq(E.var('mname'), E.str('get|000')), [...getBlock()]),
      S.If(E.eq(E.var('mname'), E.str('format|000000')), [
        S.set('out', E.str('')), S.set('i', E.num(1)), S.set('ai2', E.num(2)), S.set('skp', E.num(0)),
        S.set('farg', E.num(0)), S.set('fdig', E.str('')),
        S.Repeat(E.slen(E.var('na')), [
          S.set('cch', E.letter(E.var('i'), E.var('na'))),
          S.If(E.eq(E.var('cch'), E.str('{')), [
            S.set('skp', E.num(1)), S.set('fdig', E.str('')),
          ], [
            S.If(E.eq(E.var('cch'), E.str('}')), [
              S.set('skp', E.num(0)), S.set('farg', E.var('ai2')),
              S.If(E.gt(E.slen(E.var('fdig')), E.num(0)), [
                S.set('farg', E.add(E.num(2), E.var('fdig'))),
              ]),
              ...tostr(E.item('Stk', E.add(E.var('ubase'), E.var('farg'))), 'ex2'),
              S.set('out', E.join(E.var('out'), E.var('ex2'))),
              S.set('ai2', E.add(E.var('ai2'), E.num(1))),
            ], [
              S.If(E.eq(E.var('skp'), E.num(1)), [
                S.set('fdig', E.join(E.var('fdig'), E.var('cch'))),
              ], [
                S.set('out', E.join(E.var('out'), E.var('cch'))),
              ]),
            ]),
          ]),
          S.chg('i', E.num(1)),
        ]),
        S.set('res2', E.join(E.str('S'), E.var('out'))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('split|00000')), [
        ...L.payInto(E.var('obj'), 'sp1'),
        S.set('sp2', E.str(' ')),
        S.If(E.ge(E.var('nargs'), E.num(2)), [...L.payInto(E.var('a1'), 'sp2')]),
        ...heapNew('spl'), S.set('cur2', E.str('')), S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.slen(E.var('sp1'))), [
          ...substrInto(E.var('sp1'), E.var('i'), E.slen(E.var('sp2')), 'sb2'),
          ...strEq(E.var('sb2'), E.var('sp2'), 'se4'),
          S.If(E.eq(E.var('se4'), E.num(1)), [
            ...heapPush(E.var('spl'), E.join(E.str('S'), E.var('cur2'))),
            S.set('cur2', E.str('')),
            S.chg('i', E.slen(E.var('sp2'))),
          ], [
            S.set('cur2', E.join(E.var('cur2'), E.letter(E.var('i'), E.var('sp1')))),
            S.chg('i', E.num(1)),
          ]),
        ]),
        ...heapPush(E.var('spl'), E.join(E.str('S'), E.var('cur2'))),
        S.set('res2', E.join(E.str('L'), E.var('spl'))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('replace|0000000')), [
        ...L.payInto(E.var('obj'), 'rp1'), ...L.payInto(E.var('a1'), 'rp2'), ...L.payInto(E.var('a2'), 'rp3'),
        S.set('rout', E.str('')), S.set('i', E.num(1)),
        S.Until(E.gt(E.var('i'), E.slen(E.var('rp1'))), [
          ...substrInto(E.var('rp1'), E.var('i'), E.slen(E.var('rp2')), 'rs2'),
          ...strEq(E.var('rs2'), E.var('rp2'), 'se5'),
          S.If(E.eq(E.var('se5'), E.num(1)), [
            S.set('rout', E.join(E.var('rout'), E.var('rp3'))),
            S.chg('i', E.slen(E.var('rp2'))),
          ], [
            S.set('rout', E.join(E.var('rout'), E.letter(E.var('i'), E.var('rp1')))),
            S.chg('i', E.num(1)),
          ]),
        ]),
        S.set('res2', E.join(E.str('S'), E.var('rout'))),
      ]),
      S.If(E.eq(E.var('mname'), E.str('keys|0000')), [...kvBlock(false)]),
      S.If(E.eq(E.var('mname'), E.str('values|000000')), [...kvBlock(true)]),
      S.If(E.eq(E.var('obj'), E.str('S!json')), [
        S.If(E.eq(E.var('mname'), E.str('dumps|00000')), [
          S.set('jmode', E.num(1)),
          ...render(E.var('a1'), 'res2', false),
          S.set('jmode', E.num(0)),
          S.set('res2', E.join(E.str('S'), E.var('res2'))),
        ]),
        // json.loads is written (see jsonLoads below) but still misbehaves, so it fails loudly
        // instead of silently returning None.
        S.If(E.not(E.or(E.eq(E.var('mname'), E.str('dumps|00000')), E.eq(E.var('mname'), E.str('loads|00000')))), [
          S.set('res2', E.join(E.str('S!json has no method '), E.var('mname'))),
          ...L.failAt(E.str('AttributeError: json has no such method'), E.item('Iline', E.var('pc'))),
        ]),
        S.If(E.eq(E.var('mname'), E.str('loads|00000')), [
          ...jsonLoads(),
        ]),
      ]),
      S.If(E.eq(E.var('obj'), E.str('S!time')), [
        S.If(E.eq(E.var('mname'), E.str('time|0000')), [
          S.set('res2', E.join(E.str(''), E.add(E.num(946684800), E.mul(E.days2000(), E.num(86400))))),
        ]),
      ]),
      S.If(E.eq(E.var('obj'), E.str('S!math')), [
        S.If(E.eq(E.var('mname'), E.str('sqrt|0000')), [...floatRepr(E.math('sqrt', E.var('nb')), 'res2')]),
        S.If(E.eq(E.var('mname'), E.str('floor|00000')), [S.set('res2', E.join(E.str(''), E.math('floor', E.var('nb'))))]),
        S.If(E.eq(E.var('mname'), E.str('ceil|0000')), [S.set('res2', E.join(E.str(''), E.math('ceiling', E.var('nb'))))]),
        S.If(E.eq(E.var('mname'), E.str('fabs|0000')), [...floatRepr(E.math('abs', E.var('nb')), 'res2')]),
        S.If(E.eq(E.var('mname'), E.str('pow|000')), [
          ...L.payInto(E.var('a2'), 'nc'),
          ...floatRepr(E.math('e ^', E.mul(E.var('nc'), E.math('ln', E.var('nb')))), 'res2'),
        ]),
        S.If(E.eq(E.var('mname'), E.str('factorial|000000000')), [
          S.set('res2', E.num(1)), S.set('fc', E.num(2)),
          S.Until(E.gt(E.var('fc'), E.var('nb')), [
            S.set('res2', E.mul(E.var('res2'), E.var('fc'))), S.chg('fc', E.num(1)),
          ]),
        ]),
        S.If(E.eq(E.var('mname'), E.str('gcd|000')), [
          ...L.payInto(E.var('a2'), 'nc'),
          S.Until(E.eq(E.var('nc'), E.num(0)), [
            S.set('gq', E.mod(E.var('nb'), E.var('nc'))),
            S.set('nb', E.var('nc')), S.set('nc', E.var('gq')),
          ]),
          S.set('res2', E.join(E.str(''), E.var('nb'))),
        ]),
      ]),
      // ---- method call on a class instance (self is bound as the first argument) ----
      S.If(E.eq(E.letter(E.num(1), E.var('obj')), E.str('O')), [
        ...L.payInto(E.var('obj'), 'ino'),
        ...lookupIn(E.item('InMap', E.var('ino')), E.var('mname'), 'mfnd'),
        S.If(E.gt(E.slen(E.var('mfnd')), E.num(0)), [
          ...heapNew('argl'),
          S.set('i', E.num(2)),
          S.Until(E.gt(E.var('i'), E.var('nargs')), [
            ...heapPush(E.var('argl'), E.item('Stk', E.add(E.var('ubase'), E.var('i')))),
            S.chg('i', E.num(1)),
          ]),
          S.set('sp', E.var('ubase')),
          ...vpush(E.var('mfnd')), ...vpush(E.var('obj')),
          S.set('i', E.num(1)),
          S.Until(E.gt(E.var('i'), E.item('LCount', E.var('argl'))), [
            ...vpush(heapGet(E.var('argl'), E.var('i'))),
            S.chg('i', E.num(1)),
          ]),
          S.set('nargs', E.add(E.var('nargs'), E.num(1))),
          ...L.payInto(E.var('mfnd'), 'mfid'),
          ...callUser(E.var('mfid')),
          S.set('mcalled', E.num(1)),
        ], [
          ...L.failAt(E.join(E.str('AttributeError: '), E.var('mname')), E.item('Iline', E.var('pc'))),
        ]),
      ]),
      S.If(E.and(E.eq(E.var('mcalled'), E.num(0)), E.eq(E.var('raised'), E.num(0))), [
        S.chg('sp', E.mul(E.num(-1), E.var('nargs'))),
        ...vpush(E.var('res2')),
      ]),
    ];
  }
  function swBlock(fromStart) {
    return [
      S.set('res2', E.str('B0')),
      S.If(E.eq(E.var('mname'), E.str('startswith|0000000000')), [
        ...substrInto(E.var('na'), E.num(1), E.slen(E.var('nb')), 'sub'),
      ], [
        ...substrInto(E.var('na'), E.add(E.sub(E.slen(E.var('na')), E.slen(E.var('nb'))), E.num(1)), E.slen(E.var('nb')), 'sub'),
      ]),
      ...strEq(E.var('sub'), E.var('nb'), 'se9'),
      S.If(E.eq(E.var('se9'), E.num(1)), [S.set('res2', E.str('B1'))]),
    ];
  }
  function findBlock(countMode) {
    return [
      S.set('i', E.num(1)), S.set('cnt', E.num(0)), S.set('pos', E.num(-1)),
      S.set('lim', E.sub(E.slen(E.var('na')), E.slen(E.var('nb')))),
      S.Until(E.gt(E.var('i'), E.add(E.var('lim'), E.num(1))), [
        ...substrInto(E.var('na'), E.var('i'), E.slen(E.var('nb')), 'sub'),
        ...strEq(E.var('sub'), E.var('nb'), 'se8'),
        S.If(E.eq(E.var('se8'), E.num(1)), [
          S.chg('cnt', E.num(1)),
          S.If(E.eq(E.var('pos'), E.num(-1)), [S.set('pos', E.sub(E.var('i'), E.num(1)))]),
        ]),
        S.chg('i', E.num(1)),
      ]),
      S.set('res2', E.join(E.str(''), E.var('pos'))),
      S.If(E.eq(E.var('mname'), E.str('count|00000')), [S.set('res2', E.join(E.str(''), E.var('cnt')))]),
    ];
  }
  function getBlock() {
    return [
      ...L.payInto(E.var('obj'), 'dmo'),
      ...keyOf(E.var('a1'), 'kk'),
      ...lookupIn(E.var('dmo'), E.var('kk'), 'gv'),
      S.If(E.gt(E.slen(E.var('gv')), E.num(0)), [S.set('res2', E.var('gv'))]),
      S.If(E.and(E.eq(E.slen(E.var('gv')), E.num(0)), E.ge(E.var('nargs'), E.num(3))), [S.set('res2', E.var('a2'))]),
    ];
  }
  function kvBlock(vals) {
    const push = vals
      ? [...heapPush(E.var('tobj'), E.item('BindVal', E.var('bk2')))]
      : [
        // dict keys are stored as 'K' + text(key); hand back the text
        ...substrInto(E.item('BindName', E.var('bk2')), E.num(3),
          E.sub(E.slen(E.item('BindName', E.var('bk2'))), E.num(2)), 'kk2'),
        ...heapPush(E.var('tobj'), E.join(E.str('S'), E.var('kk2'))),
      ];
    return [
      ...L.payInto(E.var('obj'), 'dmo'), ...heapNew('tobj'),
      S.set('bk2', E.item('MapHead', E.var('dmo'))),
      S.Until(E.lt(E.var('bk2'), E.num(1)), [
        ...push,
        S.set('bk2', E.item('BindNext', E.var('bk2'))),
      ]),
      // the binding chain is LIFO; reverse it so the order is insertion order like CPython
      S.set('i', E.num(1)), S.set('jj2', E.item('LCount', E.var('tobj'))),
      S.Until(E.ge(E.var('i'), E.var('jj2')), [
        S.set('tv1', heapGet(E.var('tobj'), E.var('i'))),
        S.set('tv2', heapGet(E.var('tobj'), E.var('jj2'))),
        S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('i'), E.num(1))), E.var('tv2')),
        S.lset('LArr', E.add(E.item('LStart', E.var('tobj')), E.sub(E.var('jj2'), E.num(1))), E.var('tv1')),
        S.chg('i', E.num(1)), S.chg('jj2', E.num(-1)),
      ]),
      S.set('res2', E.join(E.str('L'), E.var('tobj'))),
    ];
  }

  function delvBlock() {
    const ia = () => E.item('Ia', E.var('pc'));
    return [
      S.set('dvm', E.item('FrEnv', E.var('frTop'))), S.set('dvn', ia()),
      S.set('dvh', E.item('MapHead', E.var('dvm'))),
      S.Until(E.lt(E.var('dvh'), E.num(1)), [
        S.If(E.eq(E.item('BindName', E.var('dvh')), E.var('dvn')), [
          S.If(E.eq(E.item('MapHead', E.var('dvm')), E.var('dvh')), [
            S.lset('MapHead', E.var('dvm'), E.item('BindNext', E.var('dvh'))),
          ], [
            S.lset('BindNext', E.var('dvp'), E.item('BindNext', E.var('dvh'))),
          ]),
          S.set('dvh', E.num(0)),
        ], [
          S.set('dvp', E.var('dvh')),
          S.set('dvh', E.item('BindNext', E.var('dvh'))),
        ]),
      ]),
    ];
  }

  // delete a list element / dict entry by index (used by `del a[i]`)
  function delidxBlock() {
    return [
      ...vpop('didx'), ...vpop('dobj'),
      S.If(E.eq(E.letter(E.num(1), E.var('dobj')), E.str('D')), [
        ...L.payInto(E.var('dobj'), 'dmo'),
        ...keyOf(E.var('didx'), 'dkv'),
        S.set('dvh', E.item('MapHead', E.var('dmo'))), S.set('dvp', E.num(0)),
        S.Until(E.lt(E.var('dvh'), E.num(1)), [
          S.If(E.eq(E.item('BindName', E.var('dvh')), E.var('dkv')), [
            S.If(E.eq(E.var('dvp'), E.num(0)), [
              S.lset('MapHead', E.var('dmo'), E.item('BindNext', E.var('dvh'))),
            ], [
              S.lset('BindNext', E.var('dvp'), E.item('BindNext', E.var('dvh'))),
            ]),
            S.set('dvh', E.num(0)),
          ], [
            S.set('dvp', E.var('dvh')),
            S.set('dvh', E.item('BindNext', E.var('dvh'))),
          ]),
        ]),
      ], [
        ...L.payInto(E.var('dobj'), 'dlo'),
        S.set('dn', E.item('LCount', E.var('dlo'))),
        ...L.payInto(E.var('didx'), 'dnx'),
        S.If(E.lt(E.var('dnx'), E.num(0)), [S.set('dnx', E.add(E.var('dnx'), E.var('dn')))]),
        S.If(E.or(E.lt(E.var('dnx'), E.num(0)), E.ge(E.var('dnx'), E.var('dn'))), [
          ...raiseBuiltin('IndexError'),
        ], [
          S.set('di', E.add(E.var('dnx'), E.num(2))),
          S.Until(E.gt(E.var('di'), E.item('LCount', E.var('dlo'))), [
            S.lset('LArr', E.add(E.item('LStart', E.var('dlo')), E.sub(E.var('di'), E.num(2))), heapGet(E.var('dlo'), E.var('di'))),
            S.chg('di', E.num(1)),
          ]),
          S.lset('LCount', E.var('dlo'), E.sub(E.item('LCount', E.var('dlo')), E.num(1))),
        ]),
      ]),
    ];
  }

  // Opcode dispatch is a tree over the first letter of the opcode.  Comparing full
  // opcode strings is the expensive part (Cast.compare falls back to lower-cased string
  // comparison), so the tree keeps the hot opcodes at 1-3 comparisons instead of ~20.
  const HOT_OP = ['PUSHV', 'PUSHK', 'BIN', 'STOREV', 'JMP', 'JZ', 'CALL', 'POP', 'ITER', 'NEXT',
    'SUBS', 'CMP', 'PUSHN', 'DUP', 'RET', 'UN', 'BUILD', 'LAMBDA', 'GETATTR', 'METH', 'DELV', 'NOP',
    'HALT', 'SUBSSET', 'PUSHK'];
  const HOT_LETTER = ['P', 'B', 'J', 'S', 'C', 'N', 'D', 'I', 'G', 'U', 'M', 'R', 'L', 'A', 'T', 'E', 'H'];
  function dispatchTree(op, items) {
    const groups = new Map();
    for (const [o, body] of items) {
      const L = o.charAt(0);
      if (!groups.has(L)) groups.set(L, []);
      groups.get(L).push([o, body]);
    }
    const rank = (o) => { const i = HOT_OP.indexOf(o); return i < 0 ? 999 : i; };
    const letters = [...groups.keys()].sort((a, b) => {
      const ia = HOT_LETTER.indexOf(a), ib = HOT_LETTER.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    const build = (i) => {
      if (i >= letters.length) return [];
      const L = letters[i];
      const inner = groups.get(L).slice().sort((a, b) => rank(a[0]) - rank(b[0]))
        .map(([o, body]) => S.If(E.eq(op(), E.str(o)), body));
      return [S.If(E.eq(E.letter(E.num(1), op()), E.str(L)), inner, build(i + 1))];
    };
    return build(0);
  }
  function dispatch() {
    const op = () => E.var('op');
    const ia = () => E.item('Ia', E.var('pc'));
    const items = [];
    const is = (o, body) => { items.push([o, body]); };
    return [
      is('HALT', [S.set('halted', E.num(1))]),
      is('NOP', []),
      is('PUSHK', [...vpush(E.item('Kval', ia()))]),
      is('PUSHN', [...vpush(ia())]),
      is('PUSHV', [
        ...lookup(ia()),
        S.If(E.eq(E.var('lkF'), E.num(1)), [...vpush(E.var('lkV'))], [
          ...plainName(ia(), 'nme'),
          ...raiseBuiltin('NameError', E.join(E.str("name '"), E.join(E.var('nme'), E.str("' is not defined")))),
        ]),
      ]),
      is('POP', [S.chg('sp', E.num(-1))]),
      is('DUP', [S.set('vd', E.item('Stk', E.var('sp'))), ...vpush(E.var('vd'))]),
      is('STOREV', [
        ...vpop('vb'),
        S.set('isg', E.num(0)),
        S.If(E.gt(E.item('FrGlob', E.var('frTop')), E.num(0)), [
          S.set('i', E.num(1)),
          S.Until(E.gt(E.var('i'), E.item('LCount', E.item('FrGlob', E.var('frTop')))), [
            S.If(E.eq(heapGet(E.item('FrGlob', E.var('frTop')), E.var('i')), ia()), [S.set('isg', E.num(1))]),
            S.chg('i', E.num(1)),
          ]),
        ]),

        // A comprehension owns its own map (LCBEGIN): names assigned inside it -- the loop
        // variable above all -- must not leak into the surrounding scope, not even at top
        // level where every other assignment goes straight to the global map.
        S.set('stcmp', E.num(0)),
        S.If(E.eq(E.item('MapKind', E.item('FrEnv', E.var('frTop'))), E.str('L')), [S.set('stcmp', E.num(1))]),
        S.If(E.or(E.eq(E.var('isg'), E.num(1)),
          E.and(E.eq(E.var('frTop'), E.num(1)), E.eq(E.var('stcmp'), E.num(0)))), [
          ...bindSet(E.var('GlobMap'), ia(), E.var('vb'), 'fd'),
        ], [
          // a nonlocal declaration in this frame routes the assignment to the
          // enclosing function's binding instead of creating a local
          S.set('nlm', E.num(0)), S.set('nli', E.num(1)),
          S.Until(E.gt(E.var('nli'), E.len('NlFr')), [
            S.If(E.and(E.eq(E.item('NlFr', E.var('nli')), E.var('frTop')), E.eq(E.item('NlName', E.var('nli')), ia())), [
              S.set('nlm', E.num(1)),
            ]),
            S.chg('nli', E.num(1)),
          ]),
          S.If(E.eq(E.var('nlm'), E.num(1)), [
            S.set('nlc', E.item('MapParent', E.item('FrEnv', E.var('frTop')))), S.set('nlf', E.num(0)),
            S.Until(E.or(E.lt(E.var('nlc'), E.num(1)), E.eq(E.var('nlf'), E.num(1))), [
              S.set('bnb', E.item('MapHead', E.var('nlc'))), S.set('bnm', ia()), S.set('bvl', E.var('vb')),
              S.Until(E.or(E.eq(E.var('bnb'), E.num(0)), E.eq(E.var('nlf'), E.num(1))), [
                S.If(E.eq(E.item('BindName', E.var('bnb')), E.var('bnm')), [
                  S.lset('BindVal', E.var('bnb'), E.var('bvl')), S.set('nlf', E.num(1)),
                ]),
                S.set('bnb', E.item('BindNext', E.var('bnb'))),
              ]),
              S.If(E.eq(E.var('nlf'), E.num(0)), [S.set('nlc', E.item('MapParent', E.var('nlc')))]),
            ]),
            S.If(E.eq(E.var('nlf'), E.num(0)), [
              ...L.failAt(E.str('NameError: nonlocal binding not found'), E.item('Iline', E.var('pc'))),
            ]),
          ], [
            ...bindSet(E.item('FrEnv', E.var('frTop')), ia(), E.var('vb'), 'fd'),
          ]),
        ]),
      ]),
      is('YIELD', [yieldBlock()]),
      is('NCHK', [nchkBlock()]),
      is('DELV', [delvBlock()]),
      // A comprehension gets a scope of its own: LCBEGIN stacks a fresh binding map on
      // top of the frame's map, so the loop variable is bound there instead of leaking
      // into the enclosing scope, and LCEND pops it again.  lookup() already walks
      // MapParent, so names from the enclosing scope stay readable inside the loop.
      is('LCBEGIN', [
        S.chg('mTop', E.num(1)),
        ...L.setAt('MapHead', E.var('mTop'), E.num(0)),
        ...L.setAt('MapParent', E.var('mTop'), E.item('FrEnv', E.var('frTop'))),
        ...L.setAt('MapKind', E.var('mTop'), E.str('L')),
        S.lset('FrEnv', E.var('frTop'), E.var('mTop')),
      ]),
      is('LCEND', [
        S.set('lcm', E.item('FrEnv', E.var('frTop'))),
        S.If(E.ge(E.var('lcm'), E.num(1)), [
          S.lset('FrEnv', E.var('frTop'), E.item('MapParent', E.var('lcm'))),
          S.lset('MapHead', E.var('lcm'), E.num(0)),
        ]),
      ]),
      is('DELIDX', [delidxBlock()]),
      is('GLOBAL', [
        S.set('gspec', E.item('Kval', ia())),
        S.If(E.le(E.item('FrGlob', E.var('frTop')), E.num(0)), [
          ...heapNew('tobg'),
          S.lset('FrGlob', E.var('frTop'), E.var('tobg')),
        ]),
        S.set('tobg', E.item('FrGlob', E.var('frTop'))),
        S.set('i', E.num(1)), S.set('acc', E.str('')),
        S.Until(E.gt(E.var('i'), E.slen(E.var('gspec'))), [
          S.If(E.eq(E.letter(E.var('i'), E.var('gspec')), E.str(',')), [
            S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [...heapPush(E.var('tobg'), E.var('acc'))]),
            S.set('acc', E.str('')),
          ], [
            S.set('acc', E.join(E.var('acc'), E.letter(E.var('i'), E.var('gspec')))),
          ]),
          S.chg('i', E.num(1)),
        ]),
        S.If(E.gt(E.slen(E.var('acc')), E.num(0)), [...heapPush(E.var('tobg'), E.var('acc'))]),
      ]),
      is('NONLOCAL', [nonlocalBlock()]),
      is('JMP', [S.set('pc', E.sub(ia(), E.num(1)))]),
      is('JZ', [
        ...vpop('vb'), ...truthOf(E.var('vb'), 'tb'),
        S.If(E.eq(E.var('tb'), E.num(0)), [S.set('pc', E.sub(ia(), E.num(1)))]),
      ]),
      is('BIN', [binBlock()]),
      is('UN', [unBlock()]),
      is('CMP', [cmpBlock()]),
      is('CMPK', [cmpkBlock()]),
      // chain jump: test the comparison flag that sits UNDER the shared operand; on the
      // true path drop the flag and keep the operand, on the false path jump as-is
      is('CKJZ', [
        S.set('vb', E.item('Stk', E.sub(E.var('sp'), E.num(1)))),
        ...truthOf(E.var('vb'), 'tb'),
        S.If(E.eq(E.var('tb'), E.num(0)), [
          S.set('pc', E.sub(ia(), E.num(1))),
        ], [
          S.lset('Stk', E.sub(E.var('sp'), E.num(1)), E.item('Stk', E.var('sp'))),
          S.chg('sp', E.num(-1)),
        ]),
      ]),
      is('BUILD', [buildBlock()]),
      is('SUBS', [subsBlock()]),
      is('SUBSSET', [subsSetBlock()]),
      is('GETATTR', [getattrBlock()]),
      is('SETATTR', [setattrBlock()]),
      is('ITER', [iterBlock()]),
      is('NEXT', [nextBlock()]),
      is('CALL', [callBlock()]),
      is('METH', [methBlock()]),
      is('DEF', [defBlock('')]),
      is('GDEF', [defBlock('g')]),
      is('LAMBDA', [defBlock()]),
      is('CLASS', [classBlock()]),
      is('RET', [retBlock()]),
      is('RETN', [retnBlock()]),
      is('ASRT', [asrtBlock()]),
      is('TRY', [
        S.chg('hdTop', E.num(1)),
        ...L.setAt('HdFr', E.var('hdTop'), E.var('frTop')),
        ...L.setAt('HdSt', E.var('hdTop'), E.var('sp')),
        ...L.setAt('HdPc', E.var('hdTop'), ia()),
      ]),
      is('ENDTRY', [S.chg('hdTop', E.num(-1))]),
      is('RAISE', [raiseBlock()]),
      is('RAISEN', [raiseReBlock()]),
      is('XCLR', [S.set('actEx', E.str(''))]),
      is('XSET', [...vpop('actEx')]),
      is('RERAISE', [reraiseBlock()]),
      is('ISINST', [isinstBlock()]),
      is('IMPORT', [
        S.set('mnm', E.item('Kval', ia())), S.set('mcut', E.var('mnm')), S.set('mj', E.num(1)),
        S.Until(E.or(E.gt(E.var('mj'), E.slen(E.var('mnm'))),
          E.eq(E.letter(E.var('mj'), E.var('mnm')), E.str('|'))), [
          S.chg('mj', E.num(1)),
        ]),
        ...substrInto(E.var('mnm'), E.num(1), E.sub(E.var('mj'), E.num(1)), 'mcut'),
        ...bindSet(E.item('FrEnv', E.var('frTop')), E.var('mnm'),
          E.join(E.str('S!'), E.var('mcut')), 'fd8'),
      ]),
      is('IMPORTFROM', []),
      ...dispatchTree(op, items),
    ];
  }

  return [
    // STEP support: `mode`=1 means run one source line and park. `stepgo`=1 marks a
    // resume, in which case pc / stack / env are already live and must be kept.
    S.If(E.eq(E.var('stepgo'), E.num(1)), [], [S.set('pc', E.num(1))]),
    S.set('stepgo', E.num(0)),
    // the source line we start on; stepping stops as soon as Iline moves off it
    S.set('stepln', E.item('Iline', E.var('pc'))),
    S.set('halted', E.num(0)), S.set('ticks', E.num(0)), S.set('t0', E.days2000()), S.set('nchk', E.num(0)), S.set('dbg', E.num(0)), S.If(E.eq(E.item('Code', E.num(1)), E.str('#!trace')), [S.set('dbg', E.num(2))]),
    S.Until(E.or(E.eq(E.var('halted'), E.num(1)), E.not(E.eq(E.var('err'), E.str('')))), [
      // single-step: park before executing an instruction belonging to a new source line
      S.If(E.and(E.eq(E.var('mode'), E.num(1)),
        E.and(E.gt(E.var('ticks'), E.num(0)),
          E.and(E.gt(E.item('Iline', E.var('pc')), E.num(0)),
            E.not(E.eq(E.item('Iline', E.var('pc')), E.var('stepln')))))), [
        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)),
        S.set('halted', E.num(1)), S.set('stepgo', E.num(1)),
        S.set('selected', E.item('Iline', E.var('pc'))),
        S.set('status', E.join(E.str('Step / line '), E.item('Iline', E.var('pc')))),
      ]),
      S.If(E.and(E.gt(E.var('bp'), E.num(0)), E.eq(E.var('pc'), E.var('bp'))), [
        S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.set('halted', E.num(1)), S.set('bphit', E.num(1)),
        S.set('status', E.join(E.str('Breakpoint at '), E.var('pc'))),
      ]),
      // A halt decided above (step boundary or breakpoint) must not execute the
      // instruction it parked on: `repeat until` re-tests only at the top of the
      // loop, so without this guard the op would run, pc would stay put (the
      // increment below is halted-guarded), and resuming would run it a second
      // time -- duplicated output on every step/continue.
      S.If(E.eq(E.var('halted'), E.num(0)), [
        S.set('op', E.item('Iop', E.var('pc'))),
        S.If(E.eq(E.var('dbg'), E.num(2)), [
          ...L.outLine(E.join(E.var('pc'), E.join(E.str(' '), E.join(E.var('op'), E.join(E.str(' sp='), E.join(E.var('sp'), E.join(E.str(' fr='), E.join(E.var('frTop'), E.join(E.str(' st='), E.var('sp')))))))))),
        ]),
        ...dispatch(),
        // on an error pc holds the source line reported by failAt, so do not advance it
        S.If(E.and(E.eq(E.var('halted'), E.num(0)), E.eq(E.var('err'), E.str(''))), [S.chg('pc', E.num(1))]),
        S.chg('ticks', E.num(1)),
      ]),
      S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.gt(E.var('ticks'), E.var('nchk'))), [S.If(E.or(E.eq(E.var('speed'), E.num(0)), E.ge(E.mul(E.sub(E.days2000(), E.var('t0')), E.num(86400000)), E.num(16))), [
        S.set('t0', E.days2000()), S.set('steps', E.var('ticks')), S.set('dirty', E.num(1)), S.Wait(E.num(0)),]), S.set('nchk', E.add(E.var('ticks'), E.num(2000))),
      ]),
    ]),
    S.set('steps', E.var('ticks')),
  ];
}

function initBody() {
  return [
    S.ldelall('NlFr'), S.ldelall('NlName'),
    S.set('bTop', E.num(0)), S.set('fTop', E.num(0)), S.set('cTop', E.num(0)), S.set('iTop', E.num(0)),
    S.set('sp', E.num(0)), S.set('frTop', E.num(0)), S.set('hdTop', E.num(0)), S.set('ticks', E.num(0)),
    S.set('gTop', E.num(0)), S.set('gstop', E.num(0)), S.set('actEx', E.str('')),
    S.set('GlobMap', E.num(1)), S.set('mTop', E.num(1)),
    ...L.setAt('MapHead', E.num(1), E.num(0)),
    ...L.setAt('MapParent', E.num(1), E.num(0)),
    ...L.setAt('MapKind', E.num(1), E.str('M')),
    S.set('frTop', E.num(1)),
...EXCNAMES.flatMap((nm, ni) => [
      S.chg('cTop', E.num(1)),
      ...L.setAt('ClName', E.var('cTop'), E.str(nm)),
      // every built-in exception derives from Exception (index 1)
      ...L.setAt('ClBase', E.var('cTop'), E.num(ni === 0 ? 0 : 1)),
      S.chg('mTop', E.num(1)), S.set('xcm', E.var('mTop')),
      ...L.setAt('MapHead', E.var('xcm'), E.num(0)),
      ...L.setAt('MapParent', E.var('xcm'), E.var('GlobMap')),
      ...L.setAt('MapKind', E.var('xcm'), E.str('C')),
      ...L.setAt('ClMap', E.var('cTop'), E.var('xcm')),
      S.chg('bTop', E.num(1)),
      ...L.setAt('BindName', E.var('bTop'), E.str(key(nm))),
      ...L.setAt('BindVal', E.var('bTop'), E.join(E.str('C'), E.var('cTop'))),
      ...L.setAt('BindNext', E.var('bTop'), E.item('MapHead', E.var('GlobMap'))),
      ...L.setAt('MapHead', E.var('GlobMap'), E.var('bTop')),
    ]),
    // Every binding is prepended, so binding the builtins AFTER the exception classes leaves
    // print / len / range / ... at the head of the global chain and keeps the linear lookup
    // each global name reference performs as short as possible.
    ...BUILTINS.flatMap((b) => {
      const k = key(b);
      return [
        S.chg('fTop', E.num(1)),
        ...L.setAt('FnKind', E.var('fTop'), E.str('b')),
        ...L.setAt('FnName', E.var('fTop'), E.str(k)),
        ...L.setAt('FnParam', E.var('fTop'), E.str('')),
        ...L.setAt('FnBody', E.var('fTop'), E.num(0)),
        ...L.setAt('FnEnv', E.var('fTop'), E.num(0)),
        ...L.setAt('FnArity', E.var('fTop'), E.num(0)),
        // setAt only grows a list by one, so FnFlags must already cover every builtin
        ...L.setAt('FnFlags', E.var('fTop'), E.str('')),
        S.chg('bTop', E.num(1)),
        ...L.setAt('BindName', E.var('bTop'), E.str(k)),
        ...L.setAt('BindVal', E.var('bTop'), E.join(E.str('F'), E.var('fTop'))),
        ...L.setAt('BindNext', E.var('bTop'), E.item('MapHead', E.num(1))),
        ...L.setAt('MapHead', E.num(1), E.var('bTop')),
      ];
    }),
    ...L.setAt('FrKind', E.num(1), E.str('M')),
    ...L.setAt('FrRet', E.num(1), E.num(0)),
    ...L.setAt('FrEnv', E.num(1), E.num(1)),
    ...L.setAt('FrBase', E.num(1), E.num(0)),
    ...L.setAt('FrAux', E.num(1), E.num(0)),
    ...L.setAt('FrGlob', E.num(1), E.num(0)),
  ];
}

function setup(em) {
  em.defineProc('Interpreter', 'init_vm', [], () => initBody(), true);
  // NOT warp: warp threads ignore the explicit Wait 0 yields, which would defeat the time slicing.
  em.defineProc('Interpreter', 'vm_run', [], () => build(), false);
}
module.exports = { build: build, setup: setup, key: key, BUILTINS: BUILTINS, EXCNAMES: EXCNAMES };
